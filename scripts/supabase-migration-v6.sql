-- =============================================================
-- AMSC Performance — Database Migration v6
-- =============================================================
-- Adds 'import' as a valid source value on the payments table
-- to support bulk historical payment imports.
-- =============================================================

ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_source_check;
ALTER TABLE payments ADD CONSTRAINT payments_source_check
  CHECK (source IN ('webhook', 'manual', 'import'));

-- =============================================================
-- DONE. payments.source now accepts: webhook | manual | import
-- =============================================================
