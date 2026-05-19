-- =============================================================
-- AMSC Performance — Database Migration v3
-- =============================================================
-- Fixes CHECK constraints that don't match production usage,
-- and documents columns that were added directly to Supabase
-- after v2 (webhook + cron code already writes to these).
--
-- Safe to re-run — all statements use IF NOT EXISTS / IF EXISTS.
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- =============================================================

-- 1. Add columns that the webhook + cron already write to
--    (already exist in production — ADD COLUMN IF NOT EXISTS is safe)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS last_paid_at              TIMESTAMPTZ;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS payment_reminder_sent_at  TIMESTAMPTZ;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS paystack_subscription_code TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS paystack_customer_code     TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS onboarding_email_sent_at  TIMESTAMPTZ;

-- 2. Fix payment_status CHECK constraint
--    v1 only allowed: pending, paid, failed, expired
--    Webhook writes: overdue, cancelled — these were rejected by the constraint
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_payment_status_check;
ALTER TABLE clients ADD CONSTRAINT clients_payment_status_check
  CHECK (payment_status IN ('pending', 'paid', 'failed', 'expired', 'overdue', 'cancelled'));

-- 3. Fix payment_provider CHECK constraint
--    v1 only allowed: intasend, paystack, NULL
--    M-Pesa route writes: paystack_mpesa — this was rejected by the constraint
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_payment_provider_check;
ALTER TABLE clients ADD CONSTRAINT clients_payment_provider_check
  CHECK (payment_provider IN ('intasend', 'paystack', 'paystack_mpesa', NULL));

-- 4. Training start date
--    Set by admin when a client begins training before their first payment.
--    When set, the billing cycle is anchored to this date rather than last_paid_at,
--    so pre-payment training days are factored into the next-due calculation.
ALTER TABLE clients ADD COLUMN IF NOT EXISTS training_start_date TIMESTAMPTZ;

-- 5. Indexes for new columns
CREATE INDEX IF NOT EXISTS idx_clients_last_paid_at        ON clients (last_paid_at);
CREATE INDEX IF NOT EXISTS idx_clients_payment_provider    ON clients (payment_provider);
CREATE INDEX IF NOT EXISTS idx_clients_training_start_date ON clients (training_start_date);

-- 5. Rebuild client_summary view with all columns
DROP VIEW IF EXISTS client_summary;
CREATE VIEW client_summary AS
SELECT
  id,
  full_name,
  email,
  phone,
  sport,
  training_goals,
  availability,
  health_info,
  selected_plan,
  plan_price,
  application_status,
  payment_status,
  payment_provider,
  payment_reference,
  last_paid_at,
  training_start_date,
  payment_reminder_sent_at,
  paystack_subscription_code,
  paystack_customer_code,
  onboarding_email_sent_at,
  trainerize_invited,
  notes,
  created_at,
  updated_at
FROM clients
ORDER BY created_at DESC;

-- =============================================================
-- DONE. Columns and constraints now match production behaviour.
-- =============================================================
