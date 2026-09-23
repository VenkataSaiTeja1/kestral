-- Create API keys table if it doesn't exist yet
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  openai_key TEXT,
  financial_modeling_prep_key TEXT,
  market_data_key TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create query results table if it doesn't exist yet
CREATE TABLE IF NOT EXISTS query_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  query_text TEXT NOT NULL,
  sql_query TEXT,
  result_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
