-- Function to delete a pathway and optionally its associated recommendations
CREATE OR REPLACE FUNCTION public.delete_pathway(
  p_user_id UUID,
  p_pathway_id UUID,
  p_delete_recommendations BOOLEAN DEFAULT TRUE
)
RETURNS TABLE(
  success BOOLEAN,
  deleted_pathway BOOLEAN,
  deleted_recommendations_count INTEGER,
  error TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pathway_exists BOOLEAN;
  v_deleted_recommendations_count INTEGER := 0;
BEGIN
  -- Check if the pathway exists and belongs to the user
  SELECT EXISTS(
    SELECT 1 
    FROM public.education_pathways 
    WHERE id = p_pathway_id 
    AND user_id = p_user_id
  ) INTO v_pathway_exists;
  
  IF NOT v_pathway_exists THEN
    RETURN QUERY SELECT FALSE, FALSE, 0, 'Pathway not found or does not belong to the user';
    RETURN;
  END IF;
  
  -- If requested, delete associated recommendations
  IF p_delete_recommendations THEN
    -- First collect ids of recommendations to delete
    WITH recommendation_ids AS (
      SELECT id FROM public.recommendations
      WHERE pathway_id = p_pathway_id
    ),
    -- Delete recommendation files mappings
    delete_files AS (
      DELETE FROM public.recommendation_files
      WHERE recommendation_id IN (SELECT id FROM recommendation_ids)
      RETURNING file_id
    ),
    -- Count deleted recommendations
    deleted_recommendations AS (
      DELETE FROM public.recommendations
      WHERE pathway_id = p_pathway_id
      RETURNING id
    )
    SELECT COUNT(*) INTO v_deleted_recommendations_count
    FROM deleted_recommendations;
  ELSE
    -- Just set pathway_id to NULL in recommendations
    UPDATE public.recommendations
    SET pathway_id = NULL
    WHERE pathway_id = p_pathway_id;
    
    -- Count affected rows
    GET DIAGNOSTICS v_deleted_recommendations_count = ROW_COUNT;
  END IF;
  
  -- Delete the pathway
  DELETE FROM public.education_pathways
  WHERE id = p_pathway_id AND user_id = p_user_id;
  
  -- Return results
  RETURN QUERY SELECT TRUE, TRUE, v_deleted_recommendations_count, NULL::TEXT;
EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE, FALSE, 0, 'Error in delete_pathway: ' || SQLERRM;
END;
$$;

-- Function to delete all pathways and their recommendations for a user
CREATE OR REPLACE FUNCTION public.delete_user_pathways(
  p_user_id UUID,
  p_delete_recommendations BOOLEAN DEFAULT TRUE
)
RETURNS TABLE(
  success BOOLEAN,
  deleted_pathways_count INTEGER,
  deleted_recommendations_count INTEGER,
  error TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_pathways_count INTEGER := 0;
  v_deleted_recommendations_count INTEGER := 0;
BEGIN
  -- If requested, delete all associated recommendations
  IF p_delete_recommendations THEN
    -- First collect ids of recommendations to delete
    WITH recommendation_ids AS (
      SELECT r.id
      FROM public.recommendations r
      JOIN public.education_pathways p ON r.pathway_id = p.id
      WHERE p.user_id = p_user_id
    ),
    -- Delete recommendation files mappings
    delete_files AS (
      DELETE FROM public.recommendation_files
      WHERE recommendation_id IN (SELECT id FROM recommendation_ids)
      RETURNING file_id
    ),
    -- Count deleted recommendations
    deleted_recommendations AS (
      DELETE FROM public.recommendations
      WHERE id IN (SELECT id FROM recommendation_ids)
      RETURNING id
    )
    SELECT COUNT(*) INTO v_deleted_recommendations_count
    FROM deleted_recommendations;
  ELSE
    -- Just set pathway_id to NULL in recommendations
    UPDATE public.recommendations
    SET pathway_id = NULL
    WHERE pathway_id IN (
      SELECT id FROM public.education_pathways
      WHERE user_id = p_user_id
    );
    
    -- Count affected rows
    GET DIAGNOSTICS v_deleted_recommendations_count = ROW_COUNT;
  END IF;
  
  -- Delete the pathways
  WITH deleted_pathways AS (
    DELETE FROM public.education_pathways
    WHERE user_id = p_user_id
    RETURNING id
  )
  SELECT COUNT(*) INTO v_deleted_pathways_count
  FROM deleted_pathways;
  
  -- Return results
  RETURN QUERY SELECT TRUE, v_deleted_pathways_count, v_deleted_recommendations_count, NULL::TEXT;
EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE, v_deleted_pathways_count, v_deleted_recommendations_count, 
      'Error in delete_user_pathways: ' || SQLERRM;
END;
$$; 