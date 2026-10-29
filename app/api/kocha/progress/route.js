import { NextResponse } from 'next/server';
import { getKochaSupabase } from '../../../../lib/supabase';
import { getCurrentScholar } from '../../../../lib/kocha/session';
import { weekState } from '../../../../lib/kocha/release';

/**
 * POST /api/kocha/progress  { weekN, step, done }
 *
 * Ticks or unticks one step of the signed-in coach's weekly checklist.
 * The coach is resolved from their session cookie — the body never says
 * whose progress this is, so nobody can write to another coach's checklist.
 *
 * Only the three checklist steps can be set here. Class attendance
 * (class_live / class_recording) is recorded by AMSC, not self-reported.
 */

const SELF_STEPS = ['download', 'watch', 'submit'];

export async function POST(request) {
  try {
    const scholar = await getCurrentScholar();
    if (!scholar) {
      return NextResponse.json({ error: 'Please open your personal link again.' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const weekN = Number(body.weekN);
    const { step } = body;
    const done = body.done === true;

    if (!Number.isInteger(weekN) || weekN < 1 || weekN > 12 || !SELF_STEPS.includes(step)) {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
    }

    const db = getKochaSupabase();
    const { data: week, error: weekError } = await db
      .from('weeks')
      .select('id, published, release_at, gate, content_ready')
      .eq('cohort_id', scholar.cohort.id)
      .eq('n', weekN)
      .maybeSingle();
    if (weekError) throw weekError;

    const ctx = {
      now: new Date(),
      nutritionEnabled: scholar.cohort.nutrition_enabled,
      accessMode: scholar.cohort.lesson_access_mode,
    };
    if (!week || weekState(week, ctx) !== 'open') {
      return NextResponse.json({ error: 'This week is not open yet.' }, { status: 403 });
    }

    const { error } = done
      ? await db.from('progress').upsert(
          { scholar_id: scholar.id, week_id: week.id, step },
          { onConflict: 'scholar_id,week_id,step', ignoreDuplicates: true }
        )
      : await db.from('progress').delete()
          .eq('scholar_id', scholar.id).eq('week_id', week.id).eq('step', step);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('kocha/progress error:', err);
    return NextResponse.json({ error: 'Could not save. Please try again.' }, { status: 500 });
  }
}
