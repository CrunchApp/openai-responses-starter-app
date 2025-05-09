DROP FUNCTION IF EXISTS public.store_recommendation(uuid, text, jsonb, uuid);

-- then re‐create with the new logic (always inserting scholarships)
CREATE FUNCTION public.store_recommendation(
  p_user_id         uuid,
  p_vector_store_id text,
  p_recommendation  jsonb,
  p_pathway_id      uuid DEFAULT NULL::uuid
) RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO public
AS $$
DECLARE
  v_program_id       uuid;
  v_recommendation_id uuid;
  v_match_score      integer;
  v_match_rationale  jsonb;
  v_program_name     text;
  v_program_institution text;
  v_cost_per_year    numeric;
  v_duration         numeric;
  s                  jsonb;
BEGIN
  -- parse base fields
  v_program_name        := p_recommendation->>'name';
  v_program_institution := p_recommendation->>'institution';
  v_cost_per_year       := (p_recommendation->>'costPerYear')::numeric;
  v_duration            := (p_recommendation->>'duration')::numeric;
  v_match_score         := coalesce((p_recommendation->>'match_score')::integer,70);
  v_match_rationale     := coalesce(p_recommendation->'match_rationale',
                               '{"careerAlignment":70,"budgetFit":70,"locationMatch":70,"academicFit":70}'::jsonb);

  -- upsert program
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
      coalesce(p_recommendation->>'degreeType','Not Specified'),
      coalesce(p_recommendation->>'fieldOfStudy','Not Specified'),
      coalesce(p_recommendation->>'description','No description available'),
      v_cost_per_year,
      v_duration,
      coalesce(p_recommendation->>'location','Not Specified'),
      coalesce(p_recommendation->>'startDate',''),
      coalesce(p_recommendation->>'applicationDeadline',''),
      coalesce(array(select jsonb_array_elements_text(p_recommendation->'requirements')),array[]::text[]),
      coalesce(array(select jsonb_array_elements_text(p_recommendation->'highlights')),array[]::text[]),
      p_recommendation->>'pageLink',
      p_recommendation->'pageLinks'
    )
    RETURNING id INTO v_program_id;
  END IF;

  -- ALWAYS insert any scholarships not yet present
  FOR s IN SELECT jsonb_array_elements(p_recommendation->'scholarships') LOOP
    IF NOT EXISTS (
      SELECT 1 FROM program_scholarships
       WHERE program_id = v_program_id
         AND name       = s->>'name'
    ) THEN
      INSERT INTO program_scholarships(
        program_id, name, amount, eligibility, created_at, updated_at
      ) VALUES (
        v_program_id,
        s->>'name',
        s->>'amount',
        s->>'eligibility',
        NOW(), NOW()
      );
    END IF;
  END LOOP;

  -- finally insert the recommendation record
  INSERT INTO recommendations (
    user_id, program_id, vector_store_id, pathway_id,
    match_score, match_rationale, is_favorite, is_deleted,
    feedback_data, feedback_negative, feedback_submitted_at,
    created_at, updated_at
  ) VALUES (
    p_user_id, v_program_id, p_vector_store_id, p_pathway_id,
    v_match_score, v_match_rationale, false, false,
    '{}'::jsonb, false, NULL,
    NOW(), NOW()
  )
  RETURNING id INTO v_recommendation_id;

  RETURN v_recommendation_id;
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error in store_recommendation: %', SQLERRM;
END;
$$;