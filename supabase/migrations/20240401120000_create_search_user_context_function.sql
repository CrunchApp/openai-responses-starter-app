-- Migration: Create search_user_context function
-- Description: Adds a function to search user-specific context (profile, recommendations) based on a natural language query.

create or replace function public.search_user_context(
  p_user_id uuid,
  p_natural_query text
)
returns jsonb
language plpgsql
security invoker -- Function runs with the permissions of the user calling it
as $$
declare
  v_profile jsonb;
  v_recommendations jsonb;
  v_context jsonb;
begin
  -- 1. Fetch user profile
  select 
    jsonb_strip_nulls(row_to_json(p)::jsonb) into v_profile
  from public.profiles p
  where p.id = p_user_id;

  -- 2. Fetch user recommendations (similar logic to get_user_recommendations if exists)
  -- TODO: Enhance this query. Currently uses basic keyword matching on program name/description.
  -- Ideal implementation would use pgvector/embeddings for semantic search based on p_natural_query.
  select 
    coalesce(jsonb_agg(jsonb_strip_nulls(row_to_json(rec_data))), '[]'::jsonb) into v_recommendations
  from (
    select 
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
    from public.recommendations r
    join public.programs prog on r.program_id = prog.id
    -- Left join to potentially get aggregated scholarships if stored separately
    left join (
      select 
        program_id, 
        jsonb_agg(jsonb_build_object('name', name, 'amount', amount, 'eligibility', eligibility)) as scholarships 
      from public.program_scholarships 
      group by program_id
    ) ps on ps.program_id = prog.id
    where 
      r.user_id = p_user_id
      -- Basic keyword filtering (Case-insensitive) - REPLACE with semantic search
      and (
        lower(prog.name) like '%' || lower(p_natural_query) || '%' or
        lower(prog.description) like '%' || lower(p_natural_query) || '%' or
        lower(prog.field_of_study) like '%' || lower(p_natural_query) || '%' or 
        -- If query is very short, don't filter much (e.g., return all if query is < 3 chars)
        length(p_natural_query) < 3 
      )
    order by r.match_score desc, r.created_at desc
    limit 10 -- Limit results for context window
  ) as rec_data;

  -- 3. Combine profile and recommendations into a context object
  v_context := jsonb_build_object(
    'profile', coalesce(v_profile, '{}'::jsonb),
    'recommendations', coalesce(v_recommendations, '[]'::jsonb),
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

comment on function public.search_user_context(uuid, text) is 
  'Searches user-specific context (profile, recommendations) based on a natural language query. Returns results as JSONB. Basic keyword filtering, intended to be replaced by semantic search.';

-- Example Usage (Run in Supabase SQL Editor):
/*
select search_user_context(
  'YOUR_USER_ID_HERE'::uuid, 
  'engineering programs' -- Example natural language query
);
*/ 