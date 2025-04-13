-- Add last_pathway_response_id column to profiles table to store conversation state
ALTER TABLE "public"."profiles" 
ADD COLUMN IF NOT EXISTS "last_pathway_response_id" TEXT;

COMMENT ON COLUMN "public"."profiles"."last_pathway_response_id" IS 'Stores the last OpenAI response ID to maintain conversation history for pathway generation'; 