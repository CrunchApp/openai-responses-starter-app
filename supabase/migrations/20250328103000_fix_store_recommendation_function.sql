-- Description: Correct the store_recommendation function to insert into the recommendations table.

-- Use SECURITY INVOKER for security best practices.
-- Set search_path to '' to avoid schema issues.
create or replace function public.store_recommendation(
  p_user_id uuid,
  p_vector_store_id text,
  p_recommendation jsonb
)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_recommendation_id uuid;
begin
  -- Ensure the recommendation JSONB is not null
  if p_recommendation is null then
    raise exception 'Recommendation JSON cannot be null';
  end if;

  -- Insert into the recommendations table
  insert into public.recommendations (
    user_id,
    program_id,
    vector_store_id,
    match_score,
    is_favorite,
    match_rationale
  ) values (
    p_user_id,
    p_recommendation->>'program_id', -- Extract program_id from JSONB
    p_vector_store_id,
    (p_recommendation->>'match_score')::numeric, -- Extract and cast match_score
    (p_recommendation->>'is_favorite')::boolean, -- Extract and cast is_favorite
    p_recommendation->'match_rationale' -- Extract match_rationale
  ) returning id into v_recommendation_id;

  return v_recommendation_id::text;
exception
  when others then
    raise exception 'Error inserting recommendation: %', sqlerrm;
end;
$$;

comment on function public.store_recommendation(uuid, text, jsonb) is
  'Stores a recommendation for a user, ensuring data integrity and security.'; 