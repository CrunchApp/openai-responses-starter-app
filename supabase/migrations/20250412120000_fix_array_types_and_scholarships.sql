-- Fix store_recommendation function to handle scholarships correctly 
-- AND fix the data type conversions for requirements and highlights
CREATE OR REPLACE FUNCTION public.store_recommendation(
  p_user_id UUID,
  p_vector_store_id TEXT,
  p_recommendation JSONB,
  p_pathway_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_program_id UUID;
  v_recommendation_id UUID;
  v_match_score INTEGER;
  v_match_rationale JSONB;
BEGIN
  -- Validate required parameters
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User ID is required';
  END IF;

  -- Extract and validate match_score
  v_match_score := (p_recommendation->>'match_score')::INTEGER;
  
  -- If match_score is null, set a default value of 70
  IF v_match_score IS NULL THEN
    v_match_score := 70;
    RAISE NOTICE 'match_score was null, defaulting to 70';
  END IF;
  
  -- Extract match_rationale with a default if null
  v_match_rationale := (p_recommendation->'match_rationale')::JSONB;
  IF v_match_rationale IS NULL OR v_match_rationale = 'null'::JSONB THEN
    v_match_rationale := '{
      "careerAlignment": 70,
      "budgetFit": 70,
      "locationMatch": 70,
      "academicFit": 70
    }'::JSONB;
  END IF;

  -- First, store program details in the programs table
  -- Note: removed scholarships column which doesn't exist in the schema
  -- IMPORTANT: Fixed the data types for requirements and highlights
  INSERT INTO programs (
    name,
    institution,
    degree_type,
    field_of_study,
    description,
    cost_per_year,
    duration,
    location,
    start_date,
    application_deadline,
    requirements,
    highlights,
    page_link
  ) VALUES (
    p_recommendation->>'name',
    p_recommendation->>'institution',
    p_recommendation->>'degreeType',
    p_recommendation->>'fieldOfStudy',
    p_recommendation->>'description',
    (p_recommendation->>'costPerYear')::NUMERIC,
    (p_recommendation->>'duration')::INTEGER,
    p_recommendation->>'location',
    p_recommendation->>'startDate',
    p_recommendation->>'applicationDeadline',
    -- Convert JSONB array to text[] using jsonb_array_elements_text
    array(select jsonb_array_elements_text(p_recommendation->'requirements')),
    array(select jsonb_array_elements_text(p_recommendation->'highlights')),
    p_recommendation->>'pageLink'
  )
  RETURNING id INTO v_program_id;

  -- Insert scholarships if present
  IF p_recommendation ? 'scholarships' AND jsonb_array_length(p_recommendation->'scholarships') > 0 THEN
    INSERT INTO program_scholarships (program_id, name, amount, eligibility)
    SELECT 
      v_program_id,
      s->>'name',
      s->>'amount',
      s->>'eligibility'
    FROM jsonb_array_elements(p_recommendation->'scholarships') s;
  END IF;

  -- Then, store the recommendation in the recommendations table
  INSERT INTO recommendations (
    user_id,
    program_id,
    match_score,
    match_rationale,
    vector_store_id,
    pathway_id,
    is_favorite
  ) VALUES (
    p_user_id,
    v_program_id,
    v_match_score,  -- Use validated match_score
    v_match_rationale,  -- Use validated match_rationale
    p_vector_store_id,
    p_pathway_id,
    (p_recommendation->>'is_favorite')::BOOLEAN
  )
  RETURNING id INTO v_recommendation_id;

  RETURN v_recommendation_id;
END;
$$;

