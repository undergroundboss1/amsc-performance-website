import { NextResponse } from 'next/server';
import { getKochaSupabase } from '../../../../../lib/supabase';
import { getAdminActor } from '../../../../../lib/admin-auth';
import { sanitize } from '../../../../../lib/validators';
import { logKochaAction } from '../../../../../lib/kocha/audit';
import { adminCohort, unwrap, UUID } from '../../../../../lib/kocha/admin-common';

/**
 * GET  /api/admin/kocha/lessons → everything the Lessons screen needs:
 *        { settings, lessons: [{ ...week, homework, pdf, videos, gaps, readiness }], courseGaps }
 * POST /api/admin/kocha/lessons → one of:
 *   { action: 'update_settings', lessonAccessMode?, nutritionEnabled? }
 *   { action: 'update_lesson', id, published?, releaseAt?, title?, takeaway?, contentReady? }
 *   { action: 'update_homework', weekId, title, timeNeeded, brief, submitWhat }
 *   { action: 'update_video', id, status?, topic?, role?, notes? }
 *   { action: 'move_video', id, direction: 'up' | 'down' }
 *   { action: 'resolve_gap', id, resolved }
 *   { action: 'create_pdf_row', weekId }  → { file } (a lesson-NN file row, for lessons with no PDF yet)
 *
 * Admin-only. Every write goes to kocha.admin_actions.
 */

const VIDEO_COLUMNS =
  'id, kind, youtube_id, url, title, channel, length_text, why_watch, weeks, topic, audience_level, status, ' +
  'shortlist_status, gate, notes, sort, reviewed_by, reviewed_at, link_ok, link_checked_at';

