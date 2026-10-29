import { NextResponse } from 'next/server';
import { getKochaSupabase } from '../../../../lib/supabase';
import { getCurrentScholar } from '../../../../lib/kocha/session';
import { weekState } from '../../../../lib/kocha/release';
import { checkSubmission } from '../../../../lib/kocha/homework';

/**
 * POST /api/kocha/homework  { weekN, body, linkUrl, media: [{ path, kind }], noAthleteData, consent }
 *
 * Saves a homework submission for the signed-in coach. The coach comes
 * from the session cookie, never the request body, and every attachment
 * must already be in that coach's own storage folder — the bucket is
 * asked, not the browser. Submissions are visible only to the coach and
 * to admins. Ticks "Homework sent" on the lesson.
 */
export async function POST(request) {
  try {
    const scholar = await getCurrentScholar();
    if (!scholar) return NextResponse.json({ error: 'Please open your personal link again.' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const weekN = Number(body.weekN);
    if (!Number.isInteger(weekN) || weekN < 1 || weekN > 12) return NextResponse.json({ error: 'Invalid lesson.' }, { status: 400 });

    const { row, error: invalid } = checkSubmission(body, scholar.id);
    if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

    const db = getKochaSupabase();
    const { data: week, error } = await db.from('weeks')
      .select('id, published, release_at, gate, content_ready, assignments(id)')
      .eq('cohort_id', scholar.cohort.id).eq('n', weekN).maybeSingle();
    if (error) throw error;
    const ctx = { now: new Date(), nutritionEnabled: scholar.cohort.nutrition_enabled, accessMode: scholar.cohort.lesson_access_mode };
    // One homework per lesson (assignments.week_id is unique); PostgREST may
    // return the embed as an object or a one-item list.
    const assignment = Array.isArray(week?.assignments) ? week.assignments[0] : week?.assignments;
    if (!week || weekState(week, ctx) !== 'open' || !assignment) {
      return NextResponse.json({ error: 'This lesson is not open.' }, { status: 403 });
    }

    // Confirm each attachment exists in the coach's folder, and read its size.
    const media = Array.isArray(body.media) ? body.media : [];
    let sizes = {};
    if (media.length) {
      const { data: listed, error: listError } = await db.storage.from('kocha').list(`submissions/${scholar.id}`, { limit: 1000 });
      if (listError) throw listError;
      sizes = Object.fromEntries((listed || []).map((o) => [o.name, o.metadata?.size ?? null]));
      for (const m of media) {
        if (!(m.path.split('/').pop() in sizes)) return NextResponse.json({ error: 'An upload did not finish. Please try again.' }, { status: 400 });
      }
    }

    const { data: saved, error: insertError } = await db.from('submissions')
      .insert({ ...row, assignment_id: assignment.id, scholar_id: scholar.id })
      .select('id').single();
    if (insertError) throw insertError;

    if (media.length) {
      const { error: mediaError } = await db.from('submission_media').insert(
        media.map((m) => ({ submission_id: saved.id, storage_path: m.path, kind: m.kind, size_bytes: sizes[m.path.split('/').pop()] }))
      );
      if (mediaError) throw mediaError;
    }

    const { error: tickError } = await db.from('progress').upsert(
      { scholar_id: scholar.id, week_id: week.id, step: 'submit' },
      { onConflict: 'scholar_id,week_id,step', ignoreDuplicates: true }
    );
    if (tickError) console.error('kocha homework tick failed (non-fatal):', tickError);

    return NextResponse.json({ ok: true, id: saved.id });
  } catch (err) {
    console.error('kocha/homework error:', err);
    return NextResponse.json({ error: 'Could not send. Please try again.' }, { status: 500 });
  }
}
