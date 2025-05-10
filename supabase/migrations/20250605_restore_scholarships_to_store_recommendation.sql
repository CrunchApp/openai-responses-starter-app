-- Migration: Restore scholarship insertion in store_recommendation
-- Date: 2025-06-05

BEGIN;

-- Drop the existing function to recreate with scholarship logic
DROP FUNCTION IF EXISTS public.store_recommendation(uuid, text, jsonb, uuid);

-- Recreate store_recommendation with scholarship insertion
CREATE OR REPLACE FUNCTION public.store_recommendation(
  p_user_id uuid,
  p_vector_store_id text,
  p_recommendation jsonb,
  p_pathway_id uuid DEFAULT NULL::uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_program_id uuid;
  v_recommendation_id uuid;
  v_match_score integer;
  v_match_rationale jsonb;
  v_program_name text;
  v_program_institution text;
  v_cost_per_year numeric;
  v_duration numeric;
  s jsonb;
BEGIN
  -- Parse recommendation fields
  v_program_name        := p_recommendation->>'name';
  v_program_institution := p_recommendation->>'institution';
  v_cost_per_year       := (p_recommendation->>'costPerYear')::numeric;
  v_duration            := (p_recommendation->>'duration')::numeric;
  v_match_score         := COALESCE((p_recommendation->>'match_score')::integer, 70);
  v_match_rationale     := COALESCE(p_recommendation->'match_rationale', '{"careerAlignment":70,"budgetFit":70,"locationMatch":70,"academicFit":70}'::jsonb);

  -- Upsert program
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
      COALESCE(p_recommendation->>'degreeType','Not Specified'),
      COALESCE(p_recommendation->>'fieldOfStudy','Not Specified'),
      COALESCE(p_recommendation->>'description','No description available'),
      v_cost_per_year,
      v_duration,
      COALESCE(p_recommendation->>'location','Not Specified'),
      COALESCE(p_recommendation->>'startDate',''),
      COALESCE(p_recommendation->>'applicationDeadline',''),
      COALESCE(array(select jsonb_array_elements_text(p_recommendation->'requirements')), ARRAY[]::text[]),
      COALESCE(array(select jsonb_array_elements_text(p_recommendation->'highlights')), ARRAY[]::text[]),
      p_recommendation->>'pageLink',
      p_recommendation->'pageLinks'
    ) RETURNING id INTO v_program_id;
  END IF;

  -- Always insert scholarships not yet present
  FOR s IN SELECT jsonb_array_elements(p_recommendation->'scholarships') LOOP
    IF NOT EXISTS (
      SELECT 1 FROM program_scholarships
       WHERE program_id = v_program_id
         AND name = s->>'name'
    ) THEN
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
    END IF;
  END LOOP;

  -- Insert recommendation record
  INSERT INTO recommendations (
    id, user_id, program_id, pathway_id,
    match_score, match_rationale, vector_store_id, created_at
  ) VALUES (
    gen_random_uuid(),
    p_user_id,
    v_program_id,
    p_pathway_id,
    v_match_score,
    v_match_rationale,
    p_vector_store_id,
    NOW()
  ) RETURNING id INTO v_recommendation_id;

  RETURN v_recommendation_id;
END;
$$;

COMMIT; 