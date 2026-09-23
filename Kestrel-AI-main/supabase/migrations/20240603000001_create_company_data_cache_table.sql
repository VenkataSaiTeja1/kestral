-- Create company_data_cache table for storing enriched financial data
CREATE TABLE IF NOT EXISTS company_data_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  symbol TEXT NOT NULL UNIQUE,
  data JSONB NOT NULL,
  cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on symbol for faster lookups
CREATE INDEX IF NOT EXISTS company_data_cache_symbol_idx ON company_data_cache (symbol);

-- Enable row level security
ALTER TABLE company_data_cache ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to select data
DROP POLICY IF EXISTS "Authenticated users can select company_data_cache" ON company_data_cache;
CREATE POLICY "Authenticated users can select company_data_cache"
  ON company_data_cache
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policy for authenticated users to insert data
DROP POLICY IF EXISTS "Authenticated users can insert company_data_cache" ON company_data_cache;
CREATE POLICY "Authenticated users can insert company_data_cache"
  ON company_data_cache
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create policy for authenticated users to update their own data
DROP POLICY IF EXISTS "Authenticated users can update company_data_cache" ON company_data_cache;
CREATE POLICY "Authenticated users can update company_data_cache"
  ON company_data_cache
  FOR UPDATE
  TO authenticated
  USING (true);

-- Enable realtime for this table
alter publication supabase_realtime add table company_data_cache;
