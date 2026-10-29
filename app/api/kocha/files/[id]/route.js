import { NextResponse } from 'next/server';
import { getKochaSupabase } from '../../../../../lib/supabase';
import { getCurrentScholar } from '../../../../../lib/kocha/session';
import { openWeekNumbers, weekState } from '../../../../../lib/kocha/release';
import { fileDownloadable } from '../../../../../lib/kocha/access';
import { KOCHA_BASE } from '../../../../../lib/kocha/constants';

/**
 * GET /api/kocha/files/<id>[?week=<n>]
 *
 * The only way a course file leaves the private 'kocha' bucket:
 *   1. the coach must be signed in (session cookie);
 *   2. the file must pass fileDownloadable() — published, scholar audience,
 *      not behind a closed gate, on an open week or the course home;
 *   3. the download is logged (who, which file, when — nothing else);
 *   4. the coach is redirected to a 60-second signed URL.
 *
 * Facilitator-only files (audience 'admin') fail step 2 for every scholar,
 * whatever their id. Someone without a session who follows a shared link
 * is sent to the course home, which explains how to get access.
 *
 * ?week=n ticks "Study card opened" on that lesson when the file belongs
 * to it. ?inline=1 opens the file for the in-page preview instead of
 * downloading it.
 */
export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function notFound() {
  return NextResponse.json({ error: 'File not found.' }, { status: 404 });
}

export async function GET(request, { params }) {
  try {
    const scholar = await getCurrentScholar();
    if (!scholar) return NextResponse.redirect(new URL(KOCHA_BASE, request.url), 303);
    if (!UUID.test(params.id)) return notFound();

    const db = getKochaSupabase();
    const cohortId = scholar.cohort.id;
    const [{ data: file, error: fileError }, { data: weeks, error: weeksError }] = await Promise.all([
      db.from('files')
        .select('id, title, audience, source, storage_path, external_url, weeks, show_on_home, gate, published')
        .eq('id', params.id).eq('cohort_id', cohortId).maybeSingle(),
      db.from('weeks').select('id, n, published, release_at, gate, content_ready').eq('cohort_id', cohortId),
    ]);
    if (fileError) throw fileError;
    if (weeksError) throw weeksError;

    const ctx = {
      now: new Date(),
      nutritionEnabled: scholar.cohort.nutrition_enabled,
      accessMode: scholar.cohort.lesson_access_mode,
    };
    const openWeekNs = openWeekNumbers(weeks, ctx);
    if (!fileDownloadable(file, { openWeekNs, nutritionEnabled: ctx.nutritionEnabled })) return notFound();

    // Best-effort tracking: a failed log line never blocks the download.
    const { error: logError } = await db.from('download_events').insert({ scholar_id: scholar.id, file_id: file.id });
    if (logError) console.error('kocha download log failed (non-fatal):', logError);

    const weekN = Number(new URL(request.url).searchParams.get('week'));
    const week = weeks.find((w) => w.n === weekN);
    if (week && (file.weeks || []).includes(weekN) && weekState(week, ctx) === 'open') {
      const { error } = await db.from('progress').upsert(
        { scholar_id: scholar.id, week_id: week.id, step: 'download' },
        { onConflict: 'scholar_id,week_id,step', ignoreDuplicates: true }
      );
      if (error) console.error('kocha download tick failed (non-fatal):', error);
    }

    if (file.source === 'external') {
      return NextResponse.redirect(file.external_url, 303);
    }

    // Stored as files/<slug>/v<version>-<original name>; download under the
    // original name.
    // ?inline=1 is the in-page PDF preview: the browser shows the file
    // instead of saving it. Otherwise it downloads under its original name.
    const inline = new URL(request.url).searchParams.get('inline') === '1';
    const downloadName = file.storage_path.split('/').pop().replace(/^v\d+-/, '');
    const { data: signed, error: signError } = await db.storage
      .from('kocha')
      .createSignedUrl(file.storage_path, inline ? 300 : 60, inline ? {} : { download: downloadName });
    if (signError || !signed?.signedUrl) {
      console.error('kocha signed URL error:', signError);
      return NextResponse.json({ error: 'This file is not available right now. Please try again later.' }, { status: 503 });
    }

    const res = NextResponse.redirect(signed.signedUrl, 303);
    res.headers.set('Cache-Control', 'no-store');
    return res;
  } catch (err) {
    console.error('kocha/files error:', err);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
