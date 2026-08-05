import { createClient } from '@supabase/supabase-js';

/**
 * Server-side Supabase client using the SERVICE ROLE key.
 *
 * SECURITY NOTES:
 * - This client bypasses Row Level Security (RLS) — use ONLY in API routes / server code.
 * - NEVER import this file in client components or expose the service role key.
 * - All database operations go through API routes that validate and sanitize input.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let _supabase = null;
let _campSupabase = null;
let _auditSupabase = null;

/**
 * Lazy-initialize the Supabase client.
 * This prevents build-time crashes when env vars aren't set yet.
 */
export function getSupabase() {
  if (_supabase) return _supabase;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'Supabase environment variables are missing. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local'
    );
  }

  _supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return _supabase;
}

/**
 * Same database and service-role key as getSupabase(), but bound to the
 * 'camp' Postgres schema instead of 'public'.
 *
 * Camp registration data (see scripts/supabase-camp-schema-v1.sql) must
 * never mix with regular client-intake data — this client physically
 * cannot see the clients/payments/athlete_results tables, since they
 * live in a different schema. Requires "camp" to be added under
 * Supabase Dashboard -> Settings -> API -> Exposed schemas.
 */
export function getCampSupabase() {
  if (_campSupabase) return _campSupabase;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'Supabase environment variables are missing. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local'
    );
  }

  _campSupabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    db: {
      schema: 'camp',
    },
  });

  return _campSupabase;
}

/**
 * Same database and service-role key as getSupabase(), but bound to the
 * 'audit' Postgres schema instead of 'public'.
 *
 * Holds audit.admin_actions (see scripts/supabase-audit-schema-v1.sql) —
 * kept in its own schema, separate from both 'public' (client/billing data)
 * and 'camp' (camp registration data), since audit entries reference rows
 * in either domain and a table living inside one would re-couple the two
 * schemas that were deliberately kept apart. Requires "audit" to be added
 * under Supabase Dashboard -> Settings -> API -> Exposed schemas.
 */
export function getAuditSupabase() {
  if (_auditSupabase) return _auditSupabase;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'Supabase environment variables are missing. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local'
    );
  }

  _auditSupabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    db: {
      schema: 'audit',
    },
  });

  return _auditSupabase;
}
