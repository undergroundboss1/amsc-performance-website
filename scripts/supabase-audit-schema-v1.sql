-- =============================================================
-- AMSC Performance — Admin Audit Trail Schema v1
-- =============================================================
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)
--
-- WHY THIS EXISTS:
-- Three people (Arnold, Khivali, Jenny) now share full admin privileges
-- across both regular client billing and camp registration data — each
-- with their own secret key (see lib/admin-auth.js), but all carrying
-- identical write access. This table answers "who did that, and when" —
-- across BOTH domains, from one shared admin portal.
--
-- WHAT THIS DOES:
-- 1. Creates a dedicated 'audit' schema — separate from both 'public'
--    (client/billing data) and 'camp' (camp registration data), so this
--    table can reference rows in either domain without re-coupling the
--    two schemas that were deliberately kept apart.
-- 2. Creates audit.admin_actions — one row per admin write action.
-- 3. Enables RLS with zero public policies — same security model as
--    every other table in this database. Only the service_role key
--    (used in API routes) can read or write.
--
-- AFTER RUNNING THIS FILE — MANUAL STEP REQUIRED:
--   Supabase Dashboard → Settings → API (or "Data API") → Exposed schemas
--   → add "audit"
--   Audit queries will fail with a schema-not-found error until this is done.
-- =============================================================

CREATE SCHEMA IF NOT EXISTS audit;

CREATE TABLE IF NOT EXISTS audit.admin_actions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Which of the three shared admin keys performed this action. A plain
  -- string, not a live credential reference — so deleting someone's key
  -- later never breaks the historical record of what they did.
  actor         TEXT NOT NULL CHECK (actor IN ('arnold', 'khivali', 'jenny')),

  -- Machine-readable action code, e.g. 'camp.mark_paid', 'client.update_payment'.
  -- The admin UI maps these to plain-English labels — see lib/admin-audit.js.
  action        TEXT NOT NULL,

  -- Which side of the (deliberately separated) data model this action
  -- touched — lets the UI filter camp activity from client-billing activity.
  domain        TEXT NOT NULL CHECK (domain IN ('camp', 'client')),

  -- The row this action affected. No foreign key constraint on purpose —
  -- it may point into public.clients, public.payments, camp.registrations,
  -- or camp.camps depending on `domain`/`action`, and a hard FK would
  -- require coupling this table to schemas that must stay independent.
  resource_id   UUID,

  -- Free-form context specific to the action, e.g. {"from_status": "pending",
  -- "to_status": "paid", "amount": 15000}. Whatever the calling route wants
  -- to record — no fixed shape, since actions vary widely.
  detail        JSONB,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_actions_actor      ON audit.admin_actions (actor);
CREATE INDEX IF NOT EXISTS idx_admin_actions_domain     ON audit.admin_actions (domain);
CREATE INDEX IF NOT EXISTS idx_admin_actions_resource_id ON audit.admin_actions (resource_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_created_at ON audit.admin_actions (created_at DESC);

ALTER TABLE audit.admin_actions ENABLE ROW LEVEL SECURITY;
-- No policies = no public access. Only service_role (used in API routes)
-- can touch this table — same model as clients, payments, camp.registrations.

-- =============================================================
-- DONE.
-- New schema: audit (not exposed until the manual dashboard step above)
-- New table: audit.admin_actions
-- =============================================================