export async function GET(request) {
  if (!getAdminActor(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const db = getKochaSupabase();
    const cohort = await adminCohort(db);
    const [weeks, assignments, files, videos, gaps] = await Promise.all([
      db.from('weeks').select('id, n, title, takeaway, class_on, release_at, due_at, published, gate, content_ready, lesson_imported_at')
        .eq('cohort_id', cohort.id).order('n').then(unwrap),
      db.from('assignments').select('id, week_id, title, time_needed, brief, submit_what').then(unwrap),
      db.from('files').select('id, slug, title, weeks, kind, storage_path, size_bytes, version, version_label, published, gate, updated_at')
        .eq('cohort_id', cohort.id).eq('kind', 'study_card').then(unwrap),
      db.from('videos').select(VIDEO_COLUMNS).eq('kind', 'youtube').order('sort').then(unwrap),
      db.from('video_gaps').select('id, week_n, topic, note, resolved_at').eq('cohort_id', cohort.id).order('week_n').then(unwrap),
    ]);
    const lessons = weeks.map((w) => {
      const homework = assignments.find((a) => a.week_id === w.id) || null;
      const pdf = files.find((f) => (f.weeks || []).includes(w.n)) || null;
      const lessonVideos = videos.filter((v) => (v.weeks || []).includes(w.n));
      return {
        ...w,
        homework,
        pdf,
        videos: lessonVideos,
        gaps: gaps.filter((g) => g.week_n === w.n),
        readiness: {
          pdf: Boolean(pdf?.storage_path),
          videos_approved: lessonVideos.filter((v) => v.status === 'approved').length,
          videos_total: lessonVideos.length,
          videos_start_approved: lessonVideos.filter((v) => v.status === 'approved' && v.audience_level !== 'deeper').length,
          homework: Boolean(homework),
          published: w.published,
          held: w.gate === 'nutrition',
        },
      };
    });
    return NextResponse.json({
      settings: { lessonAccessMode: cohort.lesson_access_mode, nutritionEnabled: cohort.nutrition_enabled },
      lessons,
      courseGaps: gaps.filter((g) => g.week_n === null),
      unplacedVideos: videos.filter((v) => !(v.weeks || []).length),
    });
  } catch (err) {
    console.error('admin/kocha/lessons GET error:', err);
    return NextResponse.json({ error: 'Failed to load lessons.' }, { status: 500 });
  }
}

export async function POST(request) {
  const actor = getAdminActor(request);
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json().catch(() => ({}));
    const db = getKochaSupabase();
    const cohort = await adminCohort(db);
    const bad = (error) => NextResponse.json({ error }, { status: 400 });

    if (body.action === 'update_settings') {
      const update = {};
      if (body.lessonAccessMode !== undefined) {
        if (!['open', 'by_week'].includes(body.lessonAccessMode)) return bad('Invalid access mode.');
        update.lesson_access_mode = body.lessonAccessMode;
      }
      if (body.nutritionEnabled !== undefined) update.nutrition_enabled = body.nutritionEnabled === true;
      unwrap(await db.from('cohorts').update(update).eq('id', cohort.id).select('id'));
      await logKochaAction({ actor, action: 'kocha.settings_update', detail: update });
      return NextResponse.json({ ok: true });
    }

    if (body.action === 'update_lesson') {
      if (!UUID.test(body.id || '')) return bad('Missing lesson.');
      const update = {};
      if (body.published !== undefined) update.published = body.published === true;
      if (body.contentReady !== undefined) update.content_ready = body.contentReady === true;
      if (body.releaseAt !== undefined) {
        const d = new Date(body.releaseAt);
        if (isNaN(d.getTime())) return bad('Invalid unlock date.');
        update.release_at = d.toISOString();
      }
      if (body.title !== undefined) {
        const title = sanitize(body.title).slice(0, 120);
        if (!title) return bad('A lesson needs a title.');
        update.title = title;
      }
      if (body.takeaway !== undefined) update.takeaway = sanitize(body.takeaway).slice(0, 300) || null;
      unwrap(await db.from('weeks').update(update).eq('id', body.id).eq('cohort_id', cohort.id).select('id'));
      await logKochaAction({ actor, action: 'kocha.lesson_update', resourceId: body.id, detail: update });
      return NextResponse.json({ ok: true });
    }

    if (body.action === 'update_homework') {
      if (!UUID.test(body.weekId || '')) return bad('Missing lesson.');
      const row = {
        week_id: body.weekId,
        title: sanitize(body.title || '').slice(0, 120),
        time_needed: sanitize(body.timeNeeded || '').slice(0, 120) || null,
        brief: sanitize(body.brief || '').slice(0, 2000),
        submit_what: sanitize(body.submitWhat || '').slice(0, 300),
      };
      if (!row.title || !row.brief || !row.submit_what) return bad('Homework needs a title, what to do and what to send.');
      unwrap(await db.from('assignments').upsert(row, { onConflict: 'week_id' }).select('id'));
      await logKochaAction({ actor, action: 'kocha.homework_update', resourceId: body.weekId });
      return NextResponse.json({ ok: true });
    }

    if (body.action === 'update_video') {
      if (!UUID.test(body.id || '')) return bad('Missing video.');
      const update = {};
      if (body.status !== undefined) {
        if (!['pending', 'approved', 'rejected'].includes(body.status)) return bad('Invalid status.');
        update.status = body.status;
        update.reviewed_by = body.status === 'pending' ? null : actor;
        update.reviewed_at = body.status === 'pending' ? null : new Date().toISOString();
      }
      if (body.topic !== undefined) update.topic = sanitize(body.topic).slice(0, 60) || null;
      if (body.role !== undefined) {
        if (!['start', 'deeper'].includes(body.role)) return bad('Role must be start or deeper.');
        update.audience_level = body.role === 'start' ? 'beginner' : 'deeper';
      }
      if (body.notes !== undefined) update.notes = sanitize(body.notes).slice(0, 500) || null;
      const { error } = await db.from('videos').update(update).eq('id', body.id);
      if (error) {
        if (error.code === '23514') return bad('This video needs a title and link before it can be approved.');
        throw error;
      }
      await logKochaAction({ actor, action: 'kocha.video_update', resourceId: body.id, detail: update });
      return NextResponse.json({ ok: true });
    }

    if (body.action === 'move_video') {
      if (!UUID.test(body.id || '') || !['up', 'down'].includes(body.direction)) return bad('Invalid move.');
      const { data: video, error } = await db.from('videos').select('id, weeks, sort').eq('id', body.id).single();
      if (error) throw error;
      const n = (video.weeks || [])[0];
      if (!n) return bad('This video is not in a lesson.');
      const siblings = unwrap(await db.from('videos').select('id, sort').contains('weeks', [n]).order('sort'));
      // Renumber the lesson's videos so every position is distinct, then swap.
      const order = siblings.map((s) => s.id);
      const i = order.indexOf(video.id);
      const j = body.direction === 'up' ? i - 1 : i + 1;
      if (j < 0 || j >= order.length) return NextResponse.json({ ok: true });
      [order[i], order[j]] = [order[j], order[i]];
      await Promise.all(order.map((id, k) => db.from('videos').update({ sort: n * 100 + k }).eq('id', id).then(unwrap)));
      await logKochaAction({ actor, action: 'kocha.video_reorder', resourceId: body.id, detail: { lesson: n, direction: body.direction } });
      return NextResponse.json({ ok: true });
    }

    if (body.action === 'resolve_gap') {
      if (!UUID.test(body.id || '')) return bad('Missing gap.');
      unwrap(await db.from('video_gaps').update({ resolved_at: body.resolved ? new Date().toISOString() : null })
        .eq('id', body.id).eq('cohort_id', cohort.id).select('id'));
      await logKochaAction({ actor, action: 'kocha.gap_update', resourceId: body.id, detail: { resolved: Boolean(body.resolved) } });
      return NextResponse.json({ ok: true });
    }

    if (body.action === 'create_pdf_row') {
      if (!UUID.test(body.weekId || '')) return bad('Missing lesson.');
      const { data: week, error } = await db.from('weeks').select('id, n, gate').eq('id', body.weekId).eq('cohort_id', cohort.id).single();
      if (error) throw error;
      const slug = `lesson-${String(week.n).padStart(2, '0')}`;
      const rows = unwrap(await db.from('files').upsert({
        cohort_id: cohort.id, slug,
        title: `Lesson ${week.n} study card and homework sheet`,
        description: 'Page 1 is the study card. Page 2 is the homework sheet to print.',
        kind: 'study_card', format: 'PDF', audience: 'scholar', source: 'hosted',
        weeks: [week.n], gate: week.gate, published: false, sort: 100 + week.n,
      }, { onConflict: 'cohort_id,slug', ignoreDuplicates: true }).select('id'));
      const { data: file, error: fileError } = await db.from('files').select('id, slug').eq('cohort_id', cohort.id).eq('slug', slug).single();
      if (fileError) throw fileError;
      if (rows.length) await logKochaAction({ actor, action: 'kocha.file_create', resourceId: file.id, detail: { lesson: week.n } });
      return NextResponse.json({ file });
    }

    return bad('Unknown action.');
  } catch (err) {
    console.error('admin/kocha/lessons POST error:', err);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
