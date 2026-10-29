import { NextResponse } from 'next/server';
import { getKochaSupabase } from '../../../../../lib/supabase';
import { getAdminActor } from '../../../../../lib/admin-auth';
import { adminCohort, unwrap } from '../../../../../lib/kocha/admin-common';

/**
 * GET /api/admin/kocha/completion            → { lessons: [n...], coaches: [{ id, name, zone, lessons: { n: {opened, watched, sent} } }] }
 * GET /api/admin/kocha/completion?format=csv → the same as a CSV file
 *
 * Per coach, per lesson: opened the study card, watched at least one video
 * (self-reported), sent the homework. For AMSC only — coaches never see
 * each other's progress.
 */

function csvCell(v) {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(request) {
  if (!getAdminActor(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const db = getKochaSupabase();
    const cohort = await adminCohort(db);
    const [scholars, weeks, progress, submissions, assignments] = await Promise.all([
      db.from('scholars').select('id, display_name, zone, revoked_at').eq('cohort_id', cohort.id).order('display_name').then(unwrap),
      db.from('weeks').select('id, n').eq('cohort_id', cohort.id).order('n').then(unwrap),
      db.from('progress').select('scholar_id, week_id, step').then(unwrap),
      db.from('submissions').select('scholar_id, assignment_id').then(unwrap),
      db.from('assignments').select('id, week_id').then(unwrap),
    ]);
    const nByWeek = Object.fromEntries(weeks.map((w) => [w.id, w.n]));
    const weekByAssignment = Object.fromEntries(assignments.map((a) => [a.id, a.week_id]));
    const lessons = weeks.map((w) => w.n);

    const grid = {};
    const cell = (sid, n) => ((grid[sid] ||= {})[n] ||= { opened: false, watched: false, sent: false });
    for (const p of progress) {
      const n = nByWeek[p.week_id];
      if (!n) continue;
      if (p.step === 'download') cell(p.scholar_id, n).opened = true;
      if (p.step === 'watch') cell(p.scholar_id, n).watched = true;
      if (p.step === 'submit') cell(p.scholar_id, n).sent = true;
    }
    for (const s of submissions) {
      const n = nByWeek[weekByAssignment[s.assignment_id]];
      if (n) cell(s.scholar_id, n).sent = true;
    }

    const coaches = scholars.map((s) => ({
      id: s.id, name: s.display_name, zone: s.zone, active: !s.revoked_at,
      lessons: Object.fromEntries(lessons.map((n) => [n, grid[s.id]?.[n] || { opened: false, watched: false, sent: false }])),
    }));

    if (new URL(request.url).searchParams.get('format') === 'csv') {
      const header = ['Coach', 'Zone', ...lessons.flatMap((n) => [`L${n} card opened`, `L${n} video watched`, `L${n} homework sent`])];
      const rows = coaches.map((c) => [
        c.name, c.zone ?? '',
        ...lessons.flatMap((n) => ['opened', 'watched', 'sent'].map((k) => (c.lessons[n][k] ? 'Y' : ''))),
      ]);
      const csv = [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\n');
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="kocha-completion.csv"',
        },
      });
    }
    return NextResponse.json({ lessons, coaches });
  } catch (err) {
    console.error('admin/kocha/completion error:', err);
    return NextResponse.json({ error: 'Failed to load completion.' }, { status: 500 });
  }
}
