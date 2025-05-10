-- 1) Drop the old function
DROP FUNCTION IF EXISTS public.store_recommendation(uuid, text, jsonb, uuid);

-- 2) Recreate it with the missing INSERT INTO recommendations including program_id
CREATE OR REPLACE FUNCTION public.store_recommendation(
  p_user_id        uuid,
  p_vector_store_id text,
  p_recommendation jsonb,
  p_pathway_id     uuid DEFAULT NULL::uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_program_id         uuid;
  v_recommendation_id  uuid;
  v_match_score        integer;
  v_match_rationale    jsonb;
  v_program_name       text;
  v_program_institution text;
  v_cost_per_year      numeric;
  v_duration           numeric;
BEGIN
  -- 1) Parse fields
  v_program_name        := p_recommendation->>'name';
  v_program_institution := p_recommendation->>'institution';
  v_cost_per_year       := (p_recommendation->>'costPerYear')::numeric;
  v_duration            := (p_recommendation->>'duration')::numeric;
  v_match_score         := COALESCE((p_recommendation->>'match_score')::integer, 70);
  v_match_rationale     := COALESCE(
                             p_recommendation->'match_rationale',
                             '{"careerAlignment":70,"budgetFit":70,"locationMatch":70,"academicFit":70}'::jsonb
                           );

  -- 2) Insert or fetch the program
  IF v_program_id IS NULL THEN
    INSERT INTO programs (
      name, institution, degree_type, field_of_study,
      description, cost_per_year, duration, location,
      start_date, application_deadline, requirements,
      highlights, page_link, page_links
    )
    VALUES (
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
    )
    RETURNING id INTO v_program_id;
  END IF;

  -- 3) Now insert the recommendation itself—and include program_id!
  INSERT INTO recommendations (
    id, user_id, program_id, pathway_id,
    match_score, match_rationale,
    vector_store_id, created_at
  )
  VALUES (
    gen_random_uuid(),
    p_user_id,
    v_program_id,
    p_pathway_id,
    v_match_score,
    v_match_rationale,
    p_vector_store_id,
    NOW()
  )
  RETURNING id INTO v_recommendation_id;

  RETURN v_recommendation_id;
END;
$$;