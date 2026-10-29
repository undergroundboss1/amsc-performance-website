import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getKochaSupabase } from '../../../../../lib/supabase';
import { getCurrentScholar } from '../../../../../lib/kocha/session';
import { weekState } from '../../../../../lib/kocha/release';
import { checkUpload } from '../../../../../lib/kocha/homework';

/**
 * POST /api/kocha/homework/upload-url  { weekN, kind, contentType, size }
 *   → { path, signedUrl }
 *
 * A one-time upload URL for a homework photo or voice note, inside the
 * signed-in coach's own folder (submissions/<scholar id>/) of the private
 * 'kocha' bucket. Only for lessons that are open and have homework.
 */
export async function POST(request) {
  try {
    const scholar = await getCurrentScholar();
    if (!scholar) return NextResponse.json({ error: 'Please open your personal link again.' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const weekN = Number(body.weekN);
    if (!Number.isInteger(weekN) || weekN < 1 || weekN > 12) return NextResponse.json({ error: 'Invalid lesson.' }, { status: 400 });
    const { ext, error: invalid } = checkUpload({ kind: body.kind, contentType: body.contentType, size: Number(body.size) });
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

    const path = `submissions/${scholar.id}/${randomUUID()}.${ext}`;
    const { data, error: signError } = await db.storage.from('kocha').createSignedUploadUrl(path);
    if (signError) throw signError;
    return NextResponse.json({ path, signedUrl: data.signedUrl });
  } catch (err) {
    console.error('kocha/homework/upload-url error:', err);
    return NextResponse.json({ error: 'Could not start the upload. Please try again.' }, { status: 500 });
  }
}
