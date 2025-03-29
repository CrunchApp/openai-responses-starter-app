-- Description: Correct the store_recommendation function to safely handle program insertion while respecting RLS policies

-- Use SECURITY DEFINER for permissions to insert into programs table
create or replace function public.store_recommendation(
  p_user_id uuid,
  p_vector_store_id text,
  p_recommendation jsonb
)
returns uuid
language plpgsql
security definer -- Use definer security to bypass RLS on programs table
set search_path = ''
as $$
declare
  v_program_id uuid;
  v_recommendation_id uuid;
  v_exists boolean;
begin
  -- Check if program_id is provided and valid UUID format
  if p_recommendation ? 'program_id' and p_recommendation->>'program_id' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    -- First check if program already exists by ID
    select exists (select 1 from public.programs where id = (p_recommendation->>'program_id')::uuid) into v_exists;
    
    if v_exists then
      v_program_id := (p_recommendation->>'program_id')::uuid;
    end if;
  end if;
  
  -- If we don't have a valid program ID yet, check by name and institution
  if v_program_id is null then
    select id into v_program_id 
    from public.programs 
    where name = p_recommendation->>'name' 
    and institution = p_recommendation->>'institution'
    limit 1;
    
    -- If program still doesn't exist, insert it using SECURITY DEFINER
    if v_program_id is null then
      insert into public.programs (
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
        highlights
      ) values (
        p_recommendation->>'name',
        p_recommendation->>'institution',
        p_recommendation->>'degreeType',
        p_recommendation->>'fieldOfStudy',
        p_recommendation->>'description',
        (p_recommendation->>'costPerYear')::numeric,
        (p_recommendation->>'duration')::integer,
        p_recommendation->>'location',
        p_recommendation->>'startDate',
        p_recommendation->>'applicationDeadline',
        array(select jsonb_array_elements_text(p_recommendation->'requirements')),
        array(select jsonb_array_elements_text(p_recommendation->'highlights'))
      )
      returning id into v_program_id;
      
      -- Insert scholarships if present
      if p_recommendation ? 'scholarships' and jsonb_array_length(p_recommendation->'scholarships') > 0 then
        insert into public.program_scholarships (program_id, name, amount, eligibility)
        select 
          v_program_id,
          s->>'name',
          s->>'amount',
          s->>'eligibility'
        from jsonb_array_elements(p_recommendation->'scholarships') s;
      end if;
    end if;
  end if;
  
  -- Delete existing recommendation for this user and program if exists
  delete from public.recommendations 
  where user_id = p_user_id and program_id = v_program_id;
  
  -- Insert recommendation
  insert into public.recommendations (
    user_id,
    program_id,
    match_score,
    is_favorite,
    match_rationale,
    vector_store_id
  ) values (
    p_user_id,
    v_program_id,
    (p_recommendation->>'match_score')::integer,
    coalesce((p_recommendation->>'is_favorite')::boolean, false),
    p_recommendation->'match_rationale',
    p_vector_store_id
  )
  returning id into v_recommendation_id;
  
  return v_recommendation_id;
exception
  when others then
    raise exception 'Error in store_recommendation: %', sqlerrm;
end;
$$;

comment on function public.store_recommendation(uuid, text, jsonb) is 
  'Stores a recommendation for a user and ensures the referenced program exists in the programs table. Uses SECURITY DEFINER to bypass RLS for program insertion.'; 