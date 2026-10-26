-- =============================================================
-- AMSC Performance — Kocha Mwenzangu Coach Resource Hub, Schema v1
-- =============================================================
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)
--
-- WHAT THIS DOES:
-- 1. Creates a dedicated 'kocha' schema, separate from 'public'
--    (clients/payments), 'camp', 'audit' and 'waitlist'. Coach Scholars on
--    the Kocha Mwenzangu course are not paying AMSC clients, so they are kept
--    apart the same way camp and waitlist data are — they can never show up
--    in billing, arrears or attendance views by accident.
-- 2. Creates the course content tables (cohorts, weeks, files, videos,
--    assignments, quick cards, glossary, WhatsApp message templates, onsite
--    visits) — content lives here so Arnold can edit it without a deploy.
-- 3. Creates the per-coach tables (scholars, progress, download_events,
--    submissions, submission_media, video_reports, visit_checks).
-- 4. Creates kocha.admin_actions — Kocha's own admin audit trail, so the
--    existing audit.admin_actions table (and its domain CHECK) is untouched.
-- 5. Enables RLS with zero policies and grants service_role only — the same
--    model as every other table in this database. Scholars never talk to
--    Supabase directly: every read and write goes through an API route that
--    resolves the coach from their session cookie first (lib/kocha/session.js).
-- 6. Creates the private 'kocha' Storage bucket (course files and homework
--    uploads). Files are only ever handed out as short-lived signed URLs.
--
-- AFTER RUNNING THIS FILE — MANUAL STEP REQUIRED:
--   Supabase Dashboard → Settings → API (or "Data API") → Exposed schemas
--   → add "kocha"
--   Hub pages will fail with a schema-not-found error until this is done.
--
-- Then run scripts/supabase-kocha-seed-v1.sql for the course content.
--
-- Additive only: creates new objects, never alters or drops existing ones.
-- Safe to re-run: every statement is IF NOT EXISTS / idempotent.
-- =============================================================

CREATE SCHEMA IF NOT EXISTS kocha;

-- =============================================================
-- 1. kocha.cohorts — one row per course run (Cluster A, later clusters)
-- =============================================================
CREATE TABLE IF NOT EXISTS kocha.cohorts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]{2,40}$'),
  name                TEXT NOT NULL,
  starts_on           DATE NOT NULL,

  -- Online classes run at the same time for every zone, so the time lives
  -- here once. NULL = not announced yet ("Time to be confirmed").
  class_time          TEXT CHECK (class_time IS NULL OR class_time ~ '^[0-2][0-9]:[0-5][0-9]$'),
  meet_url            TEXT,
  fallback_note       TEXT,               -- e.g. Zoom link or dial-in, shown under the Meet button
  whatsapp_group_url  TEXT,

  -- Sessions 7 and 8 (Sports Nutrition) are a proposed scope addition, not
  -- yet in the signed MoU. Everything tagged gate = 'nutrition' stays hidden
  -- from scholars until this is switched on.
  nutrition_enabled   BOOLEAN NOT NULL DEFAULT FALSE,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- 2. kocha.scholars — one row per Coach Scholar (the coach-to-cohort link)
-- =============================================================
-- Access is a personal link sent on WhatsApp. Only a SHA-256 hash of the
-- link's token is stored, so the table itself can never be used to rebuild a
-- working link. Revoking sets revoked_at; reissuing replaces the hash, which
-- signs the old link out of every phone at once.
CREATE TABLE IF NOT EXISTS kocha.scholars (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id           UUID NOT NULL REFERENCES kocha.cohorts(id) ON DELETE CASCADE,
  display_name        TEXT NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 80),
  phone               TEXT CHECK (phone IS NULL OR phone ~ '^\+[0-9]{8,15}$'),
  -- Zone grouping is not final, so it is editable and may be empty.
  zone                SMALLINT CHECK (zone IS NULL OR zone BETWEEN 1 AND 3),
  token_hash          TEXT UNIQUE CHECK (token_hash IS NULL OR token_hash ~ '^[0-9a-f]{64}$'),
  token_issued_at     TIMESTAMPTZ,
  last_seen_at        TIMESTAMPTZ,
  revoked_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kocha_scholars_cohort ON kocha.scholars (cohort_id);

