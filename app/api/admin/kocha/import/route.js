import { NextResponse } from 'next/server';
import { getKochaSupabase } from '../../../../../lib/supabase';
import { getAdminActor } from '../../../../../lib/admin-auth';
import { logKochaAction } from '../../../../../lib/kocha/audit';
import { KOCHA_COHORT_SLUG } from '../../../../../lib/kocha/constants';
import {
  countReport, importManifest, nextUploadPath, recordUploadedFile,
} from '../../../../../lib/kocha/lesson-import';

/**
 * POST /api/admin/kocha/import — the admin "Import lessons" screen.
 *
 *   { action: 'run', manifest }                         → { before, after, result }
 *   { action: 'upload_url', fileId, filename, sha256 }   → { path, signedUrl, version } | { unchanged: true }
 *   { action: 'confirm', fileId, path, sha256, version } → { ok, size_bytes }
 *   { action: 'report' }                                 → { report }
 *
 * The manifest is written by lib/kocha/lesson-import.js (idempotent; admin
 * decisions are never overwritten). PDFs go straight from the admin's
 * browser to the private bucket through one-time signed upload URLs, and
 * the bucket — not the browser — confirms each upload and its size.
 */

const SHA256 = /^[0-9a-f]{64}$/;
const MAX_MANIFEST_BYTES = 500_000;

async function cohortId(db) {
  const { data, error } = await db.from('cohorts').select('id').eq('slug', KOCHA_COHORT_SLUG).single();
  if (error) throw error;
  return data.id;
}

async function lessonFile(db, cid, fileId) {
  const { data, error } = await db.from('files')
    .select('id, slug, storage_path, sha256, version, gate')
    .eq('id', fileId).eq('cohort_id', cid).like('slug', 'lesson-%').maybeSingle();
  if (error) throw error;
  return data;
}

export async function POST(request) {
  const actor = getAdminActor(request);
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const text = await request.text();
    if (text.length > MAX_MANIFEST_BYTES) return NextResponse.json({ error: 'That file is too large to be a manifest.' }, { status: 413 });
    const body = JSON.parse(text || '{}');
    const db = getKochaSupabase();
    const cid = await cohortId(db);

    if (body.action === 'report') {
      return NextResponse.json({ report: await countReport(db, cid) });
    }

    if (body.action === 'run') {
      const before = await countReport(db, cid);
      let result;
      try {
        result = await importManifest(db, cid, body.manifest);
      } catch (err) {
        if (err.validation) return NextResponse.json({ error: err.message }, { status: 400 });
        throw err;
      }
      const after = await countReport(db, cid);
      await logKochaAction({
        actor, action: 'kocha.import_lessons',
        detail: {
          lessons_set: result.lessons_set, videos_added: result.videos_added,
          videos_placed: result.videos_placed, files_added: result.files_added, gaps_added: result.gaps_added,
        },
      });
      return NextResponse.json({ before, after, result });
    }

    if (!body.fileId || typeof body.fileId !== 'string') {
      return NextResponse.json({ error: 'Missing file id.' }, { status: 400 });
    }
    const file = await lessonFile(db, cid, body.fileId);
    if (!file) return NextResponse.json({ error: 'Lesson file not found.' }, { status: 404 });
    if (body.sha256 && !SHA256.test(body.sha256)) return NextResponse.json({ error: 'Invalid fingerprint.' }, { status: 400 });

    if (body.action === 'upload_url') {
      if (!/\.pdf$/i.test(String(body.filename || ''))) {
        return NextResponse.json({ error: 'Lesson files must be PDFs.' }, { status: 400 });
      }
      const next = nextUploadPath(file, body.filename, body.sha256);
      if (!next) return NextResponse.json({ unchanged: true });
      const { data, error } = await db.storage.from('kocha').createSignedUploadUrl(next.path);
      if (error) throw error;
      return NextResponse.json({ path: next.path, signedUrl: data.signedUrl, version: next.version });
    }

    if (body.action === 'confirm') {
      const prefix = `files/${file.slug}/`;
      const path = String(body.path || '');
      const match = path.startsWith(prefix) && path.slice(prefix.length).match(/^v(\d+)-[A-Za-z0-9._-]+$/);
      if (!match) return NextResponse.json({ error: 'Invalid upload path.' }, { status: 400 });
      const name = path.slice(prefix.length);
      const { data: listed, error: listError } = await db.storage.from('kocha').list(`files/${file.slug}`, { search: name, limit: 10 });
      if (listError) throw listError;
      const object = (listed || []).find((o) => o.name === name);
      if (!object) return NextResponse.json({ error: 'Upload not found. Please try again.' }, { status: 400 });
      const update = await recordUploadedFile(db, file, {
        path, sizeBytes: object.metadata?.size ?? null, sha256: body.sha256, version: Number(match[1]),
      });
      await logKochaAction({ actor, action: 'kocha.file_upload', resourceId: file.id, detail: { version: update.version, size_bytes: update.size_bytes } });
      return NextResponse.json({ ok: true, size_bytes: update.size_bytes, version: update.version });
    }

    return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
  } catch (err) {
    console.error('admin/kocha/import error:', err);
    return NextResponse.json({ error: 'Import stopped part-way. It is safe to run it again: it finishes what is missing and never duplicates.' }, { status: 500 });
  }
}
