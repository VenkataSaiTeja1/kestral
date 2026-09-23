-- Enable row-level security on tables
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE query_results ENABLE ROW LEVEL SECURITY;

-- For api_keys table
DROP POLICY IF EXISTS "Users can only see their own API keys" ON api_keys;
CREATE POLICY "Users can only see their own API keys"
ON api_keys FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can only update their own API keys" ON api_keys;
CREATE POLICY "Users can only update their own API keys"
ON api_keys FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can only insert their own API keys" ON api_keys;
CREATE POLICY "Users can only insert their own API keys"
ON api_keys FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- For query_results table
DROP POLICY IF EXISTS "Users can only see their own query results" ON query_results;
CREATE POLICY "Users can only see their own query results"
ON query_results FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can only insert their own query results" ON query_results;
CREATE POLICY "Users can only insert their own query results"
ON query_results FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Add to realtime publication
alter publication supabase_realtime add table api_keys;
alter publication supabase_realtime add table query_results;