-- =============================================================
-- 3. kocha.weeks — the 12-week map, one row per week per cohort
-- =============================================================
CREATE TABLE IF NOT EXISTS kocha.weeks (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id           UUID NOT NULL REFERENCES kocha.cohorts(id) ON DELETE CASCADE,
  n                   SMALLINT NOT NULL CHECK (n BETWEEN 1 AND 12),
  title               TEXT NOT NULL,
  takeaway            TEXT,                        -- "Today's sentence"
  competencies        TEXT[] NOT NULL DEFAULT '{}',  -- e.g. {C5,C7}; labels in lib/kocha/constants.js
  class_on            DATE NOT NULL,               -- the Saturday of the online class
  joint               BOOLEAN NOT NULL DEFAULT FALSE,  -- joint session (Skills Camp, re-test)
  meet_url            TEXT,                        -- overrides cohorts.meet_url for this week
  recording_url       TEXT,                        -- added after class
  onsite_note         TEXT,                        -- how this week links to the next onsite visit

  -- Release logic (lib/kocha/release.js): a week is open to scholars when it
  -- is published, its release_at has passed, and it is not behind a gate
  -- that is switched off. Past weeks stay open.
  release_at          TIMESTAMPTZ NOT NULL,
  due_at              TIMESTAMPTZ,                 -- homework due
  published           BOOLEAN NOT NULL DEFAULT TRUE,
  gate                TEXT CHECK (gate IS NULL OR gate IN ('nutrition')),

  -- Structured study card: { key_ideas[], words[{term,meaning}], try_it[],
  -- think_about_it, watch_note }. NULL = card not issued yet.
  study_card          JSONB,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (cohort_id, n)
);

