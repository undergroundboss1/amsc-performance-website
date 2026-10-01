-- =============================================================
-- AMSC Performance — Waitlist Schema v3: WhatsApp number
-- =============================================================
-- Run this in the Supabase SQL Editor AFTER v1 and v2.
-- Safe to re-run: idempotent.
--
-- Adds waitlist.signups.whatsapp_number, stored in E.164 (+254712345678) —
-- the API normalises local formats like 0712 345 678 before saving
-- (lib/waitlist-phone.js). Required on the form from consent version
-- off-pitch-v3 on; nullable here so rows created before v3 stay valid.
--
-- Apply this BEFORE deploying the code that writes the column, or signups
-- will fail with an unknown-column error.
-- =============================================================

ALTER TABLE waitlist.signups
  ADD COLUMN IF NOT EXISTS whatsapp_number TEXT
    CHECK (whatsapp_number IS NULL OR whatsapp_number ~ '^\+[1-9][0-9]{7,14}$');

-- Existing grants from v1 cover new columns (grants are table-level).

-- =============================================================
-- Numbers to add to the WhatsApp community (consented, not unsubscribed):
--   SELECT first_name, whatsapp_number FROM waitlist.signups
--    WHERE program_slug = 'off-pitch' AND marketing_consent
--      AND unsubscribed_at IS NULL AND whatsapp_number IS NOT NULL
--    ORDER BY created_at;
--
-- Numbers to REMOVE from the community (unsubscribed):
--   SELECT first_name, whatsapp_number, unsubscribed_at FROM waitlist.signups
--    WHERE program_slug = 'off-pitch' AND unsubscribed_at IS NOT NULL
--      AND whatsapp_number IS NOT NULL;
-- =============================================================
