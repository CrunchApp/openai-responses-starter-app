-- Add validation to store_recommendation to ensure match_score is never null
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
    page_link,
    scholarships
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
    (p_recommendation->'requirements')::JSONB,
    (p_recommendation->'highlights')::JSONB,
    p_recommendation->>'pageLink',
    (p_recommendation->'scholarships')::JSONB
  )
  RETURNING id INTO v_program_id;

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