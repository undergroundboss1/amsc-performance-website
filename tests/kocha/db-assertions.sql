-- =============================================================
-- Kocha Mwenzangu — database assertions
-- =============================================================
-- Run by scripts/kocha/test-db.sh against a throwaway Postgres that has had
-- scripts/supabase-kocha-schema-v1.sql and the seed applied (the seed twice).
-- Every check raises an exception on failure, so psql exits non-zero.
-- =============================================================

\set ON_ERROR_STOP on

DO $$
DECLARE
  r RECORD;
  cnt INTEGER;
BEGIN
  -- ---------- Security model ----------
  -- RLS on every kocha table, with zero policies (service_role-only model).
  FOR r IN
    SELECT c.relname, c.relrowsecurity
    FROM pg_class c JOIN pg_namespace ns ON ns.oid = c.relnamespace
    WHERE ns.nspname = 'kocha' AND c.relkind = 'r'
  LOOP
    IF NOT r.relrowsecurity THEN
      RAISE EXCEPTION 'RLS is not enabled on kocha.%', r.relname;
    END IF;
    IF NOT has_table_privilege('service_role', 'kocha.' || r.relname, 'SELECT,INSERT,UPDATE,DELETE') THEN
      RAISE EXCEPTION 'service_role is missing privileges on kocha.%', r.relname;
    END IF;
  END LOOP;

  SELECT count(*) INTO cnt FROM pg_policies WHERE schemaname = 'kocha';
  IF cnt <> 0 THEN
    RAISE EXCEPTION 'expected no RLS policies on kocha (service_role only), found %', cnt;
  END IF;

  -- Browser roles have no way in at all: not even schema USAGE.
  IF has_schema_privilege('anon', 'kocha', 'USAGE') THEN
    RAISE EXCEPTION 'anon must not have USAGE on schema kocha';
  END IF;
  IF has_schema_privilege('authenticated', 'kocha', 'USAGE') THEN
    RAISE EXCEPTION 'authenticated must not have USAGE on schema kocha';
  END IF;

  -- ---------- Seed content ----------
  SELECT count(*) INTO cnt FROM kocha.weeks;
  IF cnt <> 12 THEN RAISE EXCEPTION 'expected 12 weeks, found %', cnt; END IF;

  SELECT count(*) INTO cnt FROM kocha.assignments;
  IF cnt <> 12 THEN RAISE EXCEPTION 'expected 12 assignments, found %', cnt; END IF;

  -- Weeks 7 and 8 are double-locked: behind the nutrition gate AND unpublished.
  SELECT count(*) INTO cnt FROM kocha.weeks
  WHERE n IN (7, 8) AND gate = 'nutrition' AND published = FALSE;
  IF cnt <> 2 THEN RAISE EXCEPTION 'weeks 7 and 8 must be gated and unpublished'; END IF;

  SELECT count(*) INTO cnt FROM kocha.weeks WHERE gate IS NOT NULL AND n NOT IN (7, 8);
  IF cnt <> 0 THEN RAISE EXCEPTION 'only weeks 7 and 8 should be gated'; END IF;

  SELECT count(*) INTO cnt FROM kocha.cohorts WHERE nutrition_enabled;
  IF cnt <> 0 THEN RAISE EXCEPTION 'nutrition must be off by default'; END IF;

  -- Week 1 is already live; week n opens 7 days before its class (EAT).
  SELECT count(*) INTO cnt FROM kocha.weeks
  WHERE release_at <> ((class_on - 7)::timestamp AT TIME ZONE 'Africa/Nairobi');
  IF cnt <> 0 THEN RAISE EXCEPTION '% weeks do not open 7 days before class', cnt; END IF;

  SELECT count(*) INTO cnt FROM kocha.weeks WHERE n = 1 AND class_on = DATE '2026-10-24';
  IF cnt <> 1 THEN RAISE EXCEPTION 'week 1 must be Sat 24 Oct 2026'; END IF;

  SELECT count(*) INTO cnt FROM kocha.weeks WHERE n = 12 AND class_on = DATE '2027-01-09';
  IF cnt <> 1 THEN RAISE EXCEPTION 'week 12 must be Sat 9 Jan 2027'; END IF;

  -- Weeks 1 to 6 have full study cards; 9 to 12 have summary content.
  SELECT count(*) INTO cnt FROM kocha.weeks
  WHERE n BETWEEN 1 AND 6 AND jsonb_array_length(study_card -> 'key_ideas') >= 4;
  IF cnt <> 6 THEN RAISE EXCEPTION 'weeks 1-6 must have full study cards'; END IF;

  SELECT count(*) INTO cnt FROM kocha.weeks WHERE n BETWEEN 9 AND 12 AND study_card ? 'focus';
  IF cnt <> 4 THEN RAISE EXCEPTION 'weeks 9-12 must have summary content'; END IF;

  -- Every video is imported as pending; GAP rows become AMSC-made slots.
  SELECT count(*) INTO cnt FROM kocha.videos;
  IF cnt <> 54 THEN RAISE EXCEPTION 'expected 54 shortlist videos, found %', cnt; END IF;

  SELECT count(*) INTO cnt FROM kocha.videos WHERE status <> 'pending';
  IF cnt <> 0 THEN RAISE EXCEPTION 'all imported videos must start pending'; END IF;

  SELECT count(*) INTO cnt FROM kocha.videos WHERE kind = 'amsc' AND youtube_id IS NULL;
  IF cnt <> 5 THEN RAISE EXCEPTION 'expected 5 AMSC placeholder slots, found %', cnt; END IF;

  -- Everything for sessions 7 and 8 is behind the gate.
  SELECT count(*) INTO cnt FROM kocha.videos WHERE weeks && ARRAY[7, 8]::smallint[] AND gate IS DISTINCT FROM 'nutrition';
  IF cnt <> 0 THEN RAISE EXCEPTION '% week 7/8 videos are not gated', cnt; END IF;

  SELECT count(*) INTO cnt FROM kocha.quick_cards WHERE slug = 'plate-and-hydration' AND gate = 'nutrition';
  IF cnt <> 1 THEN RAISE EXCEPTION 'the plate and hydration card must be gated'; END IF;

  -- Files are seeded unpublished (published only after upload), and no
  -- facilitator-only file is ever seeded.
  SELECT count(*) INTO cnt FROM kocha.files WHERE published OR audience <> 'scholar';
  IF cnt <> 0 THEN RAISE EXCEPTION 'seeded files must be unpublished scholar files'; END IF;
