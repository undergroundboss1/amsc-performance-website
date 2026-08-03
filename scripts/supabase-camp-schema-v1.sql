-- =============================================================
-- AMSC Performance — Camp Registration Schema v1
-- =============================================================
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)
--
-- WHAT THIS DOES:
-- 1. Creates a dedicated 'camp' schema, fully separate from 'public'
--    (where clients/payments/athlete_results live). Camp registration
--    data must never mix with regular AMSC client-intake data — this
--    is enforced by the database, not by naming convention.
-- 2. Creates camp.camps (one row per camp — reusable for future camps,
--    not just The Next Level Camp) and camp.registrations (one row per
--    athlete sign-up).
-- 3. Creates camp.confirm_registration(), an atomic, race-safe function
--    that assigns the next available slot or waitlists — called from the
--    Paystack webhook once a camp payment succeeds. This is what keeps
--    a burst of simultaneous payments (a WhatsApp/Instagram push) from
--    over-filling a capacity-capped camp.
-- 4. Enables RLS with zero public policies — same security model as
--    every other table in this database. Only the service_role key
--    (used in API routes) can read or write.
-- 5. Seeds the first camp: The Next Level Camp (PBA Kenya × AMSC).
--
-- AFTER RUNNING THIS FILE — MANUAL STEP REQUIRED:
--   Supabase Dashboard → Settings → API → Exposed schemas → add "camp"
--   Camp queries will fail with a schema-not-found error until this is done.
-- =============================================================

CREATE SCHEMA IF NOT EXISTS camp;

-- =============================================================
-- 1. camp.camps — one row per camp
-- =============================================================
CREATE TABLE IF NOT EXISTS camp.camps (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                TEXT NOT NULL UNIQUE,
  name                TEXT NOT NULL,
  tagline             TEXT,
  co_host_name        TEXT,               -- e.g. 'PBA Kenya'; NULL = AMSC-only camp
  starts_on           DATE NOT NULL,
  ends_on             DATE NOT NULL,
  venue               TEXT,
  age_min             INTEGER NOT NULL CHECK (age_min > 0),
  age_max             INTEGER NOT NULL CHECK (age_max >= age_min),
  capacity            INTEGER NOT NULL CHECK (capacity > 0),
  price_kes           INTEGER NOT NULL CHECK (price_kes > 0),
  currency            TEXT NOT NULL DEFAULT 'KES',
  registration_open   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_camps_updated_at
  BEFORE UPDATE ON camp.camps
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- =============================================================
-- 2. camp.registrations — one row per athlete registration
-- =============================================================
CREATE TABLE IF NOT EXISTS camp.registrations (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_id                UUID NOT NULL REFERENCES camp.camps(id) ON DELETE CASCADE,

  -- Athlete
  athlete_name           TEXT NOT NULL,
  athlete_dob            DATE NOT NULL,
  athlete_gender         TEXT NOT NULL CHECK (athlete_gender IN ('male', 'female')),
  school                 TEXT,

  -- Parent / guardian
  guardian_name           TEXT NOT NULL,
  guardian_phone          TEXT NOT NULL,
  guardian_email          TEXT NOT NULL,

  -- Emergency contact — may duplicate guardian info if the same person
  emergency_name          TEXT NOT NULL,
  emergency_phone         TEXT NOT NULL,

  medical_notes            TEXT,

  -- Consent — stored as explicit, separate, auditable flags. This camp is
  -- used for marketing/case-study content, so consent_media is not boilerplate
  -- and must never be folded into a generic notes field.
  consent_participation    BOOLEAN NOT NULL,
  consent_media            BOOLEAN NOT NULL,
  consent_text_version     TEXT NOT NULL,   -- snapshot of the exact wording agreed to

  -- Registration / payment status
  status                   TEXT NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending', 'paid', 'waitlist', 'cancelled')),
  slot_number              INTEGER,          -- assigned only once status = 'paid'
  payment_reference        TEXT,
  payment_method           TEXT CHECK (payment_method IN ('paystack_card', 'paystack_mpesa', NULL)),
  amount_paid              NUMERIC(10,2),
  paid_at                  TIMESTAMPTZ,

  -- Takeaway materials magic link (same pattern as clients.approval_token)
  access_token             TEXT NOT NULL UNIQUE,

  -- Set by admin after Day 1 testing, once a combine report exists for this athlete
  athlete_result_id        UUID,

  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Backstop behind confirm_registration()'s row locking below. NULLs (every
  -- non-paid row) are not considered equal by Postgres, so this only constrains
  -- actual assigned slots, never blocks multiple pending/waitlisted rows.
  UNIQUE (camp_id, slot_number)
);

