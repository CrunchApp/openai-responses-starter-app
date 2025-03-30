-- -----------------------------------------------------------------------------
-- Migration: Add Profile Delete Policy
-- 
-- Description: 
-- This migration adds a policy allowing authenticated users to delete their own profiles.
-- The policy was missing, which prevented users from deleting their profiles.
--
-- Date: 2025-03-30
-- -----------------------------------------------------------------------------

-- First ensure we drop any existing policy with this name to avoid conflicts
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;

-- Add the delete policy
CREATE POLICY "Users can delete their own profile"
ON public.profiles
FOR DELETE
TO authenticated
USING (auth.uid() = id);

-- Ensure the policy is added to recommendations table as well
DROP POLICY IF EXISTS "Users can delete their own recommendations" ON public.recommendations;

CREATE POLICY "Users can delete their own recommendations"
ON public.recommendations
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Log the change for audit purposes
COMMENT ON POLICY "Users can delete their own profile" ON public.profiles IS 
'Allow authenticated users to delete their own profile records. Added 2025-03-30.';

COMMENT ON POLICY "Users can delete their own recommendations" ON public.recommendations IS 
'Allow authenticated users to delete their own recommendation records. Added 2025-03-30.'; 