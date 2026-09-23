-- Create a table to cache S&P 500 companies data
CREATE TABLE IF NOT EXISTS sp500_companies (
  id SERIAL PRIMARY KEY,
  symbol TEXT NOT NULL,
  name TEXT,
  sector TEXT,
  industry TEXT,
  market_cap NUMERIC,
  dividend_yield NUMERIC,
  price NUMERIC,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(symbol)
);

-- Enable RLS but allow all operations for now
ALTER TABLE sp500_companies ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Public read access" ON sp500_companies;
CREATE POLICY "Public read access"
  ON sp500_companies FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Auth users can insert" ON sp500_companies;
CREATE POLICY "Auth users can insert"
  ON sp500_companies FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Auth users can update" ON sp500_companies;
CREATE POLICY "Auth users can update"
  ON sp500_companies FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Enable realtime
alter publication supabase_realtime add table sp500_companies;