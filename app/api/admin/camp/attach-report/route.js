import { NextResponse } from 'next/server';
import { getSupabase, getCampSupabase } from '../../../../../lib/supabase';
import { getAdminActor } from '../../../../../lib/admin-auth';
import { logAdminAction } from '../../../../../lib/admin-audit';

/**
 * POST /api/admin/camp/attach-report
 *
 * Links a registration to a combine result row so the athlete's report
 * card becomes downloadable on their materials page. The result itself is
 * created separately, through the EXISTING /api/admin/upload-results
 * Excel flow (public.athlete_results) — this route only records which
 * result belongs to which camp registration; it creates no new report
 * data of its own.
 *
 * Accepts either athleteResultId (UUID) or accessCode (e.g.
 * "AMSC-2026-0001") — admins already work with access codes elsewhere in
 * this system (CSV exports, athlete-facing lookups), so requiring a raw
 * UUID here would be a worse interface for no real benefit. Either way,
 * the row is validated against public.athlete_results (via getSupabase(),
 * not getCampSupabase() — that table lives in 'public', not 'camp')
 * before attaching, since camp.registrations has no FK constraint into
 * that table by design (the two schemas stay decoupled).
 *
 * Body: { registrationId, athleteResultId? , accessCode? } — one of the two required
 */
export async function POST(request) {
  const actor = getAdminActor(request);
  if (!actor) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const { registrationId, athleteResultId, accessCode } = await request.json();
    if (!registrationId || (!athleteResultId && !accessCode)) {
      return NextResponse.json(
        { error: 'registrationId and either athleteResultId or accessCode are required.' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();
    const campSupabase = getCampSupabase();

    const lookupQuery = athleteResultId
      ? supabase.from('athlete_results').select('id, athlete_name, access_code').eq('id', athleteResultId)
      : supabase.from('athlete_results').select('id, athlete_name, access_code').eq('access_code', accessCode.trim().toUpperCase());

    const { data: result, error: resultError } = await lookupQuery.single();

    if (resultError || !result) {
      return NextResponse.json({ error: 'Combine result not found.' }, { status: 404 });
    }

    const { data: registration, error: fetchError } = await campSupabase
      .from('registrations')
      .select('id, athlete_name')
      .eq('id', registrationId)
      .single();

    if (fetchError || !registration) {
      return NextResponse.json({ error: 'Registration not found.' }, { status: 404 });
    }

    const { error: updateError } = await campSupabase
      .from('registrations')
      .update({ athlete_result_id: result.id })
      .eq('id', registrationId);

    if (updateError) {
      console.error('admin/camp/attach-report: update error:', updateError);
      return NextResponse.json({ error: 'Failed to attach report card.' }, { status: 500 });
    }

    await logAdminAction({
      actor, action: 'camp.attach_report_card', domain: 'camp', resourceId: registrationId,
      detail: { athleteResultId: result.id, accessCode: result.access_code, resultAthleteName: result.athlete_name },
    });

    return NextResponse.json({ message: 'Report card attached.' });
  } catch (err) {
    console.error('admin/camp/attach-report error:', err);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
