-- Migration: 018_batch_imports.sql
-- Persistent storage for batch import sessions so users can resume across sessions.
--
-- batch_imports: one row per import session (file upload or test run)
-- batch_import_rows: one row per spreadsheet row, with raw + extracted data

-- ==========================================================================
-- 1. batch_imports table
-- ==========================================================================

CREATE TABLE IF NOT EXISTS batch_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name TEXT NOT NULL,
  total_rows INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'processing'
    CHECK (status IN ('processing', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE batch_imports IS 'Batch import sessions for spreadsheet-based product extraction';

CREATE INDEX IF NOT EXISTS idx_batch_imports_status
  ON batch_imports(status);

CREATE INDEX IF NOT EXISTS idx_batch_imports_created
  ON batch_imports(created_at DESC);

-- ==========================================================================
-- 2. batch_import_rows table
-- ==========================================================================

CREATE TABLE IF NOT EXISTS batch_import_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_import_id UUID NOT NULL REFERENCES batch_imports(id) ON DELETE CASCADE,
  row_index INTEGER NOT NULL,
  raw_data JSONB NOT NULL DEFAULT '{}',
  extracted_data JSONB,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'extracted', 'accepted', 'skipped', 'error')),
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE batch_import_rows IS 'Individual rows within a batch import, with raw and extracted product data';

CREATE INDEX IF NOT EXISTS idx_batch_import_rows_batch
  ON batch_import_rows(batch_import_id);

CREATE INDEX IF NOT EXISTS idx_batch_import_rows_status
  ON batch_import_rows(batch_import_id, status);

-- ==========================================================================
-- 3. RLS policies — allow full access via anon key (single-user app)
-- ==========================================================================

ALTER TABLE batch_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_import_rows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to batch_imports"
  ON batch_imports FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all access to batch_import_rows"
  ON batch_import_rows FOR ALL
  USING (true)
  WITH CHECK (true);

-- ==========================================================================
-- 4. Updated_at trigger
-- ==========================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER batch_imports_updated_at
  BEFORE UPDATE ON batch_imports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER batch_import_rows_updated_at
  BEFORE UPDATE ON batch_import_rows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
