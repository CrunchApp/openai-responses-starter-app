-- Add feedback-related columns to the recommendations table
ALTER TABLE recommendations
ADD COLUMN IF NOT EXISTS feedback_negative BOOLEAN,
ADD COLUMN IF NOT EXISTS feedback_reason TEXT,
ADD COLUMN IF NOT EXISTS feedback_submitted_at TIMESTAMPTZ;

-- Create an index on feedback_negative for faster queries
CREATE INDEX IF NOT EXISTS idx_recommendations_feedback_negative ON recommendations(feedback_negative);

-- Comment on columns to document their purpose
COMMENT ON COLUMN recommendations.feedback_negative IS 'Whether negative feedback has been provided for this recommendation';
COMMENT ON COLUMN recommendations.feedback_reason IS 'The reason given for negative feedback (e.g., "interest", "cost", "location", "requirements")';
COMMENT ON COLUMN recommendations.feedback_submitted_at IS 'Timestamp when feedback was submitted'; 