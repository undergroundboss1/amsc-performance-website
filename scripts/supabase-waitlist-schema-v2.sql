-- =============================================================
-- AMSC Performance — Waitlist Schema v2: marketing consent,
-- self-serve unsubscribe, confirmation email tracking
-- =============================================================
-- Run this in the Supabase SQL Editor AFTER supabase-waitlist-schema-v1.sql.
-- Safe to re-run: every statement is IF NOT EXISTS / idempotent.
--
-- WHAT THIS ADDS to waitlist.signups:
-- - marketing_consent       explicit, unticked "email me about this program"
--                           box. Required to join from v2 of the form on.
-- - other_marketing_opt_in  separate optional box for other AMSC programs.
-- - consented_at            when the consent above was given (or re-given).
-- - unsubscribe_token       random secret in every email's unsubscribe link.
--                           Possession of the link is what authorises the
--                           unsubscribe, so it is long and unguessable.
-- - unsubscribed_at         set when someone unsubscribes. The row is kept so
--                           there is a record of the opt-out, and so nobody
--                           is emailed again unless they re-join.
-- - confirmation_sent_at    when the "you're on the list" email went out.
--
-- Rows created before v2 (if any) get marketing_consent = FALSE: they joined
-- under the v1 wording without a tick box. Review them before emailing.
-- =============================================================

ALTER TABLE waitlist.signups
  ADD COLUMN IF NOT EXISTS marketing_consent      BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS other_marketing_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS consented_at           TIMESTAMPTZ,
  -- 64 hex chars from two v4 UUIDs (gen_random_uuid() is built into
  -- Postgres 13+, no extension needed). The API also generates its own
  -- token on insert; this default covers existing rows and manual inserts.
  ADD COLUMN IF NOT EXISTS unsubscribe_token      TEXT NOT NULL
    DEFAULT (replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')),
  ADD COLUMN IF NOT EXISTS unsubscribed_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS confirmation_sent_at   TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_waitlist_signups_unsubscribe_token
  ON waitlist.signups (unsubscribe_token);

-- Existing grants from v1 cover new columns (grants are table-level).

-- =============================================================
-- DONE.
-- Verify:
--   SELECT column_name FROM information_schema.columns
--    WHERE table_schema = 'waitlist' AND table_name = 'signups'
--      AND column_name IN ('marketing_consent','unsubscribe_token','unsubscribed_at');
--   -- expect 3 rows
--
-- Who can be emailed (consented and still subscribed):
--   SELECT first_name, email FROM waitlist.signups
--    WHERE program_slug = 'off-pitch'
--      AND marketing_consent AND unsubscribed_at IS NULL;
-- =============================================================