CREATE INDEX IF NOT EXISTS idx_camp_registrations_camp_id           ON camp.registrations (camp_id);
CREATE INDEX IF NOT EXISTS idx_camp_registrations_status            ON camp.registrations (status);
CREATE INDEX IF NOT EXISTS idx_camp_registrations_access_token      ON camp.registrations (access_token);
CREATE INDEX IF NOT EXISTS idx_camp_registrations_payment_reference ON camp.registrations (payment_reference);
CREATE INDEX IF NOT EXISTS idx_camp_registrations_guardian_email    ON camp.registrations (guardian_email);

CREATE TRIGGER set_registrations_updated_at
  BEFORE UPDATE ON camp.registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- =============================================================
-- 3. camp.confirm_registration() — atomic slot assignment
-- =============================================================
-- Called once, from the Paystack webhook's camp branch, after a charge.success
-- event for a camp registration. Locks the specific camp row so concurrent
-- confirmations for the SAME camp serialize here — this is what makes a burst
-- of simultaneous payments safe instead of a capacity-count race.
--
-- Idempotent: if the registration is already 'paid' or 'waitlist' (a webhook
-- retry, or Paystack redelivering the same event), it returns the existing
-- status without reassigning a slot or re-running payment bookkeeping.
--
-- Returns: 'paid' | 'waitlist'
CREATE OR REPLACE FUNCTION camp.confirm_registration(
  p_registration_id   UUID,
  p_payment_reference TEXT,
  p_payment_method    TEXT,
  p_amount_paid       NUMERIC
) RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_camp_id         UUID;
  v_current_status  TEXT;
  v_capacity        INTEGER;
  v_paid_count      INTEGER;
  v_next_slot       INTEGER;
BEGIN
  -- Lock both the registration and its camp row up front. Locking the camp
  -- row is what serializes different registrations racing for the same camp;
  -- locking the registration row guards against a duplicate webhook delivery
  -- for this exact registration arriving concurrently.
  SELECT r.camp_id, r.status, c.capacity
    INTO v_camp_id, v_current_status, v_capacity
    FROM camp.registrations r
    JOIN camp.camps c ON c.id = r.camp_id
   WHERE r.id = p_registration_id
     FOR UPDATE OF r, c;

  IF v_camp_id IS NULL THEN
    RAISE EXCEPTION 'camp.confirm_registration: registration % not found', p_registration_id;
  END IF;

  IF v_current_status IN ('paid', 'waitlist') THEN
    RETURN v_current_status;
  END IF;

  SELECT COUNT(*) INTO v_paid_count
    FROM camp.registrations
   WHERE camp_id = v_camp_id AND status = 'paid';

  IF v_paid_count < v_capacity THEN
    v_next_slot := v_paid_count + 1;
    UPDATE camp.registrations
       SET status             = 'paid',
           slot_number        = v_next_slot,
           payment_reference  = p_payment_reference,
           payment_method     = p_payment_method,
           amount_paid        = p_amount_paid,
           paid_at            = NOW(),
           updated_at         = NOW()
     WHERE id = p_registration_id;
    RETURN 'paid';
  ELSE
    UPDATE camp.registrations
       SET status             = 'waitlist',
           payment_reference  = p_payment_reference,
           payment_method     = p_payment_method,
           amount_paid        = p_amount_paid,
           paid_at            = NOW(),
           updated_at         = NOW()
     WHERE id = p_registration_id;
    RETURN 'waitlist';
  END IF;
END;
$$;

-- =============================================================
-- 4. Row Level Security — blocks ALL public/anon access
-- =============================================================
ALTER TABLE camp.camps         ENABLE ROW LEVEL SECURITY;
ALTER TABLE camp.registrations ENABLE ROW LEVEL SECURITY;
-- No policies = no public access. Only service_role (used in API routes)
-- can touch these tables — same model as clients, payments, athlete_results.

-- =============================================================
-- 5. Seed: The Next Level Camp (PBA Kenya × AMSC Performance)
-- =============================================================
INSERT INTO camp.camps (
  slug, name, tagline, co_host_name,
  starts_on, ends_on, venue,
  age_min, age_max, capacity, price_kes, currency, registration_open
) VALUES (
  'next-level-camp',
  'The Next Level Camp',
  'Stop Working Out, Start Leveling Up.',
  'PBA Kenya',
  '2026-08-19', '2026-08-21',
  'Parklands Sports Club, Nairobi (+ Ngong Hills, Day 2)',
  13, 18, 20, 15000, 'KES', TRUE
)
ON CONFLICT (slug) DO NOTHING;

-- =============================================================
-- DONE.
-- New schema: camp (not exposed until the manual dashboard step above)
-- New tables: camp.camps, camp.registrations
-- New function: camp.confirm_registration()
-- Seeded: 1 camp row — slug 'next-level-camp'
-- =============================================================
