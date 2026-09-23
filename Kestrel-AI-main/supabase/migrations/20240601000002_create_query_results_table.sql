-- Create query results table to store historical queries and results
CREATE TABLE IF NOT EXISTS query_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  query_text TEXT NOT NULL,
  sql_query TEXT,
  result_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable row-level security
ALTER TABLE query_results ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Users can only see their own query results";
CREATE POLICY "Users can only see their own query results"
ON query_results FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own query results";
CREATE POLICY "Users can insert their own query results"
ON query_results FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Add to realtime publication
alter publication supabase_realtime add table query_results;
