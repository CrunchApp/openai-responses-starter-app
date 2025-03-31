-- Migration: Add recommendation_files table to track OpenAI Vector Store file IDs
-- Description: Creates a new table to maintain a mapping between recommendation IDs and their corresponding OpenAI file IDs.

-- Create the recommendation_files table
CREATE TABLE public.recommendation_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recommendation_id UUID NOT NULL REFERENCES public.recommendations(id) ON DELETE CASCADE,
    file_id TEXT NOT NULL,
    file_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Add a unique constraint to ensure we don't have duplicate entries
    UNIQUE(recommendation_id, file_id)
);

-- Add RLS policies for the new table
ALTER TABLE public.recommendation_files ENABLE ROW LEVEL SECURITY;

-- Policy allowing users to select their own recommendation files
CREATE POLICY recommendation_files_select_policy ON public.recommendation_files
    FOR SELECT
    USING (
        recommendation_id IN (
            SELECT r.id 
            FROM public.recommendations r 
            WHERE r.user_id = auth.uid()
        )
    );

-- Policy allowing users to insert their own recommendation files
CREATE POLICY recommendation_files_insert_policy ON public.recommendation_files
    FOR INSERT
    WITH CHECK (
        recommendation_id IN (
            SELECT r.id 
            FROM public.recommendations r 
            WHERE r.user_id = auth.uid()
        )
    );

-- Policy allowing users to update their own recommendation files
CREATE POLICY recommendation_files_update_policy ON public.recommendation_files
    FOR UPDATE
    USING (
        recommendation_id IN (
            SELECT r.id 
            FROM public.recommendations r 
            WHERE r.user_id = auth.uid()
        )
    )
    WITH CHECK (
        recommendation_id IN (
            SELECT r.id 
            FROM public.recommendations r 
            WHERE r.user_id = auth.uid()
        )
    );

-- Policy allowing users to delete their own recommendation files
CREATE POLICY recommendation_files_delete_policy ON public.recommendation_files
    FOR DELETE
    USING (
        recommendation_id IN (
            SELECT r.id 
            FROM public.recommendations r 
            WHERE r.user_id = auth.uid()
        )
    );

-- Add comments to the table and columns
COMMENT ON TABLE public.recommendation_files IS 'Tracks the mapping between recommendation IDs and their corresponding OpenAI Vector Store file IDs';
COMMENT ON COLUMN public.recommendation_files.id IS 'Primary key for the recommendation_files table';
COMMENT ON COLUMN public.recommendation_files.recommendation_id IS 'Foreign key reference to the recommendations table';
COMMENT ON COLUMN public.recommendation_files.file_id IS 'OpenAI Vector Store file ID';
COMMENT ON COLUMN public.recommendation_files.file_name IS 'Name of the file in the OpenAI Vector Store';
COMMENT ON COLUMN public.recommendation_files.created_at IS 'Timestamp when the record was created';
COMMENT ON COLUMN public.recommendation_files.updated_at IS 'Timestamp when the record was last updated';

-- Create a trigger to update the updated_at column
CREATE TRIGGER set_recommendation_files_updated_at
BEFORE UPDATE ON public.recommendation_files
FOR EACH ROW
EXECUTE FUNCTION public.update_timestamp(); 