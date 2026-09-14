-- =============================================================
-- AMSC Performance — service_role grants for the camp & audit schemas
-- =============================================================
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)
--
-- WHY THIS EXISTS (the bug this fixes):
-- The camp and audit migrations both enabled RLS with zero policies and
-- noted "only service_role can read or write". That was half the story.
--
-- Two *separate* things have to be true before the API routes can touch a
-- table, and we only ever established the first:
--
--   1. RLS must not block the role.  service_role has BYPASSRLS, so it was
--      never blocked here. This part was always fine.
--   2. The role must hold ordinary SQL privileges (schema USAGE + table
--      grants). BYPASSRLS does NOT grant these — it only exempts a role
--      from row-level policies once it already has table access.
--
-- Supabase pre-grants (2) on the `public` schema for anon/authenticated/
-- service_role, which is why every pre-existing table "just worked" and
-- why the gap was invisible. Brand-new schemas get no such grants, and
-- adding a schema to Dashboard → Settings → API → Exposed schemas only
-- changes what PostgREST will *route* — it does not grant anything.
--
-- Net effect before this file: service_role had zero privileges on both
-- new schemas, so every camp and audit query through PostgREST failed with
-- "permission denied for schema". For audit that failure was silent —
-- logAdminAction() is deliberately non-fatal (lib/admin-audit.js) — so
-- admin actions kept succeeding while nothing was ever recorded, and the
-- Activity tab stayed permanently empty. The camp schema had the identical
-- defect; it simply hadn't surfaced yet because registration is still
-- closed and no real registration has ever been written.
--
-- WHY service_role ONLY (and not anon / authenticated):
-- Supabase's generic "custom schema" snippet grants all three roles. We
-- deliberately don't. Nothing in this codebase reads camp or audit data
-- with the anon key — both are only ever touched server-side through the
-- service-role client (getCampSupabase / getAuditSupabase in lib/supabase.js).
-- Granting only what is actually used keeps anon with no access path at
-- all, rather than relying on RLS alone to hold the line.
-- =============================================================

-- ---------- audit schema ----------
GRANT USAGE ON SCHEMA audit TO service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA audit TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA audit TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA audit TO service_role;

-- ---------- camp schema ----------
GRANT USAGE ON SCHEMA camp TO service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA camp TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA camp TO service_role;
-- Covers camp.confirm_registration / camp.promote_registration, called via
-- supabase.rpc() from the Paystack webhook and the admin camp routes.
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA camp TO service_role;

-- ---------- future objects ----------
-- The grants above only cover objects that exist right now. Without these
-- defaults, the next table added to either schema would silently reproduce
-- exactly this bug. Scoped to role postgres because that is the role every
-- migration in scripts/ runs as (SQL Editor and the Supabase API both
-- connect as postgres).
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA audit
  GRANT ALL PRIVILEGES ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA audit
  GRANT ALL PRIVILEGES ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA audit
  GRANT EXECUTE ON FUNCTIONS TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA camp
  GRANT ALL PRIVILEGES ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA camp
  GRANT ALL PRIVILEGES ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA camp
  GRANT EXECUTE ON FUNCTIONS TO service_role;

-- =============================================================
-- DONE.
-- Verify with:
--   SELECT has_schema_privilege('service_role','audit','USAGE'),
--          has_table_privilege('service_role','audit.admin_actions','INSERT'),
--          has_schema_privilege('service_role','camp','USAGE'),
--          has_table_privilege('service_role','camp.registrations','INSERT');
-- All four must return true.
-- =============================================================
