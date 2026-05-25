-- =============================================================
-- AMSC Performance — Database Migration v7
-- =============================================================
-- Adds client training status (active/inactive) with carry-over
-- credit support for mid-month billing pauses.
-- =============================================================

-- Core training status
ALTER TABLE clients ADD COLUMN IF NOT EXISTS training_status TEXT DEFAULT 'active'
  CHECK (training_status IN ('active', 'inactive'));

ALTER TABLE clients ADD COLUMN IF NOT EXISTS inactive_reason TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS inactive_since TIMESTAMPTZ;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS expected_return_date DATE;

-- Carry-over credit fields (admin-discretion, emergencies only)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS pause_credit_approved BOOLEAN DEFAULT false;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS pause_credit_days INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_clients_training_status ON clients (training_status);

-- =============================================================
-- DONE. New columns on clients:
--   training_status      TEXT    'active' | 'inactive'
--   inactive_reason      TEXT    free text or preset reason
--   inactive_since       TIMESTAMPTZ  auto-set by API on first pause
--   expected_return_date DATE    optional return estimate
--   pause_credit_approved BOOLEAN  admin marks credit approved
--   pause_credit_days    INTEGER  number of credit days to carry forward
-- =============================================================
