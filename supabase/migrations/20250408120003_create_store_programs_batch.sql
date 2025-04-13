-- Function to store multiple recommendation programs for a specific pathway
CREATE OR REPLACE FUNCTION public.store_programs_batch(
  p_user_id UUID,
  p_pathway_id UUID,
  p_vector_store_id TEXT,
  p_recommendations JSONB[]
)
RETURNS TABLE(
  success BOOLEAN,
  saved_count INTEGER,
  error TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_recommendation JSONB;
  v_recommendation_id UUID;
  v_count INTEGER := 0;
  v_error TEXT;
BEGIN
  -- Validate input parameters
  IF p_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 0, 'User ID is required';
    RETURN;
  END IF;

  IF p_pathway_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 0, 'Pathway ID is required';
    RETURN;
  END IF;
  
  -- Verify that the pathway belongs to the user
  IF NOT EXISTS (
    SELECT 1 FROM public.education_pathways 
    WHERE id = p_pathway_id AND user_id = p_user_id
  ) THEN
    RETURN QUERY SELECT FALSE, 0, 'Pathway not found or does not belong to the user';
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
      
      -- If successful, increment counter
      IF v_recommendation_id IS NOT NULL THEN
        v_count := v_count + 1;
      END IF;
    END LOOP;
    
    -- Mark the pathway as explored if we successfully saved at least one recommendation
    IF v_count > 0 THEN
      PERFORM public.update_pathway_explored_status(p_pathway_id, TRUE);
    END IF;
    
    -- Return success
    RETURN QUERY SELECT TRUE, v_count, NULL::TEXT;
  EXCEPTION
    WHEN OTHERS THEN
      v_error := SQLERRM;
      -- Return partial success if some were saved
      IF v_count > 0 THEN
        RETURN QUERY SELECT TRUE, v_count, 'Partial success: ' || v_error;
      ELSE
        RETURN QUERY SELECT FALSE, 0, v_error;
      END IF;
  END;
END;
$$; 