-- =============================================================
-- 4. kocha.files — the file manifest (data, not hard-coded)
-- =============================================================
CREATE TABLE IF NOT EXISTS kocha.files (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id           UUID NOT NULL REFERENCES kocha.cohorts(id) ON DELETE CASCADE,
  slug                TEXT NOT NULL CHECK (slug ~ '^[a-z0-9-]{2,60}$'),
  title               TEXT NOT NULL,
  description         TEXT,                        -- "what it is", one sentence
  kind                TEXT NOT NULL CHECK (kind IN (
                        'library', 'study_card', 'slides', 'quick_card', 'data_sheet',
                        'homework_sheet', 'script', 'glossary')),
  format              TEXT NOT NULL CHECK (format IN ('PDF', 'XLSX')),
  language            TEXT NOT NULL DEFAULT 'en' CHECK (language ~ '^[a-z]{2}$'),
  -- 'admin' files (facilitator guide, scripts) are never returned by any
  -- scholar-facing route — see lib/kocha/access.js.
  audience            TEXT NOT NULL DEFAULT 'scholar' CHECK (audience IN ('scholar', 'admin')),
  -- Where the file lives, so the page can say so plainly.
  source              TEXT NOT NULL DEFAULT 'hosted' CHECK (source IN ('hosted', 'whatsapp', 'external')),
  storage_path        TEXT,                        -- object path in the private 'kocha' bucket
  external_url        TEXT,
  size_bytes          INTEGER CHECK (size_bytes IS NULL OR size_bytes >= 0),
  weeks               SMALLINT[] NOT NULL DEFAULT '{}',   -- week pages this file shows on
  show_on_home        BOOLEAN NOT NULL DEFAULT FALSE,     -- also listed on the course home
  gate                TEXT CHECK (gate IS NULL OR gate IN ('nutrition')),
  published           BOOLEAN NOT NULL DEFAULT FALSE,
  version             INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  sort                INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (cohort_id, slug),
  -- A hosted file needs a stored object before it can be published; an
  -- external one needs a link.
  CHECK (NOT published OR source <> 'hosted' OR storage_path IS NOT NULL),
  CHECK (NOT published OR source <> 'external' OR external_url IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_kocha_files_cohort ON kocha.files (cohort_id, sort);
CREATE INDEX IF NOT EXISTS idx_kocha_files_weeks ON kocha.files USING GIN (weeks);

-- =============================================================
-- 5. kocha.videos — curated videos; only status = 'approved' ever renders
-- =============================================================
CREATE TABLE IF NOT EXISTS kocha.videos (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Stable key for idempotent imports: 'yt:<youtube_id>' or 'gap:<n>'.
  source_key          TEXT NOT NULL UNIQUE,
  -- 'amsc' is the reserved slot for AMSC-made videos (the shortlist's GAP
  -- rows), so gaps can be filled later without a redesign.
  kind                TEXT NOT NULL DEFAULT 'youtube' CHECK (kind IN ('youtube', 'amsc')),
  youtube_id          TEXT CHECK (youtube_id IS NULL OR youtube_id ~ '^[A-Za-z0-9_-]{11}$'),
  url                 TEXT,
  title               TEXT,
  channel             TEXT,
  length_text         TEXT,
  why_watch           TEXT,
  weeks               SMALLINT[] NOT NULL DEFAULT '{}',
  topic               TEXT,
  movement_pattern    TEXT CHECK (movement_pattern IS NULL OR movement_pattern IN (
                        'squat', 'hinge', 'lunge', 'single-leg', 'push', 'pull', 'core', 'carry',
                        'jumping-landing', 'stopping-cod', 'mobility', 'warm-up', 'testing',
                        'energy-systems', 'nutrition', 'hydration', 'sleep', 'return-to-play')),
  audience_level      TEXT NOT NULL DEFAULT 'beginner' CHECK (audience_level IN ('beginner', 'deeper')),
  status              TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  shortlist_status    TEXT,                        -- as imported: 'Metadata checked', 'Found, NOT checked', 'GAP: …'
  gate                TEXT CHECK (gate IS NULL OR gate IN ('nutrition')),
  notes               TEXT,
  added_by            TEXT,
  reviewed_by         TEXT CHECK (reviewed_by IS NULL OR reviewed_by IN ('arnold', 'khivali', 'jenny')),
  reviewed_at         TIMESTAMPTZ,
  link_checked_at     TIMESTAMPTZ,
  link_ok             BOOLEAN,
  sort                INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CHECK (kind <> 'youtube' OR youtube_id IS NOT NULL),
  -- Nothing can be approved without something to show.
  CHECK (status <> 'approved' OR (title IS NOT NULL AND (youtube_id IS NOT NULL OR url IS NOT NULL)))
);

CREATE INDEX IF NOT EXISTS idx_kocha_videos_status ON kocha.videos (status);
CREATE INDEX IF NOT EXISTS idx_kocha_videos_weeks ON kocha.videos USING GIN (weeks);

-- =============================================================
-- 6. kocha.assignments — one homework assignment per week
-- =============================================================
CREATE TABLE IF NOT EXISTS kocha.assignments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id             UUID NOT NULL UNIQUE REFERENCES kocha.weeks(id) ON DELETE CASCADE,
  title               TEXT NOT NULL,
  time_needed         TEXT,
  brief               TEXT NOT NULL,               -- what the coach does
  submit_what         TEXT NOT NULL,               -- what to send
  done_checklist      TEXT[] NOT NULL DEFAULT '{}',  -- what "done" looks like
  example             TEXT,                        -- a good submission (admin-editable)
  optional            BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- 7. kocha.quick_cards, kocha.glossary, kocha.message_templates
-- =============================================================
CREATE TABLE IF NOT EXISTS kocha.quick_cards (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id           UUID NOT NULL REFERENCES kocha.cohorts(id) ON DELETE CASCADE,
  slug                TEXT NOT NULL CHECK (slug ~ '^[a-z0-9-]{2,40}$'),
  title               TEXT NOT NULL,
  -- { intro?, columns?: [..], rows?: [[..]], items?: [..], note? }
  body                JSONB NOT NULL,
  gate                TEXT CHECK (gate IS NULL OR gate IN ('nutrition')),
  published           BOOLEAN NOT NULL DEFAULT TRUE,
  sort                INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (cohort_id, slug)
);

CREATE TABLE IF NOT EXISTS kocha.glossary (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id           UUID NOT NULL REFERENCES kocha.cohorts(id) ON DELETE CASCADE,
  term                TEXT NOT NULL,
  meaning             TEXT NOT NULL,
  first_week          SMALLINT CHECK (first_week IS NULL OR first_week BETWEEN 1 AND 12),
  gate                TEXT CHECK (gate IS NULL OR gate IN ('nutrition')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (cohort_id, term)
);

-- Copy-ready WhatsApp messages for Arnold. Placeholders like {week},
-- {title}, {date}, {time}, {meet_url}, {week_url} are filled in by
-- lib/kocha/share.js — templates are data, never concatenated in code.
CREATE TABLE IF NOT EXISTS kocha.message_templates (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id           UUID NOT NULL REFERENCES kocha.cohorts(id) ON DELETE CASCADE,
  key                 TEXT NOT NULL CHECK (key ~ '^[a-z0-9_]{2,40}$'),
  title               TEXT NOT NULL,
  body                TEXT NOT NULL,
  sort                INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (cohort_id, key)
);

-- =============================================================
-- 8. kocha.onsite_visits, kocha.visit_checks — onsite visits per zone and
--    the standing "copied into AMSC Metrics" tick after each one
-- =============================================================
CREATE TABLE IF NOT EXISTS kocha.onsite_visits (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id           UUID NOT NULL REFERENCES kocha.cohorts(id) ON DELETE CASCADE,
  zone                SMALLINT CHECK (zone IS NULL OR zone BETWEEN 1 AND 3),  -- NULL = all zones
  visit_on            DATE NOT NULL,
  title               TEXT NOT NULL,
  pre_read            TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kocha_onsite_visits_cohort ON kocha.onsite_visits (cohort_id, visit_on);

CREATE TABLE IF NOT EXISTS kocha.visit_checks (
  scholar_id          UUID NOT NULL REFERENCES kocha.scholars(id) ON DELETE CASCADE,
  visit_id            UUID NOT NULL REFERENCES kocha.onsite_visits(id) ON DELETE CASCADE,
  done_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (scholar_id, visit_id)
);

CREATE INDEX IF NOT EXISTS idx_kocha_visit_checks_visit ON kocha.visit_checks (visit_id);

-- =============================================================
-- 9. kocha.progress — the per-coach weekly checklist
-- =============================================================
CREATE TABLE IF NOT EXISTS kocha.progress (
  scholar_id          UUID NOT NULL REFERENCES kocha.scholars(id) ON DELETE CASCADE,
  week_id             UUID NOT NULL REFERENCES kocha.weeks(id) ON DELETE CASCADE,
  step                TEXT NOT NULL CHECK (step IN (
                        'download', 'watch', 'submit', 'class_live', 'class_recording')),
  done_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (scholar_id, week_id, step)
);

CREATE INDEX IF NOT EXISTS idx_kocha_progress_week ON kocha.progress (week_id);

-- =============================================================
-- 10. kocha.download_events — every download, for completion tracking.
--     Only who, which file and when: no IP address, no user agent.
-- =============================================================
CREATE TABLE IF NOT EXISTS kocha.download_events (
  id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  scholar_id          UUID NOT NULL REFERENCES kocha.scholars(id) ON DELETE CASCADE,
  file_id             UUID NOT NULL REFERENCES kocha.files(id) ON DELETE CASCADE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kocha_download_events_file ON kocha.download_events (file_id);
CREATE INDEX IF NOT EXISTS idx_kocha_download_events_scholar ON kocha.download_events (scholar_id);

-- =============================================================
-- 11. kocha.submissions, kocha.submission_media — homework
--     (form and inbox arrive in Phase 2; tables created now so the
--     schema lands in one reviewed migration)
-- =============================================================
CREATE TABLE IF NOT EXISTS kocha.submissions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id       UUID NOT NULL REFERENCES kocha.assignments(id) ON DELETE CASCADE,
  scholar_id          UUID NOT NULL REFERENCES kocha.scholars(id) ON DELETE CASCADE,
  title               TEXT CHECK (title IS NULL OR char_length(title) <= 120),
  body                TEXT CHECK (body IS NULL OR char_length(body) <= 5000),
  link_url            TEXT CHECK (link_url IS NULL OR link_url ~ '^https://'),
  fields              JSONB NOT NULL DEFAULT '{}'::jsonb,  -- assignment-specific structured answers

  -- Safeguarding: athletes are minors. Any photo, video or voice note of
  -- athletes needs the coach to confirm guardian consent — enforced here,
  -- not only in the form.
  has_athlete_media   BOOLEAN NOT NULL DEFAULT FALSE,
  consent_confirmed   BOOLEAN NOT NULL DEFAULT FALSE,
  no_athlete_data     BOOLEAN NOT NULL DEFAULT FALSE,

  status              TEXT NOT NULL DEFAULT 'submitted'
                        CHECK (status IN ('submitted', 'reviewed', 'follow_up')),
  feedback            TEXT CHECK (feedback IS NULL OR char_length(feedback) <= 2000),
  reviewed_by         TEXT CHECK (reviewed_by IS NULL OR reviewed_by IN ('arnold', 'khivali', 'jenny')),
  reviewed_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CHECK (NOT has_athlete_media OR consent_confirmed),
  CHECK (NOT (has_athlete_media AND no_athlete_data))
);

CREATE INDEX IF NOT EXISTS idx_kocha_submissions_scholar ON kocha.submissions (scholar_id);
CREATE INDEX IF NOT EXISTS idx_kocha_submissions_assignment ON kocha.submissions (assignment_id, status);

CREATE TABLE IF NOT EXISTS kocha.submission_media (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id       UUID NOT NULL REFERENCES kocha.submissions(id) ON DELETE CASCADE,
  storage_path        TEXT NOT NULL,
  kind                TEXT NOT NULL CHECK (kind IN ('photo', 'audio')),
  size_bytes          INTEGER CHECK (size_bytes IS NULL OR size_bytes >= 0),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kocha_submission_media_submission ON kocha.submission_media (submission_id);

-- =============================================================
-- 12. kocha.video_reports — "report a broken video" from scholars
-- =============================================================
CREATE TABLE IF NOT EXISTS kocha.video_reports (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id            UUID NOT NULL REFERENCES kocha.videos(id) ON DELETE CASCADE,
  scholar_id          UUID REFERENCES kocha.scholars(id) ON DELETE SET NULL,
  note                TEXT CHECK (note IS NULL OR char_length(note) <= 500),
  resolved_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kocha_video_reports_video ON kocha.video_reports (video_id);
CREATE INDEX IF NOT EXISTS idx_kocha_video_reports_scholar ON kocha.video_reports (scholar_id);

-- =============================================================
-- 13. kocha.admin_actions — audit trail for Kocha admin writes
-- =============================================================
-- Kept in this schema rather than widening audit.admin_actions' domain
-- CHECK, so no existing table is altered. Same shape and same best-effort
-- write pattern as lib/admin-audit.js.
CREATE TABLE IF NOT EXISTS kocha.admin_actions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor               TEXT NOT NULL CHECK (actor IN ('arnold', 'khivali', 'jenny')),
  action              TEXT NOT NULL,
  resource_id         TEXT,
  detail              JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kocha_admin_actions_created ON kocha.admin_actions (created_at DESC);

-- =============================================================
-- updated_at triggers (public.update_updated_at from supabase-setup.sql)
-- =============================================================
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'cohorts', 'scholars', 'weeks', 'files', 'videos', 'assignments', 'quick_cards',
    'glossary', 'message_templates', 'onsite_visits', 'submissions'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger
      WHERE tgname = 'set_' || t || '_updated_at'
        AND tgrelid = ('kocha.' || t)::regclass
    ) THEN
      EXECUTE format(
        'CREATE TRIGGER %I BEFORE UPDATE ON kocha.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at()',
        'set_' || t || '_updated_at', t
      );
    END IF;
  END LOOP;
END $$;

-- =============================================================
-- Row Level Security — blocks ALL public/anon access
-- =============================================================
-- No policies = no public access. Only service_role (used in API routes)
-- can touch these tables.
ALTER TABLE kocha.cohorts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE kocha.scholars          ENABLE ROW LEVEL SECURITY;
ALTER TABLE kocha.weeks             ENABLE ROW LEVEL SECURITY;
ALTER TABLE kocha.files             ENABLE ROW LEVEL SECURITY;
ALTER TABLE kocha.videos            ENABLE ROW LEVEL SECURITY;
ALTER TABLE kocha.assignments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE kocha.quick_cards       ENABLE ROW LEVEL SECURITY;
ALTER TABLE kocha.glossary          ENABLE ROW LEVEL SECURITY;
ALTER TABLE kocha.message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE kocha.onsite_visits     ENABLE ROW LEVEL SECURITY;
ALTER TABLE kocha.visit_checks      ENABLE ROW LEVEL SECURITY;
ALTER TABLE kocha.progress          ENABLE ROW LEVEL SECURITY;
ALTER TABLE kocha.download_events   ENABLE ROW LEVEL SECURITY;
ALTER TABLE kocha.submissions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE kocha.submission_media  ENABLE ROW LEVEL SECURITY;
ALTER TABLE kocha.video_reports     ENABLE ROW LEVEL SECURITY;
ALTER TABLE kocha.admin_actions     ENABLE ROW LEVEL SECURITY;

-- =============================================================
-- Grants — service_role only (see supabase-schema-grants-v1.sql for why
-- BYPASSRLS alone is not enough on a new schema, and why anon/authenticated
-- are deliberately left out).
-- =============================================================
GRANT USAGE ON SCHEMA kocha TO service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA kocha TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA kocha TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA kocha
  GRANT ALL PRIVILEGES ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA kocha
  GRANT ALL PRIVILEGES ON SEQUENCES TO service_role;

-- =============================================================
-- Storage — private 'kocha' bucket
-- =============================================================
-- public = false: no object in it has a public URL. Course files are served
-- by /api/kocha/files/[id] as 60-second signed URLs, after the session and
-- visibility checks. Facilitator-only documents are never uploaded here.
-- Guarded so this file also runs on a plain Postgres test database.
DO $$
BEGIN
  IF to_regclass('storage.buckets') IS NOT NULL THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'kocha', 'kocha', FALSE, 20971520,
      ARRAY[
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'image/jpeg', 'image/png', 'image/webp',
        'audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/webm', 'audio/aac'
      ]
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- =============================================================
-- DONE.
-- New schema: kocha (not exposed until the manual dashboard step above)
-- New bucket: kocha (private)
--
-- Verify (all must return true):
--   SELECT has_schema_privilege('service_role','kocha','USAGE'),
--          has_table_privilege('service_role','kocha.weeks','INSERT'),
--          NOT has_schema_privilege('anon','kocha','USAGE'),
--          NOT has_schema_privilege('authenticated','kocha','USAGE');
--
-- Deletion request (Kenya DPA right to erasure) — removes the coach and,
-- by cascade, their progress, downloads, submissions and checks. Delete the
-- coach's uploads from the 'kocha' bucket (submissions/<scholar_id>/) too.
--   DELETE FROM kocha.scholars WHERE id = '<scholar uuid>';
-- =============================================================
