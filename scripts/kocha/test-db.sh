#!/bin/bash
# =============================================================
# Kocha Mwenzangu — test the migration and seed on a throwaway Postgres
# =============================================================
# Free, local, and never touches the live Supabase project:
#   1. starts a temporary Postgres in a temp directory
#   2. recreates the bits of Supabase the migration relies on
#      (anon / authenticated / service_role, public.update_updated_at)
#   3. applies scripts/supabase-kocha-schema-v1.sql twice (re-run safe)
#   4. applies the seed, runs tests/kocha/db-assertions.sql, applies the
#      seed again and checks admin edits survived (idempotent seed)
#   5. deletes everything
#
# Usage: bash scripts/kocha/test-db.sh
# Needs Postgres 14+ server binaries (initdb, pg_ctl, psql).
# =============================================================
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
export PATH="$PGBIN:$PATH"

WORK="$(mktemp -d)"
PORT="${KOCHA_TEST_PG_PORT:-54329}"

# initdb refuses to run as root; use the postgres OS user when we are root.
RUN=()
if [ "$(id -u)" = "0" ]; then
  chown postgres "$WORK"
  RUN=(runuser -u postgres --)
fi

cleanup() {
  "${RUN[@]}" pg_ctl -D "$WORK/data" -m immediate stop >/dev/null 2>&1 || true
  rm -rf "$WORK"
}
trap cleanup EXIT

"${RUN[@]}" initdb -D "$WORK/data" -U postgres -A trust >/dev/null
"${RUN[@]}" pg_ctl -D "$WORK/data" -o "-p $PORT -k $WORK -c listen_addresses=''" -l "$WORK/pg.log" -w start >/dev/null

PSQL=(psql -h "$WORK" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q -X)

"${PSQL[@]}" <<'SQL'
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
-- Supabase pre-grants the public schema to its API roles.
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
SQL

echo "→ schema (twice)"
"${PSQL[@]}" -c "SET client_min_messages = warning" -f "$ROOT/scripts/supabase-kocha-schema-v1.sql" >/dev/null
"${PSQL[@]}" -c "SET client_min_messages = warning" -f "$ROOT/scripts/supabase-kocha-schema-v1.sql" >/dev/null

echo "→ seed"
"${PSQL[@]}" -f "$ROOT/scripts/supabase-kocha-seed-v1.sql" >/dev/null

echo "→ assertions"
"${PSQL[@]}" -f "$ROOT/tests/kocha/db-assertions.sql"

echo "→ seed again (must not overwrite admin edits)"
"${PSQL[@]}" -f "$ROOT/scripts/supabase-kocha-seed-v1.sql" >/dev/null
"${PSQL[@]}" <<'SQL'
DO $$
BEGIN
  IF (SELECT count(*) FROM kocha.weeks) <> 12 OR (SELECT count(*) FROM kocha.videos) <> 54 THEN
    RAISE EXCEPTION 're-running the seed duplicated rows';
  END IF;
  IF (SELECT status FROM kocha.videos WHERE source_key = 'yt:IBC00PJ28uk') <> 'approved' THEN
    RAISE EXCEPTION 're-running the seed reset an approved video';
  END IF;
  IF (SELECT title FROM kocha.weeks WHERE n = 2) <> 'Edited by admin' THEN
    RAISE EXCEPTION 're-running the seed overwrote an admin edit';
  END IF;
END $$;
SQL

echo "✓ Kocha database tests passed"
