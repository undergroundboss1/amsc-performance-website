import { getKochaSupabase } from '../supabase';
import { currentWeekN, openWeekNumbers, opensAt, weekState } from './release';
import { fileVisibleToScholar, videoVisibleToScholar } from './access';

/**
 * Load everything a hub page needs for one scholar in a single round of
 * parallel queries — no client-side fetching, no waterfalls. The whole
 * course is small (12 lessons, a few dozen files and videos), so every
 * page loads the same snapshot and picks what it shows.
 *
 * Visibility is decided here, on the server, with the shared rules in
 * lib/kocha/access.js and lib/kocha/release.js: rows a scholar may not see
 * never reach the page props. Lessons that are not open keep only what
 * their tile may show (number, date, and — unless gated — the title).
 */

const WEEK_COLUMNS =
  'id, n, title, takeaway, competencies, class_on, joint, meet_url, recording_url, onsite_note, ' +
  'release_at, due_at, published, gate, content_ready';
const FILE_COLUMNS =
  'id, slug, title, description, kind, format, language, audience, source, storage_path, external_url, ' +
  'size_bytes, weeks, show_on_home, gate, published, sort, version, version_label, updated_at';
const VIDEO_COLUMNS =
  'id, kind, youtube_id, url, title, channel, length_text, why_watch, weeks, topic, movement_pattern, ' +
  'audience_level, status, gate, sort';
const ASSIGNMENT_COLUMNS = 'id, week_id, title, time_needed, brief, submit_what, done_checklist, example, optional';
const SUBMISSION_COLUMNS =
  'id, assignment_id, body, link_url, status, feedback, reviewed_at, created_at, submission_media(id, kind)';

function unwrap({ data, error }) {
  if (error) throw error;
  return data || [];
}

export async function loadCourse(scholar, now = new Date()) {
  const db = getKochaSupabase();
  const cohort = scholar.cohort;

  const [weekRows, fileRows, videoRows, assignmentRows, progressRows, visitRows, submissionRows] = await Promise.all([
    db.from('weeks').select(WEEK_COLUMNS).eq('cohort_id', cohort.id).order('n').then(unwrap),
    db.from('files').select(FILE_COLUMNS).eq('cohort_id', cohort.id)
      .eq('published', true).eq('audience', 'scholar').order('sort').then(unwrap),
    db.from('videos').select(VIDEO_COLUMNS).eq('status', 'approved').order('sort').then(unwrap),
    db.from('assignments').select(ASSIGNMENT_COLUMNS).then(unwrap),
    db.from('progress').select('week_id, step').eq('scholar_id', scholar.id).then(unwrap),
    db.from('onsite_visits').select('id, zone, visit_on, title, pre_read')
      .eq('cohort_id', cohort.id).order('visit_on').then(unwrap),
    db.from('submissions').select(SUBMISSION_COLUMNS).eq('scholar_id', scholar.id)
      .order('created_at', { ascending: false }).then(unwrap),
  ]);

  const ctx = { now, nutritionEnabled: cohort.nutrition_enabled, accessMode: cohort.lesson_access_mode };
  const openWeekNs = openWeekNumbers(weekRows, ctx);
  const visibility = { openWeekNs, nutritionEnabled: cohort.nutrition_enabled };

  const nByWeekId = Object.fromEntries(weekRows.map((w) => [w.id, w.n]));

  const weeks = weekRows.map((w) => {
    const state = weekState(w, ctx);
    // A gated lesson keeps only its number and date: no title, summary or
    // content leaves the server while the gate is closed.
    if (state === 'tbc') {
      return { id: w.id, n: w.n, class_on: w.class_on, joint: w.joint, state };
    }
    // Locked and coming-soon lessons show their title and date only.
    if (state !== 'open') {
      return { id: w.id, n: w.n, title: w.title, class_on: w.class_on, joint: w.joint, state, opens_at: opensAt(w, ctx) };
    }
    return { ...w, state, opens_at: null };
  });

  const progress = {};
  for (const p of progressRows) {
    const n = nByWeekId[p.week_id];
    if (!n) continue;
    (progress[n] ||= []).push(p.step);
  }

  const assignments = {};
  const nByAssignmentId = {};
  for (const a of assignmentRows) {
    const n = nByWeekId[a.week_id];
    if (!n) continue;
    nByAssignmentId[a.id] = n;
    if (openWeekNs.has(n)) assignments[n] = a;
  }

  // The coach's own submissions only (filtered by scholar_id in SQL),
  // newest first, grouped by lesson.
  const submissions = {};
  for (const s of submissionRows) {
    const n = nByAssignmentId[s.assignment_id];
    if (n) (submissions[n] ||= []).push(s);
  }

  return {
    cohort,
    weeks,
    openWeekNs,
    currentN: currentWeekN(weekRows, ctx),
    files: fileRows.filter((f) => fileVisibleToScholar(f, visibility)),
    videos: videoRows.filter((v) => videoVisibleToScholar(v, visibility)),
    assignments,
    submissions,
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

/** The lesson's PDF (study card + homework sheet), if one is published. */
export function lessonPdf(course, n) {
  return course.files.find((f) => f.kind === 'study_card' && (f.weeks || []).includes(n)) || null;
}

/**
 * Videos grouped by topic group, in admin order. Groups appear in the
 * order of their first video, so reordering in admin reorders groups too.
 */
export function groupVideos(videos) {
  const groups = [];
  const byName = {};
  for (const v of [...videos].sort((a, b) => a.sort - b.sort)) {
    const name = v.topic || 'More videos';
    if (!byName[name]) {
      byName[name] = { name, videos: [] };
      groups.push(byName[name]);
    }
    byName[name].videos.push(v);
  }
  return groups;
}

/**
 * Where a coach is with one lesson, from their own data:
 * opened the study card, watched a video, sent the homework.
 */
export function lessonProgress(course, n) {
  const steps = course.progress[n] || [];
  const opened = steps.includes('download');
  const watched = steps.includes('watch');
  const sent = steps.includes('submit') || (course.submissions[n] || []).length > 0;
  const count = [opened, watched, sent].filter(Boolean).length;
  return { opened, watched, sent, status: count === 3 ? 'done' : count === 0 ? 'not_started' : 'in_progress' };
}

/** The next onsite visit on or after a date (YYYY-MM-DD), for this coach. */
export function nextVisit(course, fromDate) {
  return course.visits.find((v) => v.visit_on >= fromDate) || null;
}
