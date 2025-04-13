-- Migration: Fix ambiguous column issue in get_pathway_programs
-- Description: Explicitly rename r.id to recommendation_id in function return type and query

-- Update the function with more explicit column naming
CREATE OR REPLACE FUNCTION public.get_pathway_programs(
  p_pathway_id UUID,
  p_user_id UUID
)
RETURNS TABLE (
  recommendation_id UUID,  -- Renamed from "id" to "recommendation_id"
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

  -- Return programs for this pathway
  RETURN QUERY
  SELECT 
    r.id AS recommendation_id,  -- Explicitly renamed column in query output
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
    r.match_score,
    r.match_rationale,
    r.is_favorite,
    r.feedback_negative,
    r.feedback_reason,
    r.feedback_submitted_at,
    p.scholarships
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