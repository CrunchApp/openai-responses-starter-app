-- Migration: Add scholarship insertion to store_recommendation
-- Date: 2025-06-03

BEGIN;

-- Update store_recommendation to insert program scholarships
CREATE OR REPLACE FUNCTION public.store_recommendation(
  p_user_id uuid,
  p_vector_store_id text,
  p_recommendation jsonb,
  p_pathway_id uuid DEFAULT NULL::uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_program_id UUID;
  v_recommendation_id UUID;
  v_match_score INTEGER;
  v_match_rationale JSONB;
  v_program_name TEXT;
  v_program_institution TEXT;
  v_cost_per_year NUMERIC;
  v_duration NUMERIC;
  s JSONB;
BEGIN
  -- Parse recommendation fields
  v_program_name := p_recommendation->>'name';
  v_program_institution := p_recommendation->>'institution';
  v_cost_per_year := (p_recommendation->>'costPerYear')::NUMERIC;
  v_duration := (p_recommendation->>'duration')::NUMERIC;
  v_match_score := COALESCE((p_recommendation->>'match_score')::INTEGER, 70);
  v_match_rationale := COALESCE(p_recommendation->'match_rationale', '{"careerAlignment":70,"budgetFit":70,"locationMatch":70,"academicFit":70}'::JSONB);

  -- Ensure program exists (insert if new)
  SELECT id INTO v_program_id
    FROM programs
    WHERE name = v_program_name
      AND institution = v_program_institution
    LIMIT 1;

  IF v_program_id IS NULL THEN
    INSERT INTO programs (
      name, institution, degree_type, field_of_study, description,
      cost_per_year, duration, location, start_date, application_deadline,
      requirements, highlights, page_link, page_links
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
      p_recommendation->>'pageLink',
      p_recommendation->'pageLinks'
    ) RETURNING id INTO v_program_id;

    -- Insert scholarships for this program
    FOR s IN SELECT jsonb_array_elements(p_recommendation->'scholarships') LOOP
      INSERT INTO program_scholarships(
        program_id, name, amount, eligibility, created_at, updated_at
      ) VALUES (
        v_program_id,
        s->>'name',
        s->>'amount',
        s->>'eligibility',
        NOW(),
        NOW()
      );
    END LOOP;
  END IF;

  -- Insert recommendation record
  INSERT INTO recommendations (
    user_id, program_id, vector_store_id, pathway_id,
    match_score, match_rationale, is_favorite, is_deleted,
    feedback_data, feedback_negative, feedback_submitted_at,
    created_at, updated_at
  ) VALUES (
    p_user_id, v_program_id, p_vector_store_id, p_pathway_id,
    v_match_score, v_match_rationale, false, false,
    '{}'::JSONB, false, NULL,
    NOW(), NOW()
  ) RETURNING id INTO v_recommendation_id;

  RETURN v_recommendation_id;
END;
$function$;

COMMIT; 