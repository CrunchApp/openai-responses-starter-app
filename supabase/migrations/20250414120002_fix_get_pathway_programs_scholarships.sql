-- Migration: Fix scholarships in get_pathway_programs function
-- Description: Updates the function to correctly fetch and aggregate scholarships from program_scholarships table

CREATE OR REPLACE FUNCTION public.get_pathway_programs(
  p_pathway_id UUID,
  p_user_id UUID
)
RETURNS TABLE (
  recommendation_id UUID,
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
  requirements JSONB,
  highlights JSONB,
  page_link TEXT,
  match_score INTEGER,
  match_rationale JSONB,
  is_favorite BOOLEAN,
  feedback_negative BOOLEAN,
  feedback_reason TEXT,
  feedback_submitted_at TIMESTAMPTZ,
  scholarships JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validate parameters
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User ID is required';
  END IF;
  
  IF p_pathway_id IS NULL THEN
    RAISE EXCEPTION 'Pathway ID is required';
  END IF;
  
  -- Verify that the pathway belongs to the user
  IF NOT EXISTS (
    SELECT 1 FROM public.education_pathways 
    WHERE id = p_pathway_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Pathway not found or does not belong to the user';
  END IF;

  -- Return programs for this pathway with aggregated scholarships
  RETURN QUERY
  SELECT 
    r.id AS recommendation_id,
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
    to_jsonb(p.requirements) AS requirements,
    to_jsonb(p.highlights) AS highlights,
    p.page_link,
    r.match_score,
    r.match_rationale,
    r.is_favorite,
    r.feedback_negative,
    r.feedback_reason,
    r.feedback_submitted_at,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'name', ps.name,
            'amount', ps.amount,
            'eligibility', ps.eligibility
          )
        )
        FROM program_scholarships ps
        WHERE ps.program_id = p.id
      ),
      '[]'::jsonb
    ) AS scholarships
  FROM 
    public.recommendations r
  JOIN 
    public.programs p ON r.program_id = p.id
  WHERE 
    r.pathway_id = p_pathway_id
    AND r.user_id = p_user_id
  ORDER BY 
    r.match_score DESC,
    r.created_at DESC;
END;
$$;

-- Grant appropriate permissions
GRANT EXECUTE ON FUNCTION public.get_pathway_programs(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pathway_programs(UUID, UUID) TO service_role; 