-- Add a function to store multiple scholarships for programs
CREATE OR REPLACE FUNCTION public.store_program_scholarships_batch(
  p_scholarships JSONB[]
)
RETURNS TABLE(
  success BOOLEAN,
  saved_count INTEGER,
  error TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_scholarship JSONB;
  v_count INTEGER := 0;
  v_error TEXT;
BEGIN
  -- Process each scholarship
  BEGIN
    FOREACH v_scholarship IN ARRAY p_scholarships
    LOOP
      -- Insert scholarship
      INSERT INTO program_scholarships (
        program_id,
        name,
        amount,
        eligibility
      ) VALUES (
        (v_scholarship->>'program_id')::UUID,
        v_scholarship->>'name',
        v_scholarship->>'amount',
        v_scholarship->>'eligibility'
      );
      
      -- Increment counter
      v_count := v_count + 1;
    END LOOP;
    
    -- Return success
    RETURN QUERY SELECT TRUE, v_count, NULL::TEXT;
  EXCEPTION
    WHEN OTHERS THEN
      v_error := SQLERRM;
      -- Return partial success if some were saved
      IF v_count > 0 THEN
        RETURN QUERY SELECT TRUE, v_count, 'Partial success: ' || v_error;
      ELSE
        RETURN QUERY SELECT FALSE, 0, v_error;
      END IF;
  END;
END;
$$;

-- Modify store_programs_batch to return saved program IDs
CREATE OR REPLACE FUNCTION public.store_programs_batch(
  p_user_id UUID,
  p_pathway_id UUID,
  p_vector_store_id TEXT,
  p_recommendations JSONB[]
)
RETURNS TABLE(
  success BOOLEAN,
  saved_count INTEGER,
  saved_program_ids UUID[],
  error TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_recommendation JSONB;
  v_recommendation_id UUID;
  v_program_ids UUID[] := '{}';
  v_count INTEGER := 0;
  v_error TEXT;
BEGIN
  -- Validate input parameters
  IF p_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 0, NULL::UUID[], 'User ID is required';
    RETURN;
  END IF;

  IF p_pathway_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 0, NULL::UUID[], 'Pathway ID is required';
    RETURN;
  END IF;
  
  -- Verify that the pathway belongs to the user
  IF NOT EXISTS (
    SELECT 1 FROM public.education_pathways 
    WHERE id = p_pathway_id AND user_id = p_user_id
  ) THEN
    RETURN QUERY SELECT FALSE, 0, NULL::UUID[], 'Pathway not found or does not belong to the user';
    RETURN;
  END IF;

  -- Process each recommendation
  BEGIN
    FOREACH v_recommendation IN ARRAY p_recommendations
    LOOP
      -- Call store_recommendation for each one
      v_recommendation_id := public.store_recommendation(
        p_user_id, 
        p_vector_store_id, 
        v_recommendation,
        p_pathway_id
      );
      
      -- If successful, increment counter and store program_id
      IF v_recommendation_id IS NOT NULL THEN
        v_count := v_count + 1;
        
        -- Get program_id for this recommendation and add to array
        DECLARE
          v_program_id UUID;
        BEGIN
          SELECT program_id INTO v_program_id 
          FROM recommendations 
          WHERE id = v_recommendation_id;
          
          IF v_program_id IS NOT NULL THEN
            v_program_ids := array_append(v_program_ids, v_program_id);
          END IF;
        END;
      END IF;
    END LOOP;
    
    -- Mark the pathway as explored if we successfully saved at least one recommendation
    IF v_count > 0 THEN
      PERFORM public.update_pathway_explored_status(p_pathway_id, TRUE);
    END IF;
    
    -- Return success with program IDs
    RETURN QUERY SELECT TRUE, v_count, v_program_ids, NULL::TEXT;
  EXCEPTION
    WHEN OTHERS THEN
      v_error := SQLERRM;
      -- Return partial success if some were saved
      IF v_count > 0 THEN
        RETURN QUERY SELECT TRUE, v_count, v_program_ids, 'Partial success: ' || v_error;
      ELSE
        RETURN QUERY SELECT FALSE, 0, NULL::UUID[], v_error;
      END IF;
  END;
END;
$$; 