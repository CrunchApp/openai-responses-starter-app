-- Update store_programs_batch function to also return recommendation IDs
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
  error TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_recommendation JSONB;
  v_recommendation_id UUID;
  v_program_ids UUID[] := '{}';
  v_recommendation_ids UUID[] := '{}';
  v_count INTEGER := 0;
  v_error TEXT;
BEGIN
  -- Validate input parameters
  IF p_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 0, NULL::UUID[], NULL::UUID[], 'User ID is required';
    RETURN;
  END IF;

  IF p_pathway_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 0, NULL::UUID[], NULL::UUID[], 'Pathway ID is required';
    RETURN;
  END IF;
  
  -- Verify that the pathway belongs to the user
  IF NOT EXISTS (
    SELECT 1 FROM public.education_pathways 
    WHERE id = p_pathway_id AND user_id = p_user_id
  ) THEN
    RETURN QUERY SELECT FALSE, 0, NULL::UUID[], NULL::UUID[], 'Pathway not found or does not belong to the user';
    RETURN;
  END IF;

  -- Process each recommendation
  BEGIN
    FOREACH v_recommendation IN ARRAY p_recommendations
    LOOP
      -- Call store_recommendation for each one
      v_recommendation_id := public.store_recommendation(
        p_user_id, 
        p_vector_store_id, 
        v_recommendation,
        p_pathway_id
      );
      
      -- If successful, increment counter and store IDs
      IF v_recommendation_id IS NOT NULL THEN
        v_count := v_count + 1;
        
        -- Store the recommendation ID
        v_recommendation_ids := array_append(v_recommendation_ids, v_recommendation_id);
        
        -- Get program_id for this recommendation and add to array
        DECLARE
          v_program_id UUID;
        BEGIN
          SELECT program_id INTO v_program_id 
          FROM recommendations 
          WHERE id = v_recommendation_id;
          
          IF v_program_id IS NOT NULL THEN
            v_program_ids := array_append(v_program_ids, v_program_id);
          END IF;
        END;
      END IF;
    END LOOP;
    
    -- Mark the pathway as explored if we successfully saved at least one recommendation
    IF v_count > 0 THEN
      PERFORM public.update_pathway_explored_status(p_pathway_id, TRUE);
    END IF;
    
    -- Return success with both program IDs and recommendation IDs
    RETURN QUERY SELECT TRUE, v_count, v_program_ids, v_recommendation_ids, NULL::TEXT;
  EXCEPTION
    WHEN OTHERS THEN
      v_error := SQLERRM;
      -- Return partial success if some were saved
      IF v_count > 0 THEN
        RETURN QUERY SELECT TRUE, v_count, v_program_ids, v_recommendation_ids, 'Partial success: ' || v_error;
      ELSE
        RETURN QUERY SELECT FALSE, 0, NULL::UUID[], NULL::UUID[], v_error;
      END IF;
  END;
END;
$$; 