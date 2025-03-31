-- Migration: Add profile_file_id column to profiles table
-- Description: Adds a column to store the OpenAI Vector Store file ID for user profiles

-- Add profile_file_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'profile_file_id'
    ) THEN
        ALTER TABLE public.profiles
        ADD COLUMN profile_file_id text;
        
        COMMENT ON COLUMN public.profiles.profile_file_id IS 'Stores the OpenAI Vector Store file ID for the user''s profile JSON file';
    END IF;
END
$$; 