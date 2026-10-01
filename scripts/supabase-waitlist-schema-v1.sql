-- =============================================================
-- AMSC Performance — Waitlist Schema v1
-- =============================================================
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)
--
-- WHAT THIS DOES:
-- 1. Creates a dedicated 'waitlist' schema, separate from 'public'
--    (clients/payments), 'camp' and 'audit'. Waitlist signups are
--    marketing leads, not clients — kept apart the same way camp data is.
-- 2. Creates waitlist.signups — one row per person per program. Reusable
--    for every future program (AMSC Off Court, …): the program is a column,
--    not a table, and program copy/options live in lib/waitlists.js.
-- 3. Duplicate protection in the database itself: UNIQUE (program_slug,
--    email) with email forced to lowercase, so the same person joining
--    twice (double tap, second visit) can never create a second row.
-- 4. Enables RLS with zero policies and grants service_role only — same
--    model as every other table here, and it includes the grants that
--    supabase-schema-grants-v1.sql had to add after the fact for camp/audit.
--
-- AFTER RUNNING THIS FILE — MANUAL STEP REQUIRED:
--   Supabase Dashboard → Settings → API (or "Data API") → Exposed schemas
--   → add "waitlist"
--   Signups will fail with a schema-not-found error until this is done.
--
-- Safe to re-run: every statement is IF NOT EXISTS / idempotent.
-- =============================================================

CREATE SCHEMA IF NOT EXISTS waitlist;

CREATE TABLE IF NOT EXISTS waitlist.signups (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Which program's waitlist — a key in lib/waitlists.js, e.g. 'off-pitch'.
  program_slug          TEXT NOT NULL CHECK (program_slug ~ '^[a-z0-9-]{2,40}$'),

  -- Contact
  first_name            TEXT NOT NULL CHECK (char_length(first_name) BETWEEN 1 AND 60),
  email                 TEXT NOT NULL CHECK (email = lower(email) AND char_length(email) <= 254),
  instagram_handle      TEXT CHECK (instagram_handle IS NULL OR instagram_handle ~ '^[a-z0-9._]{1,30}$'),

  -- Audience profile. Values are validated against the program's option
  -- lists in the API (lib/validators.js), not here, so a future program
  -- with different positions needs no migration.
  position              TEXT NOT NULL,
  level                 TEXT NOT NULL,
  age_band              TEXT NOT NULL,
  -- Room for program-specific questions later without a schema change.
  extra                 JSONB NOT NULL DEFAULT '{}'::jsonb,

  early_access_opt_in   BOOLEAN NOT NULL DEFAULT FALSE,

  -- Consent: the version of the wording shown at signup (lib/waitlists.js),
  -- and for under-18 age bands, the parent/guardian confirmation.
  consent_text_version  TEXT NOT NULL,
  guardian_consent      BOOLEAN,

  -- Attribution (lib/waitlist-source.js). Only the derived category and the
  -- referrer HOST are stored — no IP address, no full user agent, no full URL.
  source                TEXT NOT NULL DEFAULT 'direct',
  utm_source            TEXT,
  utm_medium            TEXT,
  utm_campaign          TEXT,
  utm_content           TEXT,
  referrer_host         TEXT,
  in_app_browser        TEXT,
  country               TEXT CHECK (country IS NULL OR country ~ '^[A-Z]{2}$'),

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (program_slug, email)
);

CREATE INDEX IF NOT EXISTS idx_waitlist_signups_program_created
  ON waitlist.signups (program_slug, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_waitlist_signups_program_source
  ON waitlist.signups (program_slug, source);

-- =============================================================
-- Row Level Security — blocks ALL public/anon access
-- =============================================================
ALTER TABLE waitlist.signups ENABLE ROW LEVEL SECURITY;
-- No policies = no public access. Only service_role (used in API routes)
-- can touch this table.

-- =============================================================
-- Grants — service_role only (see supabase-schema-grants-v1.sql for why
-- BYPASSRLS alone is not enough on a new schema, and why anon/authenticated
-- are deliberately left out).
-- =============================================================
GRANT USAGE ON SCHEMA waitlist TO service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA waitlist TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA waitlist TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA waitlist
  GRANT ALL PRIVILEGES ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA waitlist
  GRANT ALL PRIVILEGES ON SEQUENCES TO service_role;

-- =============================================================
-- DONE.
-- New schema: waitlist (not exposed until the manual dashboard step above)
-- New table:  waitlist.signups
--
-- Verify (both must return true):
--   SELECT has_schema_privilege('service_role','waitlist','USAGE'),
--          has_table_privilege('service_role','waitlist.signups','INSERT');
--
-- Useful queries:
--   -- Count by source for Off Pitch
--   SELECT source, count(*) FROM waitlist.signups
--    WHERE program_slug = 'off-pitch' GROUP BY 1 ORDER BY 2 DESC;
--
--   -- Deletion request (Kenya DPA right to erasure)
--   DELETE FROM waitlist.signups WHERE email = lower('person@example.com');
-- =============================================================
