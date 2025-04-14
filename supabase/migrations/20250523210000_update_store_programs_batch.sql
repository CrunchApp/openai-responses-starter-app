-- Update store_programs_batch function to work with the modified store_recommendation
-- that returns UUID directly instead of a record with multiple fields

CREATE OR REPLACE FUNCTION public.store_programs_batch(
  p_user_id UUID,
  p_pathway_id UUID,
  p_vector_store_id TEXT,
  p_recommendations JSONB[]
)
RETURNS TABLE (
  success BOOLEAN,
  saved_count INTEGER,
  saved_program_ids UUID[],
  saved_recommendation_ids UUID[],
  rejected_programs JSONB[],
  error TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_recommendation JSONB;
  v_recommendation_id UUID;
  v_program_id UUID;
  v_saved_count INTEGER := 0;
  v_saved_program_ids UUID[] := ARRAY[]::UUID[];
  v_saved_recommendation_ids UUID[] := ARRAY[]::UUID[];
  v_rejected_programs JSONB[] := ARRAY[]::JSONB[];
  v_has_errors BOOLEAN := FALSE;
  v_last_error TEXT;
BEGIN
  -- Validate required parameters
  IF p_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 0, NULL::UUID[], NULL::UUID[], NULL::JSONB[], 'User ID is required';
    RETURN;
  END IF;
  
  IF p_vector_store_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 0, NULL::UUID[], NULL::UUID[], NULL::JSONB[], 'Vector store ID is required';
    RETURN;
  END IF;
  
  IF p_recommendations IS NULL OR array_length(p_recommendations, 1) IS NULL THEN
    RETURN QUERY SELECT FALSE, 0, NULL::UUID[], NULL::UUID[], NULL::JSONB[], 'No recommendations to process';
    RETURN;
  END IF;
  
  -- Process each recommendation
  FOREACH v_recommendation IN ARRAY p_recommendations
  LOOP
    BEGIN
      -- Call store_recommendation for each item in the batch
      -- Store_recommendation now returns the recommendation ID directly (UUID)
      v_recommendation_id := store_recommendation(
        p_user_id,
        p_vector_store_id,
        v_recommendation,
        p_pathway_id
      );
      
      -- If we got this far, the operation was successful
      v_saved_count := v_saved_count + 1;
      
      -- Get the program_id from the newly created recommendation
      SELECT program_id INTO v_program_id
      FROM recommendations
      WHERE id = v_recommendation_id;
      
      -- Add program_id to the array of saved program IDs if found
      IF v_program_id IS NOT NULL THEN
        v_saved_program_ids := array_append(v_saved_program_ids, v_program_id);
      END IF;
      
      -- Add recommendation_id to the array of saved recommendation IDs
      v_saved_recommendation_ids := array_append(v_saved_recommendation_ids, v_recommendation_id);
      
    EXCEPTION WHEN OTHERS THEN
      -- Handle exceptions for individual recommendations
      v_has_errors := TRUE;
      v_last_error := SQLERRM;
      
      -- Create a JSON object with program name and error reason
      v_rejected_programs := array_append(
        v_rejected_programs,
        jsonb_build_object(
          'name', v_recommendation->>'name',
          'reason', SQLERRM
        )
      );
    END;
  END LOOP;
  
  -- Return the results
  IF v_saved_count > 0 THEN
    -- If at least one program was saved, consider it a partial success
    IF v_has_errors THEN
      RETURN QUERY SELECT 
        TRUE, 
        v_saved_count, 
        v_saved_program_ids, 
        v_saved_recommendation_ids, 
        v_rejected_programs, 
        'Partial success: ' || array_length(v_rejected_programs, 1) || ' programs were rejected';
    ELSE
      -- All programs were saved successfully
      RETURN QUERY SELECT 
        TRUE, 
        v_saved_count, 
        v_saved_program_ids, 
        v_saved_recommendation_ids, 
        NULL::JSONB[], 
        NULL::TEXT;
    END IF;
  ELSE
    -- No programs were saved
    RETURN QUERY SELECT 
      FALSE, 
      0, 
      ARRAY[]::UUID[], 
      ARRAY[]::UUID[], 
      v_rejected_programs, 
      'Failed to save any programs: ' || v_last_error;
  END IF;
END;
$$;

-- Grant execute permission on the function to authenticated users
GRANT EXECUTE ON FUNCTION public.store_programs_batch TO authenticated;
GRANT EXECUTE ON FUNCTION public.store_programs_batch TO service_role; 