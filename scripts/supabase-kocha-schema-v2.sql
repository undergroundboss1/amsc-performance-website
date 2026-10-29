-- =============================================================
-- AMSC Performance — Kocha Mwenzangu hub, Schema v2: lesson pages
-- =============================================================
-- Run AFTER scripts/supabase-kocha-schema-v1.sql (and its seed).
--
-- WHAT THIS DOES (additive only — new columns, one new table):
-- 1. cohorts.lesson_access_mode — 'open' (coaches can open any published
--    lesson; the default) or 'by_week' (a lesson also waits for its
--    unlock date, weeks.release_at).
-- 2. weeks.content_ready — false for lessons whose PDF is not written yet
--    (Weeks 9 to 12): shown to coaches as "Coming soon".
--    weeks.lesson_imported_at — when the lessons manifest was first
--    imported for this week (scripts/kocha + /api/admin/kocha/import).
-- 3. files.version_label / files.sha256 — the manifest's version text
--    ("v1.0 · 29 Oct 2026") and a fingerprint so re-importing the same
--    PDF never creates a new version.
-- 4. videos.lesson_imported_at — set the first time the manifest places a
--    video in a lesson (week, group, role, order). Later imports leave
--    Arnold's group, role, order and approval decisions alone.
-- 5. kocha.video_gaps — topics with no video yet. Admin to-do list only;
--    never shown to coaches.
-- 6. Retires the v1 seed's five "AMSC video" placeholder rows (status →
--    'rejected', with a note) now that gaps have their own list. Nothing
--    is deleted.
-- 7. Lets the private 'kocha' bucket accept iPhone voice notes (m4a) and
--    a few other common audio types for homework.
--
-- Safe to re-run: every statement is IF NOT EXISTS / idempotent.
-- =============================================================

ALTER TABLE kocha.cohorts ADD COLUMN IF NOT EXISTS lesson_access_mode TEXT NOT NULL DEFAULT 'open';
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cohorts_lesson_access_mode_check') THEN
    ALTER TABLE kocha.cohorts ADD CONSTRAINT cohorts_lesson_access_mode_check
      CHECK (lesson_access_mode IN ('open', 'by_week'));
  END IF;
END $$;

ALTER TABLE kocha.weeks ADD COLUMN IF NOT EXISTS content_ready BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE kocha.weeks ADD COLUMN IF NOT EXISTS lesson_imported_at TIMESTAMPTZ;

ALTER TABLE kocha.files ADD COLUMN IF NOT EXISTS version_label TEXT;
ALTER TABLE kocha.files ADD COLUMN IF NOT EXISTS sha256 TEXT;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'files_sha256_check') THEN
    ALTER TABLE kocha.files ADD CONSTRAINT files_sha256_check
      CHECK (sha256 IS NULL OR sha256 ~ '^[0-9a-f]{64}$');
  END IF;
END $$;

ALTER TABLE kocha.videos ADD COLUMN IF NOT EXISTS lesson_imported_at TIMESTAMPTZ;

-- =============================================================
-- kocha.video_gaps — topics still needing a video (admin only)
-- =============================================================
CREATE TABLE IF NOT EXISTS kocha.video_gaps (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id           UUID NOT NULL REFERENCES kocha.cohorts(id) ON DELETE CASCADE,
  -- Stable key for idempotent imports: 'w1:session-rpe-and-readiness',
  -- or 'all:safeguarding-all-weeks' for gaps that cover every lesson.
  gap_key             TEXT NOT NULL CHECK (gap_key ~ '^(w[0-9]{1,2}|all):[a-z0-9-]{1,80}$'),
  week_n              SMALLINT CHECK (week_n IS NULL OR week_n BETWEEN 1 AND 12),
  topic               TEXT NOT NULL,
  note                TEXT,
  resolved_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (cohort_id, gap_key)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_video_gaps_updated_at' AND tgrelid = 'kocha.video_gaps'::regclass
  ) THEN
    CREATE TRIGGER set_video_gaps_updated_at BEFORE UPDATE ON kocha.video_gaps
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;
END $$;

ALTER TABLE kocha.video_gaps ENABLE ROW LEVEL SECURITY;
-- No policies: service_role only, like every other kocha table. The
-- schema's default privileges (v1) already grant service_role on new
-- tables; granted explicitly too so this file stands on its own.
GRANT ALL PRIVILEGES ON kocha.video_gaps TO service_role;

-- =============================================================
-- Retire the v1 "AMSC video" placeholders (gaps now have their own list)
-- =============================================================
UPDATE kocha.videos
SET status = 'rejected',
    notes = 'Retired: gaps are now tracked in the lesson gaps list.'
WHERE kind = 'amsc'
  AND source_key LIKE 'gap:%'
  AND youtube_id IS NULL
  AND url IS NULL
  AND status = 'pending';

-- =============================================================
-- Storage: accept common phone voice-note formats for homework
-- =============================================================
DO $$
BEGIN
  IF to_regclass('storage.buckets') IS NOT NULL THEN
    UPDATE storage.buckets
    SET allowed_mime_types = ARRAY[
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg', 'image/png', 'image/webp',
      'audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/m4a', 'audio/aac',
      'audio/ogg', 'audio/webm', 'audio/wav', 'audio/x-wav', 'audio/3gpp'
    ]
    WHERE id = 'kocha';
  END IF;
END $$;

-- =============================================================
-- DONE.
-- Verify:
--   SELECT lesson_access_mode FROM kocha.cohorts;            -- 'open'
--   SELECT has_table_privilege('service_role','kocha.video_gaps','INSERT'),
--          NOT has_schema_privilege('anon','kocha','USAGE');
-- =============================================================
