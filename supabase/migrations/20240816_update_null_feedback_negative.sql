-- Migration: Set default for feedback_negative and update NULLs
BEGIN;

-- Add a default constraint to feedback_negative
ALTER TABLE public.recommendations
ALTER COLUMN feedback_negative SET DEFAULT FALSE;

-- Update existing NULL values in feedback_negative to FALSE
UPDATE public.recommendations
SET feedback_negative = FALSE
WHERE feedback_negative IS NULL;

-- Optional: Add a NOT NULL constraint if appropriate for your logic
-- ALTER TABLE public.recommendations
-- ALTER COLUMN feedback_negative SET NOT NULL;

COMMIT; 