#!/usr/bin/env node
/**
 * Import the Kocha Mwenzangu lessons manifest from the command line —
 * the same logic as the admin "Import lessons" screen
 * (lib/kocha/lesson-import.js), for anyone working from a computer.
 *
 *   NEXT_PUBLIC_SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… \
 *     node scripts/kocha/import-lessons.mjs path/to/lesson-pack-folder
 *
 * The folder holds lessons_manifest.json and the lesson PDFs it names.
 * Safe to run any number of times; prints a row-count report each run.
 * Never commit the lesson PDFs: this repository is public, and the
 * Week 7 and 8 PDFs are on hold.
 */
import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import {
  countReport, importManifest, nextUploadPath, recordUploadedFile,
} from '../../lib/kocha/lesson-import.js';

const folder = process.argv[2];
if (!folder) {
  console.error('Usage: node scripts/kocha/import-lessons.mjs <lesson-pack-folder>');
  process.exit(1);
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first.');
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false }, db: { schema: 'kocha' } });
const manifest = JSON.parse(readFileSync(join(folder, 'lessons_manifest.json'), 'utf8'));

const { data: cohort, error } = await db.from('cohorts').select('id').eq('slug', 'cluster-a').single();
if (error) throw error;

const before = await countReport(db, cohort.id);
const result = await importManifest(db, cohort.id, manifest);

let uploaded = 0;
let unchanged = 0;
const missing = [];
for (const u of result.uploads) {
  const local = join(folder, u.filename);
  if (!existsSync(local)) { missing.push(u.filename); continue; }
  const bytes = readFileSync(local);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const { data: file } = await db.from('files').select('id, slug, storage_path, sha256, version, gate').eq('id', u.fileId).single();
  const next = nextUploadPath(file, u.filename, sha256);
  if (!next) { unchanged += 1; continue; }
  const { error: upErr } = await db.storage.from('kocha').upload(next.path, bytes, { contentType: 'application/pdf', upsert: false });
  if (upErr) throw upErr;
  await recordUploadedFile(db, file, { path: next.path, sizeBytes: bytes.length, sha256, version: next.version });
  uploaded += 1;
}

const after = await countReport(db, cohort.id);
console.log('Lessons set from manifest:', result.lessons_set.join(', ') || 'none (already imported)');
console.log(`PDFs: ${uploaded} uploaded, ${unchanged} unchanged${missing.length ? `, missing: ${missing.join(', ')}` : ''}`);
console.log(`Videos: ${result.videos_added} added, ${result.videos_placed} placed in lessons, ${result.videos_kept} kept as they are`);
console.log(`Gaps added: ${result.gaps_added}`);
console.table(Object.fromEntries(Object.keys(after).map((k) => [k, { before: before[k], after: after[k] }])));
