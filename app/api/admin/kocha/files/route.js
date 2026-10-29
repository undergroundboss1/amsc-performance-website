import { NextResponse } from 'next/server';
import { getKochaSupabase } from '../../../../../lib/supabase';
import { getAdminActor } from '../../../../../lib/admin-auth';
import { sanitize } from '../../../../../lib/validators';
import { logKochaAction } from '../../../../../lib/kocha/audit';
import { FILE_KIND_LABELS, KOCHA_COHORT_SLUG } from '../../../../../lib/kocha/constants';

/**
 * GET  /api/admin/kocha/files → { files: [...with download_count] }
 * POST /api/admin/kocha/files → one of:
 *   { action: 'create', title, description?, kind, format, weeks[], showOnHome, source, externalUrl? }
 *   { action: 'update', id, ...same fields, published?, audience?, sort? }
 *   { action: 'upload_url', id, filename }        → { path, signedUrl }
 *   { action: 'confirm_upload', id, path }
 *
 * Uploads go straight from the admin's browser to the private 'kocha'
 * bucket through a one-time signed upload URL, so files never pass through
 * (or hit the body-size limit of) a serverless function. Every upload is a
 * new object (files/<slug>/v<n>-<name>): replacing a file bumps its version
 * and keeps the old object, so a bad upload can be rolled back.
 */

const KINDS = Object.keys(FILE_KIND_LABELS);
const FORMATS = { PDF: ['pdf'], XLSX: ['xlsx'] };
const SOURCES = ['hosted', 'whatsapp', 'external'];

async function cohortId(db) {
  const { data, error } = await db.from('cohorts').select('id').eq('slug', KOCHA_COHORT_SLUG).single();
  if (error) throw error;
  return data.id;
}

function slugify(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'file';
}

/** Validate the editable fields present in body; returns { fields } or { error }. */
function parseFields(body, { creating }) {
  const fields = {};
  if (creating || body.title !== undefined) {
    const title = sanitize(body.title || '').slice(0, 120);
    if (!title) return { error: 'Enter a title.' };
    fields.title = title;
  }
  if (body.description !== undefined) fields.description = sanitize(body.description || '').slice(0, 300) || null;
  if (creating || body.kind !== undefined) {
    if (!KINDS.includes(body.kind)) return { error: 'Choose a file type.' };
    fields.kind = body.kind;
  }
  if (creating || body.format !== undefined) {
    if (!FORMATS[body.format]) return { error: 'Format must be PDF or XLSX.' };
    fields.format = body.format;
  }
  if (body.weeks !== undefined) {
    const weeks = Array.isArray(body.weeks) ? body.weeks.map(Number) : [];
    if (weeks.some((n) => !Number.isInteger(n) || n < 1 || n > 12)) return { error: 'Weeks must be 1 to 12.' };
    fields.weeks = [...new Set(weeks)].sort((a, b) => a - b);
  }
  if (body.showOnHome !== undefined) fields.show_on_home = body.showOnHome === true;
  if (creating || body.source !== undefined) {
    const source = body.source || 'hosted';
    if (!SOURCES.includes(source)) return { error: 'Invalid source.' };
    fields.source = source;
  }
  if (body.externalUrl !== undefined) {
    const url = String(body.externalUrl || '').trim();
    if (url && !/^https:\/\/\S+$/.test(url)) return { error: 'Links must start with https://' };
    fields.external_url = url || null;
  }
  if (body.published !== undefined) fields.published = body.published === true;
  if (body.audience !== undefined) {
    if (!['scholar', 'admin'].includes(body.audience)) return { error: 'Invalid audience.' };
    fields.audience = body.audience;
  }
  if (body.sort !== undefined) {
    const sort = Number(body.sort);
    if (!Number.isInteger(sort)) return { error: 'Invalid order.' };
    fields.sort = sort;
  }
  return { fields };
}

