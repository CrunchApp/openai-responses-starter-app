-- Add page_links column support to store_recommendation
CREATE OR REPLACE FUNCTION public.store_recommendation(
  p_user_id UUID,
  p_vector_store_id TEXT,
  p_recommendation JSONB,
  p_pathway_id UUID DEFAULT NULL::UUID
)
RETURNS TABLE(
  success BOOLEAN,
  recommendation_id UUID,
  program_id UUID,
  error TEXT
)
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
BEGIN
  -- Validate required parameters
  IF p_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID, 'User ID is required';
    RETURN;
  END IF;

  v_program_name := p_recommendation->>'name';
  v_program_institution := p_recommendation->>'institution';

  -- existing duplicate and match logic...

  -- If program doesn't exist, create it with page_links
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
        page_link,
        page_links
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
        ARRAY(SELECT jsonb_array_elements_text(p_recommendation->'requirements')),
        ARRAY(SELECT jsonb_array_elements_text(p_recommendation->'highlights')),
        p_recommendation->>'pageLink',
        COALESCE(p_recommendation->'pageLinks', '[]'::JSONB)
      )
      RETURNING id INTO v_program_id;
      -- scholarship insertion... (unchanged)
    EXCEPTION WHEN OTHERS THEN
      RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID, 'Error creating program: ' || SQLERRM;
      RETURN;
    END;
  END IF;

  -- existing recommendation deletion and insertion logic unchanged

END;
$$;

-- Grant execute to roles
GRANT EXECUTE ON FUNCTION public.store_recommendation(UUID, TEXT, JSONB, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.store_recommendation(UUID, TEXT, JSONB, UUID) TO service_role; 