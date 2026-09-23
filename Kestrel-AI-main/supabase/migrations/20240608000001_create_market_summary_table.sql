-- Create a flat market_summary table to store live comparison data per company
-- This enables proper SQL queries against structured columns instead of JSONB arrays

CREATE TABLE IF NOT EXISTS market_summary (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  symbol TEXT NOT NULL UNIQUE,
  yahoo_symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  current_price NUMERIC(12, 4),
  previous_close NUMERIC(12, 4),
  change_percent NUMERIC(8, 4),
  fifty_two_week_high NUMERIC(12, 4),
  fifty_two_week_low NUMERIC(12, 4),
  volume BIGINT,
  currency TEXT,
  exchange TEXT,
  source TEXT DEFAULT 'Yahoo Finance',
  fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookups by symbol
CREATE INDEX IF NOT EXISTS market_summary_symbol_idx ON market_summary (symbol);
CREATE INDEX IF NOT EXISTS market_summary_current_price_idx ON market_summary (current_price DESC);
CREATE INDEX IF NOT EXISTS market_summary_change_percent_idx ON market_summary (change_percent DESC);

-- Enable Row Level Security
ALTER TABLE market_summary ENABLE ROW LEVEL SECURITY;

-- Public read access (app works without login)
DROP POLICY IF EXISTS "Public read access to market_summary" ON market_summary;
CREATE POLICY "Public read access to market_summary"
  ON market_summary FOR SELECT
  USING (true);

-- Public insert access
DROP POLICY IF EXISTS "Public insert access to market_summary" ON market_summary;
CREATE POLICY "Public insert access to market_summary"
  ON market_summary FOR INSERT
  WITH CHECK (true);

-- Public update access
DROP POLICY IF EXISTS "Public update access to market_summary" ON market_summary;
CREATE POLICY "Public update access to market_summary"
  ON market_summary FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE market_summary;