export async function GET(request) {
  if (!getAdminActor(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const db = getKochaSupabase();
    const [{ data: files, error }, { data: events, error: eventsError }] = await Promise.all([
      db.from('files').select('*').eq('cohort_id', await cohortId(db)).order('sort'),
      db.from('download_events').select('file_id'),
    ]);
    if (error) throw error;
    if (eventsError) throw eventsError;
    const counts = {};
    for (const e of events || []) counts[e.file_id] = (counts[e.file_id] || 0) + 1;
    return NextResponse.json({
      files: (files || []).map((f) => ({ ...f, download_count: counts[f.id] || 0 })),
    });
  } catch (err) {
    console.error('admin/kocha/files GET error:', err);
    return NextResponse.json({ error: 'Failed to load files.' }, { status: 500 });
  }
}

export async function POST(request) {
  const actor = getAdminActor(request);
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json().catch(() => ({}));
    const db = getKochaSupabase();

    if (body.action === 'create') {
      const { fields, error: invalid } = parseFields(body, { creating: true });
      if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });
      const slug = `${slugify(fields.title)}-${Math.random().toString(36).slice(2, 6)}`;
      const { data, error } = await db
        .from('files')
        .insert({ ...fields, slug, cohort_id: await cohortId(db), published: false })
        .select('*')
        .single();
      if (error) throw error;
      await logKochaAction({ actor, action: 'kocha.file_create', resourceId: data.id, detail: { title: data.title } });
      return NextResponse.json({ file: data });
    }

    if (!body.id || typeof body.id !== 'string') {
      return NextResponse.json({ error: 'Missing file id.' }, { status: 400 });
    }
    const { data: file, error: fileError } = await db.from('files').select('*').eq('id', body.id).maybeSingle();
    if (fileError) throw fileError;
    if (!file) return NextResponse.json({ error: 'File not found.' }, { status: 404 });

    if (body.action === 'update') {
      const { fields, error: invalid } = parseFields(body, { creating: false });
      if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });
      const { error } = await db.from('files').update(fields).eq('id', file.id);
      if (error) {
        if (error.code === '23514') {
          return NextResponse.json(
            { error: 'Upload the file (or add its link) before publishing it.' },
            { status: 400 }
          );
        }
        throw error;
      }
      await logKochaAction({ actor, action: 'kocha.file_update', resourceId: file.id, detail: fields });
      return NextResponse.json({ ok: true });
    }

    if (body.action === 'upload_url') {
      const name = String(body.filename || '').split(/[\\/]/).pop();
      const ext = name.split('.').pop().toLowerCase();
      if (!FORMATS[file.format].includes(ext)) {
        return NextResponse.json({ error: `This file is listed as ${file.format}. Choose a .${FORMATS[file.format][0]} file.` }, { status: 400 });
      }
      const safeName = name.replace(/[^A-Za-z0-9._-]+/g, '_').slice(-100);
      const version = file.storage_path ? file.version + 1 : file.version;
      const path = `files/${file.slug}/v${version}-${safeName}`;
      const { data, error } = await db.storage.from('kocha').createSignedUploadUrl(path);
      if (error) throw error;
      return NextResponse.json({ path, signedUrl: data.signedUrl });
    }

    if (body.action === 'confirm_upload') {
      const path = String(body.path || '');
      const prefix = `files/${file.slug}/`;
      const match = path.startsWith(prefix) && path.slice(prefix.length).match(/^v(\d+)-[A-Za-z0-9._-]+$/);
      if (!match) return NextResponse.json({ error: 'Invalid upload path.' }, { status: 400 });

      // Trust the bucket, not the browser, for whether the upload happened
      // and how big it is.
      const objectName = path.slice(prefix.length);
      const { data: listed, error: listError } = await db.storage
        .from('kocha')
        .list(`files/${file.slug}`, { search: objectName, limit: 10 });
      if (listError) throw listError;
      const object = (listed || []).find((o) => o.name === objectName);
      if (!object) return NextResponse.json({ error: 'Upload not found. Please try again.' }, { status: 400 });

      const update = {
        storage_path: path,
        size_bytes: object.metadata?.size ?? null,
        version: Number(match[1]),
        source: 'hosted',
      };
      const { error } = await db.from('files').update(update).eq('id', file.id);
      if (error) throw error;
      await logKochaAction({
        actor, action: 'kocha.file_upload', resourceId: file.id,
        detail: { version: update.version, size_bytes: update.size_bytes },
      });
      return NextResponse.json({ ok: true, ...update });
    }

    return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
  } catch (err) {
    console.error('admin/kocha/files POST error:', err);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
