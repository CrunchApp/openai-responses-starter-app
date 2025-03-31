-- Migration: Update search_user_context function to include recommendation file IDs
-- Description: Enhances the search_user_context function to include file IDs for recommendations.

CREATE OR REPLACE FUNCTION public.search_user_context(
  p_user_id uuid,
  p_natural_query text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER -- Function runs with the permissions of the user calling it
AS $$
DECLARE
  v_profile jsonb;
  v_recommendations jsonb;
  v_recommendation_files jsonb;
  v_context jsonb;
BEGIN
  -- 1. Fetch user profile
  SELECT 
    jsonb_strip_nulls(row_to_json(p)::jsonb) INTO v_profile
  FROM public.profiles p
  WHERE p.id = p_user_id;

  -- 2. Fetch user recommendations with basic keyword matching
  WITH matched_recommendations AS (
    SELECT 
      r.id as recommendation_id,
      r.match_score,
      r.is_favorite,
      r.match_rationale,
      r.created_at,
      prog.id as program_id,
      prog.name as program_name,
      prog.institution,
      prog.degree_type,
      prog.field_of_study,
      prog.description as program_description,
      prog.cost_per_year,
      prog.duration,
      prog.location,
      prog.start_date,
      prog.application_deadline,
      prog.requirements,
      prog.highlights,
      ps.scholarships
    FROM public.recommendations r
    JOIN public.programs prog on r.program_id = prog.id
    -- Left join to potentially get aggregated scholarships if stored separately
    LEFT JOIN (
      SELECT 
        program_id, 
        jsonb_agg(jsonb_build_object('name', name, 'amount', amount, 'eligibility', eligibility)) as scholarships 
      FROM public.program_scholarships 
      GROUP BY program_id
    ) ps on ps.program_id = prog.id
    WHERE 
      r.user_id = p_user_id
      -- Basic keyword filtering (Case-insensitive) - REPLACE with semantic search
      AND (
        lower(prog.name) like '%' || lower(p_natural_query) || '%' or
        lower(prog.description) like '%' || lower(p_natural_query) || '%' or
        lower(prog.field_of_study) like '%' || lower(p_natural_query) || '%' or 
        -- If query is very short, don't filter much (e.g., return all if query is < 3 chars)
        length(p_natural_query) < 3 
      )
    ORDER BY r.match_score DESC, r.created_at DESC
    LIMIT 10 -- Limit results for context window
  )
  SELECT 
    coalesce(jsonb_agg(jsonb_strip_nulls(row_to_json(rec_data))), '[]'::jsonb) INTO v_recommendations
  FROM matched_recommendations rec_data;
  
  -- 3. Get file IDs for the recommendations
  SELECT 
    coalesce(
      (SELECT jsonb_agg(jsonb_build_object(
        'recommendation_id', rf.recommendation_id,
        'file_id', rf.file_id,
        'file_name', rf.file_name
      ))
      FROM public.recommendation_files rf
      WHERE rf.recommendation_id IN (
        SELECT jsonb_array_elements(v_recommendations)->>'recommendation_id'
      )),
      '[]'::jsonb
    ) INTO v_recommendation_files;

  -- 4. Combine profile, recommendations, and recommendation files into a context object
  v_context := jsonb_build_object(
    'profile', coalesce(v_profile, '{}'::jsonb),
    'recommendations', coalesce(v_recommendations, '[]'::jsonb),
    'recommendation_files', v_recommendation_files,
    'searchQuery', p_natural_query -- Include the original query for reference
  );

  return v_context;

exception
  when others then
    -- Log the error (optional, requires extension or specific logging setup)
    -- raise warning 'Error in search_user_context for user %: %', p_user_id, sqlerrm; 
    
    -- Return a structured error message in JSONB
    return jsonb_build_object(
      'error', 'Failed to search user context',
      'details', sqlerrm
    );
end;
$$;

COMMENT ON FUNCTION public.search_user_context(uuid, text) IS 
  'Searches user-specific context (profile, recommendations) based on a natural language query. Returns results as JSONB with file IDs.'; 