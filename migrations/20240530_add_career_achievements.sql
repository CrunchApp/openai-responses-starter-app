-- Add support for achievements in career_goals JSONB

-- Migration to update existing profiles to include an empty achievements field in career_goals
-- Note: career_goals is a JSONB column so we need to use jsonb_set to update it

-- Using jsonb_set for all profiles that have career_goals data
UPDATE public.profiles
SET career_goals = 
  CASE 
    WHEN career_goals IS NULL THEN '{"achievements": ""}'::jsonb
    WHEN jsonb_typeof(career_goals) = 'object' THEN 
      jsonb_set(career_goals, '{achievements}', '""', true)
    ELSE 
      career_goals -- Leave unchanged if not an object
  END
WHERE career_goals IS NULL OR jsonb_typeof(career_goals) = 'object';

-- Add comment to explain the update
COMMENT ON COLUMN public.profiles.career_goals IS 'Career goals including short-term, long-term plans, achievements, desired industry and roles';

-- Update timestamp for modified records
UPDATE public.profiles 
SET updated_at = NOW()
WHERE career_goals ? 'achievements'; 