-- Fix get_pathway_programs function to use table aliases consistently for all column references
-- This ensures there's no ambiguity for columns like 'id' that exist in multiple tables

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
  feedback_negative BOOLEAN,
  feedback_reason TEXT,
  feedback_submitted_at TIMESTAMPTZ,
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
  
  -- Return recommendations with program data, using explicit table aliases for all columns
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
    r.match_score,
    r.match_rationale,
    r.is_favorite,
    r.feedback_negative,
    r.feedback_reason,
    r.feedback_submitted_at,
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
    AND r.user_id = p_user_id;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.get_pathway_programs TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pathway_programs TO service_role; 