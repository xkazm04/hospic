-- Exchange rates cache for lazy-refresh from ECB (via Frankfurter API)
-- Stores EUR-based rates for CZK and PLN, refreshed once per day on first access

CREATE TABLE exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency TEXT NOT NULL DEFAULT 'EUR',
  target_currency TEXT NOT NULL,
  rate DECIMAL(12,6) NOT NULL,
  effective_date DATE NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(base_currency, target_currency)
);

-- RLS
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read exchange_rates" ON exchange_rates FOR SELECT USING (true);
CREATE POLICY "Public write exchange_rates" ON exchange_rates FOR ALL USING (true) WITH CHECK (true);
