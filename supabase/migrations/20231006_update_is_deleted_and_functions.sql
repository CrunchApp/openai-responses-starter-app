-- Migration: set default false on is_deleted and update store_recommendation function to respect p_recommendation->>'is_deleted'
BEGIN;

-- 1. Ensure new recommendations default to not deleted
ALTER TABLE public.recommendations
  ALTER COLUMN is_deleted SET DEFAULT FALSE;

-- 2. Update existing rows where is_deleted is NULL
UPDATE public.recommendations
  SET is_deleted = FALSE
  WHERE is_deleted IS NULL;

-- 3. Replace store_recommendation to insert is_deleted flag
CREATE OR REPLACE FUNCTION public.store_recommendation(
  p_user_id uuid,
  p_vector_store_id text,
  p_recommendation jsonb,
  p_pathway_id uuid DEFAULT NULL::uuid
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_program_id UUID;
  v_recommendation_id UUID;
  v_match_score INTEGER;
  v_match_rationale JSONB;
  v_duplicate_program BOOLEAN := FALSE;
  v_program_name TEXT;
  v_program_institution TEXT;
  v_cost_per_year NUMERIC;
  v_duration NUMERIC;
BEGIN
  -- Validate user
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User ID is required';
  END IF;

  -- Extract program identifiers
  v_program_name := p_recommendation->>'name';
  v_program_institution := p_recommendation->>'institution';

  IF v_program_name IS NULL OR v_program_name = '' THEN
    RAISE EXCEPTION 'Program name is required';
  END IF;
  IF v_program_institution IS NULL OR v_program_institution = '' THEN
    RAISE EXCEPTION 'Institution name is required';
  END IF;

  -- Parse match_score
  BEGIN
    v_match_score := (p_recommendation->>'match_score')::INTEGER;
  EXCEPTION WHEN OTHERS THEN
    v_match_score := 70;
    RAISE NOTICE 'Could not parse match_score, defaulting to 70';
  END;
  IF v_match_score IS NULL THEN
    v_match_score := 70;
    RAISE NOTICE 'match_score was null, defaulting to 70';
  END IF;

  -- Parse match_rationale
  v_match_rationale := (p_recommendation->'match_rationale')::JSONB;
  IF v_match_rationale IS NULL OR v_match_rationale = 'null'::JSONB THEN
    v_match_rationale := '{"careerAlignment": 70, "budgetFit": 70, "locationMatch": 70, "academicFit": 70}'::JSONB;
  END IF;

  -- Parse cost_per_year
  BEGIN
    v_cost_per_year := (p_recommendation->>'costPerYear')::NUMERIC;
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      v_cost_per_year := regexp_replace(p_recommendation->>'costPerYear', '[^0-9.]', '', 'g')::NUMERIC;
    EXCEPTION WHEN OTHERS THEN
      v_cost_per_year := NULL;
      RAISE NOTICE 'Could not parse costPerYear, setting to NULL';
    END;
  END;

  -- Parse duration
  BEGIN
    v_duration := (p_recommendation->>'duration')::NUMERIC;
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      v_duration := regexp_replace(p_recommendation->>'duration', '[^0-9.]', '', 'g')::NUMERIC;
    EXCEPTION WHEN OTHERS THEN
      v_duration := NULL;
      RAISE NOTICE 'Could not parse duration, setting to NULL';
    END;
  END;

  -- Lookup or create program
  BEGIN
    SELECT id, TRUE INTO v_program_id, v_duplicate_program
    FROM programs
    WHERE name = v_program_name AND institution = v_program_institution
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_program_id := NULL;
    v_duplicate_program := FALSE;
  END;

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
        COALESCE(p_recommendation->>'degreeType', 'Not Specified'),
        COALESCE(p_recommendation->>'fieldOfStudy', 'Not Specified'),
        COALESCE(p_recommendation->>'description', 'No description available'),
        v_cost_per_year,
        v_duration,
        COALESCE(p_recommendation->>'location', 'Not Specified'),
        COALESCE(p_recommendation->>'startDate', ''),
        COALESCE(p_recommendation->>'applicationDeadline', ''),
        COALESCE(array(select jsonb_array_elements_text(p_recommendation->'requirements')), ARRAY[]::TEXT[]),
        COALESCE(array(select jsonb_array_elements_text(p_recommendation->'highlights')), ARRAY[]::TEXT[]),
        p_recommendation->>'pageLink'
      ) RETURNING id INTO v_program_id;

      -- Insert scholarships if provided
      IF p_recommendation ? 'scholarships' AND jsonb_array_length(p_recommendation->'scholarships') > 0 THEN
        INSERT INTO program_scholarships (program_id, name, amount, eligibility)
        SELECT v_program_id, s->>'name', s->>'amount', s->>'eligibility'
        FROM jsonb_array_elements(p_recommendation->'scholarships') s;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'Error creating program: %', SQLERRM;
    END;
  END IF;

  -- Clean up existing recommendation
  BEGIN
    DELETE FROM recommendations
    WHERE user_id = p_user_id AND program_id = v_program_id AND pathway_id IS NOT DISTINCT FROM p_pathway_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Error cleaning up existing recommendation: %', SQLERRM;
  END;

  -- Insert recommendation, now including is_deleted flag
  BEGIN
    INSERT INTO recommendations (
      user_id,
      program_id,
      match_score,
      match_rationale,
      vector_store_id,
      pathway_id,
      is_favorite,
      is_deleted
    ) VALUES (
      p_user_id,
      v_program_id,
      v_match_score,
      v_match_rationale,
      p_vector_store_id,
      p_pathway_id,
      COALESCE((p_recommendation->>'is_favorite')::BOOLEAN, FALSE),
      COALESCE((p_recommendation->>'is_deleted')::BOOLEAN, FALSE)
    ) RETURNING id INTO v_recommendation_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Error creating recommendation: %', SQLERRM;
  END;

  IF v_duplicate_program THEN
    RAISE NOTICE 'Used existing program with same name and institution: %', v_program_name;
  END IF;

  RETURN v_recommendation_id;
END;
$function$;

COMMIT; 