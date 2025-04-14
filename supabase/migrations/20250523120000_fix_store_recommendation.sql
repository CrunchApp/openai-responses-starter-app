-- Fix store_recommendation function to return UUID again for compatibility with existing code
-- while still providing better error handling internally

CREATE OR REPLACE FUNCTION public.store_recommendation(
  p_user_id UUID,
  p_vector_store_id TEXT,
  p_recommendation JSONB,
  p_pathway_id UUID DEFAULT NULL::UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_program_id UUID;
  v_recommendation_id UUID;
  v_match_score INTEGER;
  v_match_rationale JSONB;
  v_duplicate_program BOOLEAN := FALSE;
  v_program_name TEXT;
  v_program_institution TEXT;
  v_error TEXT;
BEGIN
  -- Validate required parameters
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User ID is required';
  END IF;

  -- Extract and store program name and institution for duplicate checking
  v_program_name := p_recommendation->>'name';
  v_program_institution := p_recommendation->>'institution';
  
  -- Check if required fields are present
  IF v_program_name IS NULL OR v_program_name = '' THEN
    RAISE EXCEPTION 'Program name is required';
  END IF;
  
  IF v_program_institution IS NULL OR v_program_institution = '' THEN
    RAISE EXCEPTION 'Institution name is required';
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
    v_match_rationale := '{"careerAlignment": 70, "budgetFit": 70, "locationMatch": 70, "academicFit": 70}'::JSONB;
  END IF;

  -- Check if program already exists by name and institution
  BEGIN
    SELECT id, TRUE INTO v_program_id, v_duplicate_program
    FROM programs
    WHERE name = v_program_name AND institution = v_program_institution
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    -- In case of error in lookup, proceed with creation
    v_program_id := NULL;
    v_duplicate_program := FALSE;
  END;

  -- If program doesn't exist, create it
  IF v_program_id IS NULL THEN
    BEGIN
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
        v_program_name,
        v_program_institution,
        p_recommendation->>'degreeType',
        p_recommendation->>'fieldOfStudy',
        p_recommendation->>'description',
        (p_recommendation->>'costPerYear')::NUMERIC,
        (p_recommendation->>'duration')::INTEGER,
        p_recommendation->>'location',
        p_recommendation->>'startDate',
        p_recommendation->>'applicationDeadline',
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
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'Error creating program: %', SQLERRM;
    END;
  END IF;

  -- Now check if a recommendation for this program and user already exists
  BEGIN
    -- Delete existing recommendation for this user and program if exists
    DELETE FROM recommendations 
    WHERE user_id = p_user_id AND program_id = v_program_id AND pathway_id IS NOT DISTINCT FROM p_pathway_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Error cleaning up existing recommendation: %', SQLERRM;
  END;

  -- Insert the recommendation
  BEGIN
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
      v_match_score,
      v_match_rationale,
      p_vector_store_id,
      p_pathway_id,
      (p_recommendation->>'is_favorite')::BOOLEAN
    )
    RETURNING id INTO v_recommendation_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Error creating recommendation: %', SQLERRM;
  END;

  -- Log if this was a duplicate program
  IF v_duplicate_program THEN
    RAISE NOTICE 'Used existing program with same name and institution: %', v_program_name;
  END IF;

  RETURN v_recommendation_id;
END;
$$; 