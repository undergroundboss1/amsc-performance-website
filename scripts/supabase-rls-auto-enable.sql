-- =============================================================
-- AMSC Performance — RLS Safety Net (ensure_rls)
-- =============================================================
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)
--
-- WHY THIS FILE EXISTS:
-- This safety net was already live on the production database, but it had
-- never been written down — it was created directly through the Supabase
-- dashboard, so unlike every other piece of this schema it had no file
-- describing it. Rebuilding the database from scripts/ (a new environment,
-- a staging copy, disaster recovery) would have silently produced a
-- database WITHOUT it, and nothing would have reported the gap.
--
-- WHAT IT DOES:
-- Every table in this database is created with Row Level Security enabled
-- and zero policies — the "nobody reads this from a browser, only the
-- service_role key in our API routes can touch it" model that
-- supabase-setup.sql establishes and every schema file since has followed.
--
-- That model only holds if EVERY table gets RLS. This trigger removes the
-- chance of forgetting: it fires at the end of any CREATE TABLE in the
-- public schema and enables RLS on the new table immediately. A table
-- created without RLS is protected before the next statement runs.
--
-- NOTE ON THE SUPABASE SECURITY LINTER:
-- The linter flags rls_auto_enable under
-- "Public Can Execute SECURITY DEFINER Function", because anon and
-- authenticated hold EXECUTE on it. It is not reachable that way: the
-- function returns `event_trigger`, and Postgres refuses to run those
-- outside the trigger system —
--
--   SELECT public.rls_auto_enable();
--   ERROR: 0A000: trigger functions can only be called as triggers
--
-- so there is no path from an anonymous request to executing it. The
-- search_path is also pinned to pg_catalog below, which closes the usual
-- way a SECURITY DEFINER function gets hijacked. Revoking EXECUTE from
-- PUBLIC/anon/authenticated would silence the warning and break nothing —
-- event triggers fire through the trigger system, not through EXECUTE
-- grants — but it is cosmetic, not a fix.
--
-- This file reproduces what is live on the production project as of
-- 2026-09-18. Re-running it is safe: the function is CREATE OR REPLACE,
-- and the trigger is dropped and recreated. Note that on a live database
-- the drop/recreate leaves a brief window with no safety net, so prefer
-- running it when no DDL is happening.
-- =============================================================

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
  RETURNS event_trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  -- Pinned: a SECURITY DEFINER function with a mutable search_path can be
  -- hijacked by whoever runs the DDL that fires it.
  SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table', 'partitioned table')
  LOOP
    IF cmd.schema_name IS NOT NULL
       AND cmd.schema_name IN ('public')
       AND cmd.schema_name NOT IN ('pg_catalog', 'information_schema')
       AND cmd.schema_name NOT LIKE 'pg_toast%'
       AND cmd.schema_name NOT LIKE 'pg_temp%'
    THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        -- Never let this abort the CREATE TABLE that fired it. A failure
        -- here is logged and the table is left as-is rather than the
        -- migration blowing up half-applied.
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
    ELSE
      RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)',
        cmd.object_identity, cmd.schema_name;
    END IF;
  END LOOP;
END;
$function$;

-- The 'camp' and 'audit' schemas are deliberately NOT in the enforced list
-- above. Their tables are created with RLS explicitly enabled by their own
-- schema files (supabase-camp-schema-v1.sql, supabase-audit-schema-v1.sql).
-- Widening this trigger to cover them would be reasonable hardening, but it
-- is a behaviour change from what is currently live, so it is left alone
-- here — this file's job is to capture what exists, not to alter it.

DROP EVENT TRIGGER IF EXISTS ensure_rls;

CREATE EVENT TRIGGER ensure_rls
  ON ddl_command_end
  WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  EXECUTE FUNCTION public.rls_auto_enable();

-- =============================================================
-- VERIFY (expect one row: ensure_rls | ddl_command_end | O):
--
--   SELECT evtname, evtevent, evtenabled, evttags
--   FROM pg_event_trigger WHERE evtname = 'ensure_rls';
--
-- And that it actually works — this table should come out with
-- relrowsecurity = true without anyone asking:
--
--   CREATE TABLE public._rls_check (id int);
--   SELECT relrowsecurity FROM pg_class WHERE relname = '_rls_check';
--   DROP TABLE public._rls_check;
-- =============================================================
