-- Migration: Update store_programs_batch to accept JSONB instead of JSONB[] for p_recommendations
BEGIN;

-- Drop old function with jsonb[] signature
DROP FUNCTION IF EXISTS public.store_programs_batch(uuid, uuid, text, jsonb[]);

-- Create new function accepting JSONB array
CREATE OR REPLACE FUNCTION public.store_programs_batch(
  p_user_id uuid,
  p_pathway_id uuid,
  p_vector_store_id text,
  p_recommendations jsonb
)
RETURNS TABLE(
  success boolean,
  saved_count integer,
  saved_program_ids uuid[],
  saved_recommendation_ids uuid[],
  rejected_programs jsonb[],
  error text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_recommendation jsonb;
  v_recommendation_id uuid;
  v_program_id uuid;
  v_saved_count integer := 0;
  v_saved_program_ids uuid[] := ARRAY[]::uuid[];
  v_saved_recommendation_ids uuid[] := ARRAY[]::uuid[];
  v_rejected_programs jsonb[] := ARRAY[]::jsonb[];
  v_has_errors boolean := false;
  v_last_error text;
BEGIN
  -- Validate required parameters
  IF p_user_id IS NULL THEN
    RETURN QUERY SELECT false, 0, NULL::uuid[], NULL::uuid[], NULL::jsonb[], 'User ID is required';
    RETURN;
  END IF;

  IF p_vector_store_id IS NULL THEN
    RETURN QUERY SELECT false, 0, NULL::uuid[], NULL::uuid[], NULL::jsonb[], 'Vector store ID is required';
    RETURN;
  END IF;

  -- Check JSONB array length
  IF p_recommendations IS NULL OR jsonb_array_length(p_recommendations) = 0 THEN
    RETURN QUERY SELECT false, 0, NULL::uuid[], NULL::uuid[], NULL::jsonb[], 'No recommendations to process';
    RETURN;
  END IF;

  -- Loop over each JSON element in the JSONB array
  FOR v_recommendation IN SELECT jsonb_array_elements(p_recommendations)
  LOOP
    BEGIN
      -- Call store_recommendation for each item
      v_recommendation_id := store_recommendation(
        p_user_id,
        p_vector_store_id,
        v_recommendation,
        p_pathway_id
      );

      -- Track success
      v_saved_count := v_saved_count + 1;

      -- Retrieve program_id
      SELECT program_id INTO v_program_id
      FROM recommendations
      WHERE id = v_recommendation_id;

      IF v_program_id IS NOT NULL THEN
        v_saved_program_ids := array_append(v_saved_program_ids, v_program_id);
      END IF;
      v_saved_recommendation_ids := array_append(v_saved_recommendation_ids, v_recommendation_id);
    EXCEPTION WHEN OTHERS THEN
      v_has_errors := true;
      v_last_error := SQLERRM;
      v_rejected_programs := array_append(
        v_rejected_programs,
        jsonb_build_object(
          'name', v_recommendation->>'name',
          'reason', v_last_error
        )
      );
    END;
  END LOOP;

  -- Return aggregate results
  IF v_saved_count > 0 THEN
    IF v_has_errors THEN
      RETURN QUERY SELECT
        true,
        v_saved_count,
        v_saved_program_ids,
        v_saved_recommendation_ids,
        v_rejected_programs,
        'Partial success: ' || array_length(v_rejected_programs,1) || ' programs were rejected';
    ELSE
      RETURN QUERY SELECT
        true,
        v_saved_count,
        v_saved_program_ids,
        v_saved_recommendation_ids,
        NULL::jsonb[],
        NULL::text;
    END IF;
  ELSE
    RETURN QUERY SELECT
      false,
      0,
      NULL::uuid[],
      NULL::uuid[],
      v_rejected_programs,
      'Failed to save any programs: ' || v_last_error;
  END IF;
END;
$function$;

COMMIT; 