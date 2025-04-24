-- Migration: Update get_user_recommendations to exclude deleted records and use feedback_negative column
BEGIN;

-- Replace get_user_recommendations with new definition
CREATE OR REPLACE FUNCTION public.get_user_recommendations(p_user_id uuid)
RETURNS SETOF jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT jsonb_build_object(
    'id',                    r.id,
    'match_score',           r.match_score,
    'is_favorite',           r.is_favorite,
    'match_rationale',       r.match_rationale,
    'feedback_data',         r.feedback_data,
    'feedback_negative',     r.feedback_negative,
    'feedback_submitted_at', r.feedback_submitted_at,
    'pathway_id',            r.pathway_id,
    'name',                  p.name,
    'institution',           p.institution,
    'degree_type',           p.degree_type,
    'field_of_study',        p.field_of_study,
    'description',           p.description,
    'cost_per_year',         p.cost_per_year,
    'duration',              p.duration,
    'location',              p.location,
    'start_date',            p.start_date,
    'application_deadline',  p.application_deadline,
    'requirements',          p.requirements,
    'highlights',            p.highlights,
    'page_link',             p.page_link
  )
  FROM recommendations r
  JOIN programs p ON p.id = r.program_id
  WHERE r.user_id = p_user_id
    AND r.is_deleted = FALSE;
END;
$function$;

COMMIT; 