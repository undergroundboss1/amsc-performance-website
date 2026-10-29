-- Kocha Mwenzangu — schema v2 (lesson pages) assertions. Run by
-- scripts/kocha/test-db.sh after v1 + seed + v2 (v2 applied twice).
\set ON_ERROR_STOP on

DO $$
DECLARE
  cnt INTEGER;
BEGIN
  IF (SELECT lesson_access_mode FROM kocha.cohorts LIMIT 1) <> 'open' THEN
    RAISE EXCEPTION 'lesson_access_mode must default to open';
  END IF;

  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'kocha.video_gaps'::regclass) THEN
    RAISE EXCEPTION 'RLS must be on for kocha.video_gaps';
  END IF;
  IF NOT has_table_privilege('service_role', 'kocha.video_gaps', 'SELECT,INSERT,UPDATE,DELETE') THEN
    RAISE EXCEPTION 'service_role needs privileges on kocha.video_gaps';
  END IF;
  SELECT count(*) INTO cnt FROM pg_policies WHERE schemaname = 'kocha';
  IF cnt <> 0 THEN RAISE EXCEPTION 'kocha must still have no RLS policies'; END IF;

  -- v1 placeholders retired, not deleted.
  SELECT count(*) INTO cnt FROM kocha.videos WHERE kind = 'amsc';
  IF cnt <> 5 THEN RAISE EXCEPTION 'expected the 5 placeholder rows to remain, found %', cnt; END IF;
  SELECT count(*) INTO cnt FROM kocha.videos WHERE kind = 'amsc' AND status <> 'rejected';
  IF cnt <> 0 THEN RAISE EXCEPTION 'placeholder rows must be retired'; END IF;

  BEGIN
    UPDATE kocha.cohorts SET lesson_access_mode = 'anything';
    RAISE EXCEPTION 'CHECK_MISSING: invalid access mode accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO kocha.video_gaps (cohort_id, gap_key, topic) SELECT id, 'Bad Key', 'x' FROM kocha.cohorts;
    RAISE EXCEPTION 'CHECK_MISSING: malformed gap_key accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
END $$;

SELECT 'v2 assertions passed' AS result;
