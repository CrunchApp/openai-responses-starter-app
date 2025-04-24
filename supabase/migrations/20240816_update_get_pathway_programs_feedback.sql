-- Migration: Update get_pathway_programs to return feedback_data JSONB
BEGIN;

CREATE OR REPLACE FUNCTION public.get_pathway_programs(
  p_pathway_id UUID,
  p_user_id UUID
)
RETURNS TABLE (
  recommendation_id UUID,
  program_id UUID,
  name TEXT,
  institution TEXT,
  degree_type TEXT,
  field_of_study TEXT,
  description TEXT,
  cost_per_year NUMERIC,
  duration INTEGER,
  location TEXT,
  start_date TEXT,
  application_deadline TEXT,
  requirements TEXT[],
  highlights TEXT[],
  page_link TEXT,
  match_score INTEGER,
  match_rationale JSONB,
  is_favorite BOOLEAN,
  feedback_negative BOOLEAN, -- Keep this boolean column
  feedback_data JSONB,       -- Return the JSONB data
  scholarships JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Validate required parameters
  IF p_pathway_id IS NULL THEN
    RAISE EXCEPTION 'Pathway ID is required';
  END IF;

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User ID is required';
  END IF;

  -- Check that the pathway exists and belongs to the user
  PERFORM id
  FROM education_pathways
  WHERE id = p_pathway_id AND user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pathway not found or does not belong to the user';
  END IF;

  -- Return recommendations with program data
  RETURN QUERY
  SELECT
    r.id AS recommendation_id,
    p.id AS program_id,
    p.name,
    p.institution,
    p.degree_type,
    p.field_of_study,
    p.description,
    p.cost_per_year,
    p.duration,
    p.location,
    p.start_date,
    p.application_deadline,
    p.requirements,
    p.highlights,
    p.page_link,
    CAST(r.match_score AS INTEGER),
    r.match_rationale,
    r.is_favorite,
    r.feedback_negative, -- Select the boolean column
    r.feedback_data,     -- Select the JSONB column
    (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'name', ps.name,
          'amount', ps.amount,
          'eligibility', ps.eligibility
        )
      ), '[]'::jsonb)
      FROM program_scholarships ps
      WHERE ps.program_id = p.id
    ) AS scholarships,
    r.created_at,
    r.updated_at
  FROM
    recommendations r
  JOIN
    programs p ON r.program_id = p.id
  WHERE
    r.pathway_id = p_pathway_id
    AND r.user_id = p_user_id
    AND r.is_deleted = FALSE; -- Ensure we only return non-deleted recommendations
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.get_pathway_programs(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pathway_programs(UUID, UUID) TO service_role;

-- Add a comment explaining the purpose of this function
COMMENT ON FUNCTION public.get_pathway_programs(UUID, UUID) IS 'Get non-deleted programs for a pathway, returning feedback_data JSONB.';

COMMIT; 