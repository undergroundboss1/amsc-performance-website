import { NextResponse } from 'next/server';
import { getKochaSupabase } from '../../../../../lib/supabase';
import { getAdminActor } from '../../../../../lib/admin-auth';
import { sanitize } from '../../../../../lib/validators';
import { logKochaAction } from '../../../../../lib/kocha/audit';
import { adminCohort, unwrap, UUID } from '../../../../../lib/kocha/admin-common';

/**
 * GET  /api/admin/kocha/submissions → { submissions: [...] } newest first,
 *        each with coach (name, zone), lesson number and attachments.
 *        Filtering by lesson, zone and status happens in the inbox.
 * POST /api/admin/kocha/submissions → one of:
 *   { action: 'review', id, status, feedback }  — status and a note the coach sees
 *   { action: 'media_url', mediaId }            → { url } (5-minute signed link)
 *   { action: 'delete_coach_submissions', scholarId } — deletes the coach's
 *        submissions AND their uploaded files (data deletion requests)
 *
 * Submissions can show minors; they are only ever visible to the coach who
 * sent them and to admins, and attachments only through short-lived links.
 */

export async function GET(request) {
  if (!getAdminActor(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const db = getKochaSupabase();
    const cohort = await adminCohort(db);
    const [subs, scholars, weeks, assignments] = await Promise.all([
      db.from('submissions')
        .select('id, assignment_id, scholar_id, body, link_url, has_athlete_media, consent_confirmed, no_athlete_data, status, feedback, reviewed_by, reviewed_at, created_at, submission_media(id, kind, size_bytes)')
        .order('created_at', { ascending: false }).limit(500).then(unwrap),
      db.from('scholars').select('id, display_name, zone').eq('cohort_id', cohort.id).then(unwrap),
      db.from('weeks').select('id, n').eq('cohort_id', cohort.id).then(unwrap),
      db.from('assignments').select('id, week_id, title').then(unwrap),
    ]);
    const scholarById = Object.fromEntries(scholars.map((s) => [s.id, s]));
    const nByWeek = Object.fromEntries(weeks.map((w) => [w.id, w.n]));
    const assignmentById = Object.fromEntries(assignments.map((a) => [a.id, a]));
    return NextResponse.json({
      submissions: subs
        .filter((s) => scholarById[s.scholar_id])
        .map((s) => ({
          ...s,
          coach: scholarById[s.scholar_id],
          lesson: nByWeek[assignmentById[s.assignment_id]?.week_id] || null,
          homework_title: assignmentById[s.assignment_id]?.title || null,
        })),
    });
  } catch (err) {
    console.error('admin/kocha/submissions GET error:', err);
    return NextResponse.json({ error: 'Failed to load homework.' }, { status: 500 });
  }
}

export async function POST(request) {
  const actor = getAdminActor(request);
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json().catch(() => ({}));
    const db = getKochaSupabase();
    const bad = (error) => NextResponse.json({ error }, { status: 400 });

    if (body.action === 'review') {
      if (!UUID.test(body.id || '')) return bad('Missing submission.');
      if (!['submitted', 'reviewed', 'follow_up'].includes(body.status)) return bad('Invalid status.');
      const update = {
        status: body.status,
        feedback: sanitize(body.feedback || '').slice(0, 2000) || null,
        reviewed_by: body.status === 'submitted' ? null : actor,
        reviewed_at: body.status === 'submitted' ? null : new Date().toISOString(),
      };
      unwrap(await db.from('submissions').update(update).eq('id', body.id).select('id'));
      await logKochaAction({ actor, action: 'kocha.submission_review', resourceId: body.id, detail: { status: update.status } });
      return NextResponse.json({ ok: true });
    }

    if (body.action === 'media_url') {
      if (!UUID.test(body.mediaId || '')) return bad('Missing attachment.');
      const { data: media, error } = await db.from('submission_media').select('storage_path').eq('id', body.mediaId).single();
      if (error) throw error;
      const { data, error: signError } = await db.storage.from('kocha').createSignedUrl(media.storage_path, 300);
      if (signError) throw signError;
      return NextResponse.json({ url: data.signedUrl });
    }

    if (body.action === 'delete_coach_submissions') {
      if (!UUID.test(body.scholarId || '')) return bad('Missing coach.');
      const folder = `submissions/${body.scholarId}`;
      const { data: objects, error: listError } = await db.storage.from('kocha').list(folder, { limit: 1000 });
      if (listError) throw listError;
      if (objects?.length) {
        const { error: rmError } = await db.storage.from('kocha').remove(objects.map((o) => `${folder}/${o.name}`));
        if (rmError) throw rmError;
      }
      const deleted = unwrap(await db.from('submissions').delete().eq('scholar_id', body.scholarId).select('id'));
      const { error: tickError } = await db.from('progress').delete().eq('scholar_id', body.scholarId).eq('step', 'submit');
      if (tickError) throw tickError;
      await logKochaAction({ actor, action: 'kocha.submissions_delete', resourceId: body.scholarId, detail: { submissions: deleted.length, files: objects?.length || 0 } });
      return NextResponse.json({ ok: true, submissions: deleted.length, files: objects?.length || 0 });
    }

    return bad('Unknown action.');
  } catch (err) {
    console.error('admin/kocha/submissions POST error:', err);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
