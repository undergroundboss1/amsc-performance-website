-- =============================================================
-- AMSC Performance — Camp Registration Schema v2
-- =============================================================
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)
--
-- WHAT THIS DOES:
-- 1. Allows 'manual' as a camp.registrations.payment_method value, for
--    admin-recorded cash/bank-transfer camp payments — mirrors the
--    'manual_cash' / 'manual_bank_transfer' convention already used on
--    public.payments for regular client billing.
--
-- 2. FIXES A REAL BUG in camp.confirm_registration() (shipped in v1,
--    already live): it assigned the next slot as `paid_count + 1`, which
--    assumes slot numbers are always a contiguous 1..paid_count run. That
--    breaks the moment ANY registration is cancelled out of order — e.g.
--    cancel the athlete holding slot 1, paid_count drops to 19, so the
--    next confirmed payment computes slot 20 — which is still occupied by
--    an existing paid registrant, and the INSERT/UPDATE fails outright on
--    the (camp_id, slot_number) uniqueness constraint. Caught this via a
--    local test that cancelled a low-numbered slot before confirming a
--    new one — worth noting the earlier concurrency tests didn't exercise
--    this path (nothing was cancelled mid-test), so they passed cleanly
--    without covering it.
--
--    Fixed by introducing camp._next_free_slot() — finds the smallest
--    unused slot number in [1, capacity] via generate_series, correctly
--    handling gaps — and having BOTH confirm_registration() and the new
--    promote_registration() call the same helper, so this only needs to
--    be correct in one place.
--
-- 3. Creates camp.promote_registration() — moves a single 'waitlist'
--    registration to 'paid' when a slot has actually opened up (e.g. a
--    cancellation freed one). Deliberately separate from
--    confirm_registration(): that function is specifically the
--    payment-just-happened transition (pending -> paid/waitlist);
--    promoting is an admin decision made later on a row that's already
--    resolved once.
--
-- Safe to re-run — CHECK constraint replace and CREATE OR REPLACE FUNCTION
-- are both idempotent.
-- =============================================================

-- 1. Allow 'manual' payment method
ALTER TABLE camp.registrations DROP CONSTRAINT IF EXISTS registrations_payment_method_check;
ALTER TABLE camp.registrations ADD CONSTRAINT registrations_payment_method_check
  CHECK (payment_method IN ('paystack_card', 'paystack_mpesa', 'manual', NULL));

-- 1b. Clear slot_number whenever a registration is cancelled — enforced by
-- trigger, not left to every future caller to remember. Without this, the
-- raw (camp_id, slot_number) UNIQUE constraint still considers a cancelled
-- registrant's old slot "taken" even though camp._next_free_slot() (below)
-- correctly stops counting them toward capacity — the two disagree and the
-- next promotion/confirmation into that slot fails outright. Caught this
-- via local testing before it reached production.
CREATE OR REPLACE FUNCTION camp._clear_slot_on_cancel()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    NEW.slot_number := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS clear_slot_on_cancel ON camp.registrations;
CREATE TRIGGER clear_slot_on_cancel
  BEFORE UPDATE ON camp.registrations
  FOR EACH ROW
  EXECUTE FUNCTION camp._clear_slot_on_cancel();

-- 2. camp._next_free_slot() — internal helper, not meant to be called
-- directly by application code. Returns the smallest slot number in
-- [1, capacity] not currently held by a 'paid' registration in this camp,
-- or NULL if none is free (callers must check paid_count < capacity first;
-- NULL here signals a logic error elsewhere, not "camp is full").
CREATE OR REPLACE FUNCTION camp._next_free_slot(p_camp_id UUID, p_capacity INTEGER)
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
  SELECT MIN(t.slot)
  FROM generate_series(1, p_capacity) AS t(slot)
  WHERE t.slot NOT IN (
    SELECT slot_number FROM camp.registrations
    WHERE camp_id = p_camp_id AND status = 'paid' AND slot_number IS NOT NULL
  );
$$;

-- 3. camp.confirm_registration() — REPLACES the v1 version. Same
-- signature, same locking/idempotency behaviour, only the slot-assignment
-- line changed (now calls _next_free_slot() instead of paid_count + 1).
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
    v_next_slot := camp._next_free_slot(v_camp_id, v_capacity);
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

-- 4. camp.promote_registration() — admin-triggered waitlist promotion.
-- Only succeeds if the registration is currently 'waitlist' AND a slot is
-- actually free; otherwise returns the current status unchanged rather
-- than erroring, so the admin UI can show "no slots free" instead of a
-- crash.
--
-- Returns: 'paid' | 'waitlist' (unchanged — no slot available or wrong status)
CREATE OR REPLACE FUNCTION camp.promote_registration(
  p_registration_id UUID
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
  SELECT r.camp_id, r.status, c.capacity
    INTO v_camp_id, v_current_status, v_capacity
    FROM camp.registrations r
    JOIN camp.camps c ON c.id = r.camp_id
   WHERE r.id = p_registration_id
     FOR UPDATE OF r, c;

  IF v_camp_id IS NULL THEN
    RAISE EXCEPTION 'camp.promote_registration: registration % not found', p_registration_id;
  END IF;

  IF v_current_status != 'waitlist' THEN
    RETURN v_current_status;
  END IF;

  SELECT COUNT(*) INTO v_paid_count
    FROM camp.registrations
   WHERE camp_id = v_camp_id AND status = 'paid';

  IF v_paid_count < v_capacity THEN
    v_next_slot := camp._next_free_slot(v_camp_id, v_capacity);
    UPDATE camp.registrations
       SET status = 'paid', slot_number = v_next_slot, updated_at = NOW()
     WHERE id = p_registration_id;
    RETURN 'paid';
  ELSE
    RETURN 'waitlist';
  END IF;
END;
$$;

-- =============================================================
-- DONE.
-- payment_method now also accepts 'manual'
-- Fixed: camp.confirm_registration() slot-assignment bug
-- New: camp._next_free_slot(), camp.promote_registration()
-- =============================================================
