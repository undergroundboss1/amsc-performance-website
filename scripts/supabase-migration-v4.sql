-- =============================================================
-- AMSC Performance — Database Migration v4
-- =============================================================
-- Creates the payments transaction log table and a
-- client_payment_summary view for accounting.
--
-- Rent split rule:
--   Online clients  → rent_split = 0  (no facility costs)
--   All others      → MIN(amount, 10000) × 0.40  (max KES 4,000)
--
-- Safe to re-run — all statements use IF NOT EXISTS / OR REPLACE.
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- =============================================================

-- 1. Payments transaction log
CREATE TABLE IF NOT EXISTS payments (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id             UUID        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  amount                NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  currency              TEXT        NOT NULL DEFAULT 'KES',
  payment_date          TIMESTAMPTZ NOT NULL,
  payment_method        TEXT        CHECK (payment_method IN (
                          'paystack_card', 'paystack_mpesa',
                          'manual_cash', 'manual_bank_transfer', 'other'
                        )),
  payment_reference     TEXT,                          -- Paystack reference or null for manual
  plan_id               TEXT,                          -- plan ID at time of payment
  plan_price            NUMERIC(10,2),                 -- plan price at time of payment
  months_covered        INTEGER     NOT NULL DEFAULT 1 CHECK (months_covered > 0),
  -- Rent split: online plan pays no rent; all others: MIN(amount, 10000) × 40%
  rent_split            NUMERIC(10,2) GENERATED ALWAYS AS (
                          CASE WHEN plan_id = 'online' THEN 0::NUMERIC
                          ELSE ROUND(LEAST(amount, 10000) * 0.40, 2)
                          END
                        ) STORED,
  net_revenue           NUMERIC(10,2) GENERATED ALWAYS AS (
                          CASE WHEN plan_id = 'online' THEN amount
                          ELSE ROUND(amount - LEAST(amount, 10000) * 0.40, 2)
                          END
                        ) STORED,
  notes                 TEXT,
  source                TEXT        NOT NULL DEFAULT 'webhook'
                          CHECK (source IN ('webhook', 'manual')),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_payments_client_id      ON payments (client_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date   ON payments (payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_payments_payment_ref    ON payments (payment_reference);
CREATE INDEX IF NOT EXISTS idx_payments_source         ON payments (source);

-- 3. Client payment summary view
--    Joins clients + payments to compute arrears, totals, and revenue per client.
--    months_enrolled = full 30-day periods since billing anchor + 1 (current period)
--    billing anchor  = training_start_date if set, else earliest payment date
CREATE OR REPLACE VIEW client_payment_summary AS
WITH payment_totals AS (
  SELECT
    client_id,
    COUNT(*)                       AS payment_count,
    SUM(amount)                    AS total_paid,
    SUM(rent_split)                AS total_rent,
    SUM(net_revenue)               AS total_net_revenue,
    MIN(payment_date)              AS first_payment_date,
    MAX(payment_date)              AS last_payment_date
  FROM payments
  GROUP BY client_id
)
SELECT
  c.id                                                          AS client_id,
  c.full_name,
  c.email,
  c.selected_plan,
  c.plan_price,
  c.payment_status,
  c.payment_provider,
  c.last_paid_at,
  c.training_start_date,

  -- Payment totals
  COALESCE(pt.payment_count, 0)                                 AS payment_count,
  COALESCE(pt.total_paid, 0)                                    AS total_paid,
  COALESCE(pt.total_rent, 0)                                    AS total_rent,
  COALESCE(pt.total_net_revenue, 0)                             AS total_net_revenue,
  pt.first_payment_date,
  pt.last_payment_date,

  -- Billing anchor: training_start_date if set, else first payment date
  COALESCE(c.training_start_date, pt.first_payment_date)        AS billing_anchor,

  -- Months enrolled (number of full 30-day periods since anchor + 1 for current)
  CASE
    WHEN COALESCE(c.training_start_date, pt.first_payment_date) IS NULL THEN 0
    ELSE
      FLOOR(
        EXTRACT(EPOCH FROM (NOW() - COALESCE(c.training_start_date, pt.first_payment_date)))
        / (30 * 86400)
      )::INTEGER + 1
  END                                                            AS months_enrolled,

  -- Months paid = total paid ÷ plan price (rounded)
  CASE
    WHEN COALESCE(c.plan_price, 0) > 0
    THEN ROUND(COALESCE(pt.total_paid, 0) / c.plan_price)::INTEGER
    ELSE 0
  END                                                            AS months_paid,

  -- Months owed = MAX(0, months_enrolled − months_paid)
  GREATEST(
    0,
    CASE
      WHEN COALESCE(c.training_start_date, pt.first_payment_date) IS NULL THEN 0
      ELSE
        FLOOR(
          EXTRACT(EPOCH FROM (NOW() - COALESCE(c.training_start_date, pt.first_payment_date)))
          / (30 * 86400)
        )::INTEGER + 1
    END
    -
    CASE
      WHEN COALESCE(c.plan_price, 0) > 0
      THEN ROUND(COALESCE(pt.total_paid, 0) / c.plan_price)::INTEGER
      ELSE 0
    END
  )                                                              AS months_owed,

  -- Amount owed = months_owed × plan_price
  GREATEST(0,
    GREATEST(
      0,
      CASE
        WHEN COALESCE(c.training_start_date, pt.first_payment_date) IS NULL THEN 0
        ELSE
          FLOOR(
            EXTRACT(EPOCH FROM (NOW() - COALESCE(c.training_start_date, pt.first_payment_date)))
            / (30 * 86400)
          )::INTEGER + 1
      END
      -
      CASE
        WHEN COALESCE(c.plan_price, 0) > 0
        THEN ROUND(COALESCE(pt.total_paid, 0) / c.plan_price)::INTEGER
        ELSE 0
      END
    ) * COALESCE(c.plan_price, 0)
  )                                                              AS amount_owed

FROM clients c
LEFT JOIN payment_totals pt ON pt.client_id = c.id
ORDER BY c.created_at DESC;

-- =============================================================
-- DONE.
-- New table: payments
-- New view:  client_payment_summary
-- =============================================================
