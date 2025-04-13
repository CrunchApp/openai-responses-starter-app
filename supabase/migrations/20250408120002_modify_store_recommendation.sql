-- Modify store_recommendation function to include pathway_id
CREATE OR REPLACE FUNCTION public.store_recommendation(
  p_user_id UUID, 
  p_vector_store_id TEXT, 
  p_recommendation JSONB,
  p_pathway_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_program_id UUID;
  v_recommendation_id UUID;
  v_exists BOOLEAN;
BEGIN
  -- Check if program_id is provided and valid UUID format
  IF p_recommendation ? 'program_id' AND p_recommendation->>'program_id' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    -- First check if program already exists by ID
    SELECT EXISTS (SELECT 1 FROM public.programs WHERE id = (p_recommendation->>'program_id')::UUID) INTO v_exists;
    
    IF v_exists THEN
      v_program_id := (p_recommendation->>'program_id')::UUID;
    END IF;
  END IF;
  
  -- If we don't have a valid program ID yet, check by name and institution
  IF v_program_id IS NULL THEN
    SELECT id INTO v_program_id 
    FROM public.programs 
    WHERE name = p_recommendation->>'name' 
    AND institution = p_recommendation->>'institution'
    LIMIT 1;
    
    -- If program still doesn't exist, insert it using SECURITY DEFINER
    IF v_program_id IS NULL THEN
      INSERT INTO public.programs (
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
        ARRAY(SELECT jsonb_array_elements_text(p_recommendation->'requirements')),
        ARRAY(SELECT jsonb_array_elements_text(p_recommendation->'highlights')),
        p_recommendation->>'pageLink'
      )
      RETURNING id INTO v_program_id;
      
      -- Insert scholarships if present
      IF p_recommendation ? 'scholarships' AND jsonb_array_length(p_recommendation->'scholarships') > 0 THEN
        INSERT INTO public.program_scholarships (program_id, name, amount, eligibility)
        SELECT 
          v_program_id,
          s->>'name',
          s->>'amount',
          s->>'eligibility'
        FROM jsonb_array_elements(p_recommendation->'scholarships') s;
      END IF;
    END IF;
  END IF;
  
  -- Delete existing recommendation for this user and program if exists
  DELETE FROM public.recommendations 
  WHERE user_id = p_user_id AND program_id = v_program_id;
  
  -- Insert recommendation with pathway_id if provided
  INSERT INTO public.recommendations (
    user_id,
    program_id,
    match_score,
    is_favorite,
    match_rationale,
    vector_store_id,
    pathway_id
  ) VALUES (
    p_user_id,
    v_program_id,
    (p_recommendation->>'match_score')::INTEGER,
    COALESCE((p_recommendation->>'is_favorite')::BOOLEAN, FALSE),
    p_recommendation->'match_rationale',
    p_vector_store_id,
    p_pathway_id
  )
  RETURNING id INTO v_recommendation_id;
  
  RETURN v_recommendation_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error in store_recommendation: %', SQLERRM;
END;
$$; 