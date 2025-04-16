-- Add new fields to enhance profile for recommendations

-- Migration file: adding location, nationality, study level, and language proficiency fields
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS current_location TEXT,
ADD COLUMN IF NOT EXISTS nationality TEXT,
ADD COLUMN IF NOT EXISTS target_study_level TEXT,
ADD COLUMN IF NOT EXISTS language_proficiency JSONB[];

-- Add comment to explain purpose of columns
COMMENT ON COLUMN public.profiles.current_location IS 'User''s current geographic location';
COMMENT ON COLUMN public.profiles.nationality IS 'User''s nationality or citizenship';
COMMENT ON COLUMN public.profiles.target_study_level IS 'Level of study the user is aiming for';
COMMENT ON COLUMN public.profiles.language_proficiency IS 'Array of language proficiency objects with language, level, test type, and score';

-- The preferences field already exists as JSONB, so we don't need to add it separately
-- The extract-from-documents route will now populate these fields from documents

-- Update timestamp when this migration runs
UPDATE public.profiles 
SET updated_at = NOW()
WHERE current_location IS NULL 
AND nationality IS NULL 
AND target_study_level IS NULL 
AND language_proficiency IS NULL; 