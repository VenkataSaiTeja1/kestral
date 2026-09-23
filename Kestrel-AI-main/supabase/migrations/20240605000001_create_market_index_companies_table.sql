-- Create a table to store market index companies data
CREATE TABLE IF NOT EXISTS market_index_companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  sector TEXT,
  industry TEXT,
  market_cap NUMERIC,
  dividend_yield NUMERIC,
  price NUMERIC,
  index_name TEXT NOT NULL,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(symbol, index_name)
);

-- Enable row level security
ALTER TABLE market_index_companies ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Public read access" ON market_index_companies;
CREATE POLICY "Public read access"
  ON market_index_companies FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Auth insert access" ON market_index_companies;
CREATE POLICY "Auth insert access"
  ON market_index_companies FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Auth update access" ON market_index_companies;
CREATE POLICY "Auth update access"
  ON market_index_companies FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Enable realtime
alter publication supabase_realtime add table market_index_companies;
