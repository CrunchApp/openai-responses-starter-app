-- Update store_programs_batch function to collect detailed error information
-- and track rejected programs with reasons

CREATE OR REPLACE FUNCTION public.store_programs_batch(
  p_user_id UUID,
  p_pathway_id UUID,
  p_vector_store_id TEXT,
  p_recommendations JSONB[]
)
RETURNS TABLE(
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
  v_program_ids UUID[] := '{}';
  v_recommendation_ids UUID[] := '{}';
  v_rejected_programs JSONB[] := '{}';
  v_count INTEGER := 0;
  v_error TEXT;
  v_rec_success BOOLEAN;
  v_rec_error TEXT;
  v_program_name TEXT;
BEGIN
  -- Validate input parameters
  IF p_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 0, NULL::UUID[], NULL::UUID[], NULL::JSONB[], 'User ID is required';
    RETURN;
  END IF;

  IF p_pathway_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 0, NULL::UUID[], NULL::UUID[], NULL::JSONB[], 'Pathway ID is required';
    RETURN;
  END IF;
  
  -- Verify that the pathway belongs to the user
  IF NOT EXISTS (
    SELECT 1 FROM public.education_pathways 
    WHERE id = p_pathway_id AND user_id = p_user_id
  ) THEN
    RETURN QUERY SELECT FALSE, 0, NULL::UUID[], NULL::UUID[], NULL::JSONB[], 'Pathway not found or does not belong to the user';
    RETURN;
  END IF;

  -- Process each recommendation
  BEGIN
    FOREACH v_recommendation IN ARRAY p_recommendations
    LOOP
      -- Log the program name for better error tracking
      v_program_name := v_recommendation->>'name';
      
      -- Call enhanced store_recommendation for each one
      SELECT 
        r.success, 
        r.recommendation_id, 
        r.program_id, 
        r.error 
      INTO 
        v_rec_success, 
        v_recommendation_id, 
        v_program_id, 
        v_rec_error
      FROM 
        public.store_recommendation(
          p_user_id, 
          p_vector_store_id, 
          v_recommendation,
          p_pathway_id
        ) r;
      
      -- If successful, increment counter and store IDs
      IF v_rec_success AND v_recommendation_id IS NOT NULL THEN
        v_count := v_count + 1;
        
        -- Store both recommendation and program IDs
        v_recommendation_ids := array_append(v_recommendation_ids, v_recommendation_id);
        
        IF v_program_id IS NOT NULL THEN
          v_program_ids := array_append(v_program_ids, v_program_id);
        END IF;
      ELSE
        -- Track rejected programs with reasons
        v_rejected_programs := array_append(
          v_rejected_programs, 
          jsonb_build_object(
            'name', v_program_name,
            'reason', COALESCE(v_rec_error, 'Unknown error')
          )
        );
      END IF;
    END LOOP;
    
    -- Mark the pathway as explored if we successfully saved at least one recommendation
    IF v_count > 0 THEN
      PERFORM public.update_pathway_explored_status(p_pathway_id, TRUE);
    END IF;
    
    -- Return success with program IDs, recommendation IDs, and rejected programs
    RETURN QUERY SELECT 
      TRUE, 
      v_count, 
      v_program_ids, 
      v_recommendation_ids, 
      v_rejected_programs,
      CASE 
        WHEN array_length(v_rejected_programs, 1) > 0 THEN 
          'Partial success: ' || array_length(v_rejected_programs, 1)::TEXT || ' programs were rejected'
        ELSE 
          NULL::TEXT
      END;
  EXCEPTION
    WHEN OTHERS THEN
      v_error := SQLERRM;
      -- Return partial success if some were saved
      IF v_count > 0 THEN
        RETURN QUERY SELECT 
          TRUE, 
          v_count, 
          v_program_ids, 
          v_recommendation_ids, 
          v_rejected_programs,
          'Partial success: ' || v_error;
      ELSE
        RETURN QUERY SELECT 
          FALSE, 
          0, 
          NULL::UUID[], 
          NULL::UUID[],
          v_rejected_programs,
          v_error;
      END IF;
  END;
END;
$$; 