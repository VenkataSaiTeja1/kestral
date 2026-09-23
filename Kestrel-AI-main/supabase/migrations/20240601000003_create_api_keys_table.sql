-- Create API keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  openai_key TEXT,
  financial_modeling_prep_key TEXT,
  market_data_key TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable row-level security
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Users can only see their own API keys" ON api_keys;
CREATE POLICY "Users can only see their own API keys"
ON api_keys FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own API keys" ON api_keys;
CREATE POLICY "Users can insert their own API keys"
ON api_keys FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own API keys" ON api_keys;
CREATE POLICY "Users can update their own API keys"
ON api_keys FOR UPDATE
USING (auth.uid() = user_id);

-- Add to realtime publication
alter publication supabase_realtime add table api_keys;