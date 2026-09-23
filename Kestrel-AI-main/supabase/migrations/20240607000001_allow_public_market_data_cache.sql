-- Yahoo Finance market data is public and the app can be used without auth.
ALTER TABLE company_data_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access to company_data_cache" ON company_data_cache;
CREATE POLICY "Public read access to company_data_cache"
  ON company_data_cache FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Public insert access to company_data_cache" ON company_data_cache;
CREATE POLICY "Public insert access to company_data_cache"
  ON company_data_cache FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public update access to company_data_cache" ON company_data_cache;
CREATE POLICY "Public update access to company_data_cache"
  ON company_data_cache FOR UPDATE
  USING (true)
  WITH CHECK (true);