-- Update query_results table to handle larger result sets
ALTER TABLE IF EXISTS query_results
ALTER COLUMN result_data TYPE jsonb;

-- Add index for faster query retrieval
CREATE INDEX IF NOT EXISTS idx_query_results_user_id ON query_results(user_id);
CREATE INDEX IF NOT EXISTS idx_query_results_created_at ON query_results(created_at);
