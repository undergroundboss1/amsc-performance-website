import { getKochaSupabase } from '../supabase';
import { currentWeekN, openWeekNumbers, opensAt, weekState } from './release';
import { fileVisibleToScholar, videoVisibleToScholar } from './access';

/**
 * Load everything a hub page needs for one scholar in a single round of
 * parallel queries — no client-side fetching, no waterfalls. The whole
 * course is small (12 weeks, a few dozen files and videos), so every page
 * loads the same snapshot and picks what it shows.
 *
 * Visibility is decided here, on the server, with the shared rules in
 * lib/kocha/access.js and lib/kocha/release.js: rows a scholar may not see
 * never reach the page props.
 */

const WEEK_COLUMNS =
  'id, n, title, takeaway, competencies, class_on, joint, meet_url, recording_url, onsite_note, ' +
  'release_at, due_at, published, gate, study_card';
const FILE_COLUMNS =
  'id, slug, title, description, kind, format, language, audience, source, storage_path, external_url, ' +
  'size_bytes, weeks, show_on_home, gate, published, sort';
const VIDEO_COLUMNS =
  'id, kind, youtube_id, url, title, channel, length_text, why_watch, weeks, topic, movement_pattern, ' +
  'audience_level, status, gate, sort';
const ASSIGNMENT_COLUMNS = 'id, week_id, title, time_needed, brief, submit_what, done_checklist, example, optional';

function unwrap({ data, error }) {
  if (error) throw error;
  return data || [];
}

export async function loadCourse(scholar, now = new Date()) {
  const db = getKochaSupabase();
  const cohort = scholar.cohort;

  const [weekRows, fileRows, videoRows, assignmentRows, progressRows, visitRows] = await Promise.all([
    db.from('weeks').select(WEEK_COLUMNS).eq('cohort_id', cohort.id).order('n').then(unwrap),
    db.from('files').select(FILE_COLUMNS).eq('cohort_id', cohort.id)
      .eq('published', true).eq('audience', 'scholar').order('sort').then(unwrap),
    db.from('videos').select(VIDEO_COLUMNS).eq('status', 'approved').order('sort').then(unwrap),
    db.from('assignments').select(ASSIGNMENT_COLUMNS).then(unwrap),
    db.from('progress').select('week_id, step').eq('scholar_id', scholar.id).then(unwrap),
    db.from('onsite_visits').select('id, zone, visit_on, title, pre_read')
      .eq('cohort_id', cohort.id).order('visit_on').then(unwrap),
  ]);

  const ctx = { now, nutritionEnabled: cohort.nutrition_enabled };
  const openWeekNs = openWeekNumbers(weekRows, ctx);
  const visibility = { openWeekNs, nutritionEnabled: cohort.nutrition_enabled };

  const nByWeekId = Object.fromEntries(weekRows.map((w) => [w.id, w.n]));

  const weeks = weekRows.map((w) => {
    const state = weekState(w, ctx);
    // A gated week keeps only its number and date: no title, takeaway or
    // content leaves the server while the gate is closed.
    if (state === 'tbc') {
      return { id: w.id, n: w.n, class_on: w.class_on, joint: w.joint, state };
    }
    return { ...w, state, opens_at: opensAt(w, ctx) };
  });

  const progress = {};
  for (const p of progressRows) {
    const n = nByWeekId[p.week_id];
    if (!n) continue;
    (progress[n] ||= []).push(p.step);
  }

  const assignments = {};
  for (const a of assignmentRows) {
    const n = nByWeekId[a.week_id];
    if (n && openWeekNs.has(n)) assignments[n] = a;
  }

  return {
    cohort,
    weeks,
    openWeekNs,
    currentN: currentWeekN(weekRows, ctx),
    files: fileRows.filter((f) => fileVisibleToScholar(f, visibility)),
    videos: videoRows.filter((v) => videoVisibleToScholar(v, visibility)),
    assignments,
    progress,
    // Visits for this coach's zone, plus visits for everyone (zone NULL).
    visits: visitRows.filter((v) => v.zone === null || v.zone === scholar.zone),
  };
}

export function filesForWeek(course, n) {
  return course.files.filter((f) => (f.weeks || []).includes(n));
}

export function videosForWeek(course, n) {
  return course.videos.filter((v) => (v.weeks || []).includes(n));
}

/** The next onsite visit on or after a date (YYYY-MM-DD), for this coach. */
export function nextVisit(course, fromDate) {
  return course.visits.find((v) => v.visit_on >= fromDate) || null;
}
