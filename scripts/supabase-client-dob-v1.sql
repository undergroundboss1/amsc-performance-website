-- =============================================================
-- AMSC Performance — date of birth on client applications
-- =============================================================
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)
--
-- WHY THIS EXISTS:
-- The /join application form captures a date of birth so the admin portal can
-- show each client's age. Age is derived from this column rather than stored,
-- so it can never drift out of date the way a stored number would.
--
-- NULLABLE ON PURPOSE:
-- Every client who applied before this column existed has no DOB and never
-- will — the date isn't something we can infer or back-fill. A NOT NULL column
-- would have to invent a default, which would then be indistinguishable from a
-- real birth date. The admin UI shows those as "Not on file" instead.
-- =============================================================

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS date_of_birth DATE;

COMMENT ON COLUMN public.clients.date_of_birth IS
  'Captured on the /join application form. Null for clients who applied before the field existed, and for historical imports. Age is derived from this, never stored.';

-- =============================================================
-- DONE.
-- Verify with:
--   SELECT column_name, data_type, is_nullable
--   FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='clients' AND column_name='date_of_birth';
-- =============================================================
