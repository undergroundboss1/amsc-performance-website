-- =============================================================
-- AMSC Performance — Database Migration v5
-- =============================================================
-- Adds discount and partnership pricing fields to clients.
-- Rebuilds client_payment_summary view to use effective_price
-- (discounted / custom rate) instead of raw plan_price for
-- months_paid / months_owed / amount_owed calculations.
--
-- Effective price precedence:
--   1. custom_monthly_rate  — fully custom rate (partnership deals)
--   2. discount_percent > 0 — percentage off plan_price
--   3. plan_price           — standard rate (default)
--
-- Safe to re-run — IF NOT EXISTS / OR REPLACE throughout.
-- =============================================================

-- 1. New columns on clients
ALTER TABLE clients ADD COLUMN IF NOT EXISTS discount_percent    NUMERIC(5,2)  DEFAULT 0
  CHECK (discount_percent >= 0 AND discount_percent < 100);

ALTER TABLE clients ADD COLUMN IF NOT EXISTS custom_monthly_rate NUMERIC(10,2)
  CHECK (custom_monthly_rate > 0);

ALTER TABLE clients ADD COLUMN IF NOT EXISTS partnership_note    TEXT;

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_clients_discount_percent ON clients (discount_percent)
  WHERE discount_percent > 0;

-- 3. Rebuild client_payment_summary view with effective_price
DROP VIEW IF EXISTS client_payment_summary;
CREATE VIEW client_payment_summary AS
WITH payment_totals AS (
  SELECT
    client_id,
    COUNT(*)          AS payment_count,
    SUM(amount)       AS total_paid,
    SUM(rent_split)   AS total_rent,
    SUM(net_revenue)  AS total_net_revenue,
    MIN(payment_date) AS first_payment_date,
    MAX(payment_date) AS last_payment_date
  FROM payments
  GROUP BY client_id
),
-- Pre-compute effective_price per client so the expression isn't duplicated
client_pricing AS (
  SELECT
    id,
    plan_price,
    discount_percent,
    custom_monthly_rate,
    partnership_note,
    CASE
      WHEN custom_monthly_rate IS NOT NULL THEN custom_monthly_rate
      WHEN COALESCE(discount_percent, 0) > 0
        THEN ROUND(plan_price * (1 - COALESCE(discount_percent, 0) / 100), 2)
      ELSE plan_price
    END AS effective_price
  FROM clients
)
SELECT
  c.id                                                           AS client_id,
  c.full_name,
  c.email,
  c.selected_plan,
  c.plan_price,
  cp.discount_percent,
  cp.custom_monthly_rate,
  cp.partnership_note,
  cp.effective_price,
  c.payment_status,
  c.payment_provider,
  c.last_paid_at,
  c.training_start_date,

  -- Payment totals
  COALESCE(pt.payment_count, 0)                                  AS payment_count,
  COALESCE(pt.total_paid, 0)                                     AS total_paid,
  COALESCE(pt.total_rent, 0)                                     AS total_rent,
  COALESCE(pt.total_net_revenue, 0)                              AS total_net_revenue,
  pt.first_payment_date,
  pt.last_payment_date,

  -- Billing anchor
  COALESCE(c.training_start_date, pt.first_payment_date)         AS billing_anchor,

  -- Months enrolled
  CASE
    WHEN COALESCE(c.training_start_date, pt.first_payment_date) IS NULL THEN 0
    ELSE
      FLOOR(
        EXTRACT(EPOCH FROM (NOW() - COALESCE(c.training_start_date, pt.first_payment_date)))
        / (30 * 86400)
      )::INTEGER + 1
  END                                                            AS months_enrolled,

  -- Months paid = total_paid ÷ effective_price (rounded)
  CASE
    WHEN COALESCE(cp.effective_price, 0) > 0
    THEN ROUND(COALESCE(pt.total_paid, 0) / cp.effective_price)::INTEGER
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
      WHEN COALESCE(cp.effective_price, 0) > 0
      THEN ROUND(COALESCE(pt.total_paid, 0) / cp.effective_price)::INTEGER
      ELSE 0
    END
  )                                                              AS months_owed,

  -- Amount owed = months_owed × effective_price
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
        WHEN COALESCE(cp.effective_price, 0) > 0
        THEN ROUND(COALESCE(pt.total_paid, 0) / cp.effective_price)::INTEGER
        ELSE 0
      END
    ) * COALESCE(cp.effective_price, 0)
  )                                                              AS amount_owed

FROM clients c
JOIN client_pricing cp ON cp.id = c.id
LEFT JOIN payment_totals pt ON pt.client_id = c.id
ORDER BY c.created_at DESC;

-- =============================================================
-- DONE.
-- New columns: discount_percent, custom_monthly_rate, partnership_note
-- Rebuilt view: client_payment_summary (uses effective_price)
-- =============================================================
