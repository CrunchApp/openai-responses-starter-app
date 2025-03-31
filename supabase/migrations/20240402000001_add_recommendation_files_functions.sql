-- Migration: Add functions for managing recommendation files
-- Description: Creates Supabase functions to manage recommendation file tracking.

-- Function to save multiple recommendation file IDs in a batch
CREATE OR REPLACE FUNCTION public.save_recommendation_file_ids(
  p_user_id UUID,
  p_file_mappings JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recommendation_id UUID;
  v_file_id TEXT;
  v_file_name TEXT;
  v_result JSONB := '{"success": true, "saved_count": 0}'::JSONB;
  v_item JSONB;
BEGIN
  -- Validate that the user exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found', 'saved_count', 0);
  END IF;
  
  -- Process each item in the mappings array
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_file_mappings)
  LOOP
    -- Extract values from the item
    v_recommendation_id := (v_item->>'recommendation_id')::UUID;
    v_file_id := v_item->>'file_id';
    v_file_name := v_item->>'file_name';
    
    -- Check if this recommendation belongs to the user
    IF NOT EXISTS (
      SELECT 1 
      FROM recommendations 
      WHERE id = v_recommendation_id AND user_id = p_user_id
    ) THEN
      CONTINUE; -- Skip this item if user doesn't own the recommendation
    END IF;
    
    -- Delete any existing entries for this recommendation
    DELETE FROM recommendation_files 
    WHERE recommendation_id = v_recommendation_id;
    
    -- Insert the new mapping
    INSERT INTO recommendation_files (
      recommendation_id, 
      file_id, 
      file_name
    ) VALUES (
      v_recommendation_id,
      v_file_id,
      v_file_name
    )
    ON CONFLICT (recommendation_id, file_id) 
    DO NOTHING;
    
    -- Increment saved count
    v_result := jsonb_set(
      v_result, 
      '{saved_count}', 
      to_jsonb((v_result->>'saved_count')::INT + 1)
    );
  END LOOP;
  
  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Error saving recommendation file mappings: ' || SQLERRM,
      'saved_count', (v_result->>'saved_count')::INT
    );
END;
$$;

-- Function to get file IDs for a set of recommendations
CREATE OR REPLACE FUNCTION public.get_recommendation_file_ids(
  p_user_id UUID,
  p_recommendation_ids UUID[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Verify the user owns these recommendations
  IF NOT EXISTS (
    SELECT 1 
    FROM recommendations 
    WHERE id = ANY(p_recommendation_ids) AND user_id = p_user_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'No matching recommendations found');
  END IF;
  
  -- Get the file mappings
  SELECT jsonb_agg(
    jsonb_build_object(
      'recommendation_id', rf.recommendation_id,
      'file_id', rf.file_id,
      'file_name', rf.file_name
    )
  )
  INTO v_result
  FROM recommendation_files rf
  JOIN recommendations r ON rf.recommendation_id = r.id
  WHERE r.user_id = p_user_id
  AND rf.recommendation_id = ANY(p_recommendation_ids);
  
  RETURN jsonb_build_object(
    'success', true,
    'files', COALESCE(v_result, '[]'::JSONB)
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', 'Error retrieving recommendation file IDs: ' || SQLERRM);
END;
$$;

-- Function to delete file mappings for a recommendation
CREATE OR REPLACE FUNCTION public.delete_recommendation_file_mappings(
  p_user_id UUID,
  p_recommendation_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_count INT;
  v_file_ids JSONB;
BEGIN
  -- Get the file IDs before deleting (so we can return them)
  SELECT jsonb_agg(file_id)
  INTO v_file_ids
  FROM recommendation_files rf
  JOIN recommendations r ON rf.recommendation_id = r.id
  WHERE r.user_id = p_user_id
  AND rf.recommendation_id = p_recommendation_id;
  
  -- Delete the mappings
  DELETE FROM recommendation_files
  WHERE recommendation_id = p_recommendation_id
  AND recommendation_id IN (
    SELECT id FROM recommendations WHERE user_id = p_user_id
  )
  RETURNING COUNT(*) INTO v_deleted_count;
  
  -- Return success with the deleted file IDs
  RETURN jsonb_build_object(
    'success', true,
    'deleted_count', v_deleted_count,
    'file_ids', COALESCE(v_file_ids, '[]'::JSONB)
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', 'Error deleting recommendation file mappings: ' || SQLERRM);
END;
$$;

-- Add comments
COMMENT ON FUNCTION public.save_recommendation_file_ids(UUID, JSONB) IS 'Saves file ID mappings for multiple recommendations in a batch';
COMMENT ON FUNCTION public.get_recommendation_file_ids(UUID, UUID[]) IS 'Gets file IDs for a set of recommendations';
COMMENT ON FUNCTION public.delete_recommendation_file_mappings(UUID, UUID) IS 'Deletes file mappings for a recommendation'; 