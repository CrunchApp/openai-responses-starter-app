-- Description: Add a server-side function for saving recommendation files without auth checks
-- This fixes an issue where the vector store syncing can't save file IDs after the pathways refactoring

-- Create a new function specifically for server-side use that doesn't perform auth checks
CREATE OR REPLACE FUNCTION public.save_recommendation_file_server(
  p_recommendation_id UUID,
  p_file_id TEXT,
  p_file_name TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record_id UUID;
BEGIN  
  -- First check if the record already exists
  SELECT id INTO v_record_id
  FROM public.recommendation_files
  WHERE recommendation_id = p_recommendation_id AND file_id = p_file_id;
  
  -- If it exists, update it
  IF v_record_id IS NOT NULL THEN
    UPDATE public.recommendation_files
    SET file_name = p_file_name,
        updated_at = now()
    WHERE id = v_record_id;
    
    RETURN v_record_id;
  END IF;
  
  -- If not, insert a new record
  INSERT INTO public.recommendation_files(
    recommendation_id,
    file_id,
    file_name
  ) VALUES (
    p_recommendation_id,
    p_file_id,
    p_file_name
  )
  RETURNING id INTO v_record_id;
  
  RETURN v_record_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.save_recommendation_file_server TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_recommendation_file_server TO service_role;

COMMENT ON FUNCTION public.save_recommendation_file_server IS 'Server-side function to save recommendation file information without auth checks. To be used by server actions only.'; 