END $$;

-- ---------- Constraints that protect scholars and athletes ----------
-- Each block expects its INSERT to be rejected.
DO $$
DECLARE
  sid UUID;
  aid UUID;
BEGIN
  INSERT INTO kocha.scholars (cohort_id, display_name)
  SELECT id, 'Test Coach' FROM kocha.cohorts LIMIT 1
  RETURNING id INTO sid;
  SELECT id INTO aid FROM kocha.assignments LIMIT 1;

  -- Athlete photos or voice notes need confirmed guardian consent.
  BEGIN
    INSERT INTO kocha.submissions (assignment_id, scholar_id, has_athlete_media, consent_confirmed)
    VALUES (aid, sid, TRUE, FALSE);
    RAISE EXCEPTION 'CHECK_MISSING: media without consent was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  -- "No athlete data" cannot be ticked on a submission that has athlete media.
  BEGIN
    INSERT INTO kocha.submissions (assignment_id, scholar_id, has_athlete_media, consent_confirmed, no_athlete_data)
    VALUES (aid, sid, TRUE, TRUE, TRUE);
    RAISE EXCEPTION 'CHECK_MISSING: media + no_athlete_data was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  -- Tokens are stored as SHA-256 hex only, never raw.
  BEGIN
    UPDATE kocha.scholars SET token_hash = 'raw-token-value' WHERE id = sid;
    RAISE EXCEPTION 'CHECK_MISSING: a raw token was stored';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  -- A hosted file cannot be published before it has been uploaded.
  BEGIN
    UPDATE kocha.files SET published = TRUE WHERE slug = 'baseline-data-sheet';
    RAISE EXCEPTION 'CHECK_MISSING: an un-uploaded file was published';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  -- A video cannot be approved without something to show (AMSC slot, no link).
  BEGIN
    UPDATE kocha.videos SET status = 'approved' WHERE source_key = 'gap:1';
    RAISE EXCEPTION 'CHECK_MISSING: an empty AMSC slot was approved';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  DELETE FROM kocha.scholars WHERE id = sid;
END $$;

-- Marker for the idempotency check in test-db.sh: approve one video and edit
-- one week title, then the seed is re-applied and these must survive.
UPDATE kocha.videos SET status = 'approved', reviewed_by = 'arnold', reviewed_at = NOW()
WHERE source_key = 'yt:IBC00PJ28uk';
UPDATE kocha.weeks SET title = 'Edited by admin' WHERE n = 2;

SELECT 'db assertions passed' AS result;
