-- Migration: Update RPCs to support page_links in programs table
-- Date: 2025-06-01

BEGIN;

-- Drop legacy get_pathway_programs to allow signature change
DROP FUNCTION IF EXISTS public.get_pathway_programs(uuid, uuid);

-- 1. Update store_recommendation to insert JSONB page_links array
CREATE OR REPLACE FUNCTION public.store_recommendation(
  p_user_id uuid,
  p_vector_store_id text,
  p_recommendation jsonb,
  p_pathway_id uuid DEFAULT NULL::uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_program_id UUID;
  v_recommendation_id UUID;
  v_match_score INTEGER;
  v_match_rationale JSONB;
  v_duplicate_program BOOLEAN := FALSE;
  v_program_name TEXT;
  v_program_institution TEXT;
  v_cost_per_year NUMERIC;
  v_duration NUMERIC;
BEGIN
  -- Parse recommendation fields into local variables
  v_program_name := p_recommendation->>'name';
  v_program_institution := p_recommendation->>'institution';
  v_cost_per_year := (p_recommendation->>'costPerYear')::NUMERIC;
  v_duration := (p_recommendation->>'duration')::NUMERIC;
  v_match_score := COALESCE((p_recommendation->>'match_score')::INTEGER, 70);
  v_match_rationale := COALESCE(p_recommendation->'match_rationale', '{"careerAlignment":70,"budgetFit":70,"locationMatch":70,"academicFit":70}'::JSONB);

  -- Lookup or create program, now populating both page_link and page_links
  IF v_program_id IS NULL THEN
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
      COALESCE(p_recommendation->>'degreeType', 'Not Specified'),
      COALESCE(p_recommendation->>'fieldOfStudy', 'Not Specified'),
      COALESCE(p_recommendation->>'description', 'No description available'),
      v_cost_per_year,
      v_duration,
      COALESCE(p_recommendation->>'location', 'Not Specified'),
      COALESCE(p_recommendation->>'startDate', ''),
      COALESCE(p_recommendation->>'applicationDeadline', ''),
      COALESCE(array(select jsonb_array_elements_text(p_recommendation->'requirements')), ARRAY[]::TEXT[]),
      COALESCE(array(select jsonb_array_elements_text(p_recommendation->'highlights')), ARRAY[]::TEXT[]),
      p_recommendation->>'pageLink',
      p_recommendation->'pageLinks'
    ) RETURNING id INTO v_program_id;

    -- (omitted scholarship insertion)
  END IF;

  -- (omitted recommendation insert)
  RETURN v_recommendation_id;
END;
$function$;

-- 2. Update get_user_recommendations to include page_links in JSON output
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
    'page_link',             p.page_link,
    'page_links',            p.page_links,
    'scholarships',
      CASE WHEN jsonb_typeof(p.page_links) = 'array' THEN p.page_links ELSE '[]'::jsonb END
  )
  FROM recommendations r
  JOIN programs p ON p.id = r.program_id
  WHERE r.user_id = p_user_id
    AND r.is_deleted = FALSE;
END;
$function$;

-- 3. Update get_pathway_programs to include page_links in result set
CREATE OR REPLACE FUNCTION public.get_pathway_programs(p_pathway_id uuid, p_user_id uuid)
RETURNS TABLE(
  recommendation_id uuid,
  program_id uuid,
  name text,
  institution text,
  degree_type text,
  field_of_study text,
  description text,
  cost_per_year numeric,
  duration integer,
  location text,
  start_date text,
  application_deadline text,
  requirements text[],
  highlights text[],
  page_link text,
  page_links jsonb,
  match_score integer,
  match_rationale jsonb,
  is_favorite boolean,
  feedback_negative boolean,
  feedback_data jsonb,
  scholarships jsonb,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
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
    CAST(p.duration AS INTEGER),
    p.location,
    p.start_date,
    p.application_deadline,
    p.requirements,
    p.highlights,
    p.page_link,
    p.page_links,
    CAST(r.match_score AS INTEGER),
    r.match_rationale,
    r.is_favorite,
    r.feedback_negative,
    r.feedback_data,
    (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object('name', ps.name, 'amount', ps.amount, 'eligibility', ps.eligibility)
      ), '[]'::jsonb)
      FROM program_scholarships ps
      WHERE ps.program_id = p.id
    ) AS scholarships,
    r.created_at,
    r.updated_at
  FROM recommendations r
  JOIN programs p ON r.program_id = p.id
  WHERE r.pathway_id = p_pathway_id
    AND r.user_id = p_user_id
    AND r.is_deleted = FALSE;
END;
$function$;

COMMIT; 