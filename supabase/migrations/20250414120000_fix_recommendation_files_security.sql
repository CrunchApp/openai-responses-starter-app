-- Migration: Fix RLS issue with recommendation_files table
-- Description: Create a SECURITY DEFINER function to safely insert records into recommendation_files

-- Create a function to save recommendation file IDs with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.save_recommendation_file(
  p_recommendation_id UUID,
  p_file_id TEXT,
  p_file_name TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER -- This lets the function bypass RLS
AS $$
DECLARE
  v_user_id UUID;
  v_record_id UUID;
BEGIN
  -- Verify the recommendation belongs to the calling user
  SELECT user_id INTO v_user_id 
  FROM public.recommendations 
  WHERE id = p_recommendation_id;
  
  -- Validate that the recommendation exists and belongs to a user
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Recommendation not found or does not belong to a user';
  END IF;
  
  -- Check if current user has permission to access this recommendation
  IF v_user_id != auth.uid() AND NOT (SELECT rolsuper FROM pg_roles WHERE rolname = current_user) THEN
    RAISE EXCEPTION 'You do not have permission to access this recommendation';
  END IF;
  
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

-- Grant appropriate permissions
GRANT EXECUTE ON FUNCTION public.save_recommendation_file(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_recommendation_file(UUID, TEXT, TEXT) TO service_role;

