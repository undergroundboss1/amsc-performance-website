-- =============================================================
-- AMSC Performance — Database Migration v9
-- =============================================================
-- Stores the monthly rent statement AMSC sends to the landlord (TTF).
--
-- WHY THIS IS A TABLE AND NOT JUST AN EXPORT:
-- The sheet is built from that month's payments, but it is not purely
-- derived from them. The commissionable amount is a judgement — a client
-- who paid for three months at once, or who used the facility for only
-- part of the month, does not commission on the full figure. Arnold edits
-- those rows before the sheet goes to TTF, and those edits have to survive
-- a page refresh, be visible to Khivali and Jenny, and still be there next
-- year when someone asks what we actually paid in June.
--
-- The rows are stored as they were sent, not recomputed on read. A payment
-- edited or deleted months later must not silently rewrite a statement that
-- was already paid against.
-- =============================================================

CREATE TABLE IF NOT EXISTS ttf_statements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The month the statement covers, as the first day of it (2026-06-01).
  -- One statement per month: re-opening the month loads the saved one.
  month           DATE NOT NULL UNIQUE,

  -- The line items exactly as they will appear in the sheet:
  -- [{ name, monthsPaid, totalPaid, commissionable }]
  -- TSG / TTF / AMSC columns are derived from commissionable and are not
  -- stored — they are formulas in the exported file, so TTF can audit them.
  rows            JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- The per-client ceiling on the commissionable amount, in KES. Stored per
  -- statement rather than hardcoded: it is a term of the arrangement with
  -- the landlord, and a term can be renegotiated without old statements
  -- retroactively changing.
  commissionable_cap NUMERIC(10,2) NOT NULL DEFAULT 10000,

  -- Split percentages, likewise stored so a past statement still explains
  -- its own figures if the deal changes.
  tsg_percent     NUMERIC(5,4) NOT NULL DEFAULT 0.25,
  ttf_percent     NUMERIC(5,4) NOT NULL DEFAULT 0.15,

  -- Filled in after the transfer: the M-Pesa / bank reference and when it
  -- was sent. Both null until it is actually paid.
  payment_reference TEXT,
  paid_at         TIMESTAMPTZ,

  notes           TEXT,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by      TEXT CHECK (updated_by IN ('arnold', 'khivali', 'jenny'))
);

-- Same posture as every other table here: RLS on, zero policies, so only
-- the service_role key used by the API routes can read or write it.
ALTER TABLE ttf_statements ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_ttf_statements_month ON ttf_statements (month DESC);

-- Reuse the existing timestamp trigger function (scripts/supabase-setup.sql).
DROP TRIGGER IF EXISTS set_ttf_statements_updated_at ON ttf_statements;
CREATE TRIGGER set_ttf_statements_updated_at
  BEFORE UPDATE ON ttf_statements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =============================================================
-- DONE. One row per month:
--   month               DATE     first day of the month covered (unique)
--   rows                JSONB    [{name, monthsPaid, totalPaid, commissionable}]
--   commissionable_cap  NUMERIC  per-client ceiling, default KES 10,000
--   tsg_percent         NUMERIC  0.25
--   ttf_percent         NUMERIC  0.15
--   payment_reference   TEXT     transfer reference, once paid
--   paid_at             TIMESTAMPTZ
-- =============================================================
