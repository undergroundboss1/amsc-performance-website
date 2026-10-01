-- =============================================================
-- AMSC Performance — Database Migration v8
-- =============================================================
-- Adds client communication tracking, so day-to-day client comms
-- (booking, payment follow-up, training feedback) can be run by
-- Khivali from the admin portal and escalated to Arnold when a
-- conversation needs him.
--
-- The five statuses mirror the WhatsApp Business labels the same
-- conversations carry on the messaging side — one shared vocabulary
-- across both, so a chat labelled "Payment Follow-up" in WhatsApp
-- reads the same here.
--
-- NULL comms_status means "not in the queue" — the default for every
-- existing client. Nothing is backfilled: a client enters the queue
-- only when someone puts them there.
-- =============================================================

ALTER TABLE clients ADD COLUMN IF NOT EXISTS comms_status TEXT
  CHECK (comms_status IN ('new_lead', 'payment_follow_up', 'feedback', 'escalated', 'resolved'));

-- What needs to happen next, or why this was escalated. Free text —
-- whoever picks the conversation up next reads this first.
ALTER TABLE clients ADD COLUMN IF NOT EXISTS comms_note TEXT;

-- Only meaningful while comms_status = 'escalated'. The two triggers
-- Khivali escalates on, plus a catch-all. Cleared automatically when
-- the status moves off 'escalated' (see /api/admin/client-comms).
ALTER TABLE clients ADD COLUMN IF NOT EXISTS escalation_reason TEXT
  CHECK (escalation_reason IN ('technical_question', 'payment_dispute', 'other'));

-- Stamped by the API on every comms change — deliberately separate from
-- the table-wide updated_at, which any payment or plan edit also bumps.
-- Staleness in the queue means "nobody has touched this conversation",
-- not "nothing about this client changed".
ALTER TABLE clients ADD COLUMN IF NOT EXISTS comms_updated_at TIMESTAMPTZ;

ALTER TABLE clients ADD COLUMN IF NOT EXISTS comms_updated_by TEXT
  CHECK (comms_updated_by IN ('arnold', 'khivali', 'jenny'));

-- Partial index: the queue only ever reads rows that are in it, which
-- is a small slice of the table.
CREATE INDEX IF NOT EXISTS idx_clients_comms_status
  ON clients (comms_status) WHERE comms_status IS NOT NULL;

-- =============================================================
-- DONE. New columns on clients:
--   comms_status       TEXT  'new_lead' | 'payment_follow_up' | 'feedback'
--                            | 'escalated' | 'resolved' | NULL (not queued)
--   comms_note         TEXT  next action, or why it was escalated
--   escalation_reason  TEXT  'technical_question' | 'payment_dispute' | 'other'
--   comms_updated_at   TIMESTAMPTZ  last time the conversation was touched
--   comms_updated_by   TEXT  which admin touched it last
-- =============================================================
