-- Create education_pathways table
CREATE TABLE IF NOT EXISTS public.education_pathways (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  title TEXT NOT NULL,
  qualification_type TEXT NOT NULL,
  field_of_study TEXT NOT NULL,
  subfields TEXT[] DEFAULT '{}',
  target_regions TEXT[] DEFAULT '{}',
  budget_range_usd JSONB NOT NULL DEFAULT '{"min": 0, "max": 0}',
  duration_months JSONB NOT NULL DEFAULT '{"min": 0, "max": 0}',
  alignment_rationale TEXT,
  alternatives TEXT[] DEFAULT '{}',
  query_string TEXT,
  user_feedback JSONB,
  is_explored BOOLEAN NOT NULL DEFAULT false,
  last_explored_at TIMESTAMPTZ
);

-- Create index on user_id
CREATE INDEX idx_education_pathways_user_id ON public.education_pathways(user_id);

-- Add pathway_id column to recommendations table if it doesn't exist
ALTER TABLE public.recommendations ADD COLUMN IF NOT EXISTS pathway_id UUID REFERENCES public.education_pathways(id) ON DELETE SET NULL;

-- Create index on pathway_id
CREATE INDEX idx_recommendations_pathway_id ON public.recommendations(pathway_id);

-- Enable Row Level Security
ALTER TABLE public.education_pathways ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Allow users to select their own pathways
CREATE POLICY "Users can view their own pathways" 
  ON public.education_pathways 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Allow users to insert their own pathways
CREATE POLICY "Users can insert their own pathways" 
  ON public.education_pathways 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own pathways
CREATE POLICY "Users can update their own pathways" 
  ON public.education_pathways 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Allow users to delete their own pathways
CREATE POLICY "Users can delete their own pathways" 
  ON public.education_pathways 
  FOR DELETE 
  USING (auth.uid() = user_id); 