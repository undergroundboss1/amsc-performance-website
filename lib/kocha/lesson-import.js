/**
 * Import the Kocha Mwenzangu lessons manifest (lessons_manifest.json).
 *
 * Shared by the admin "Import lessons" screen (/api/admin/kocha/import)
 * and the command-line script (scripts/kocha/import-lessons.mjs). Takes a
 * Supabase client already bound to the 'kocha' schema, so it has no
 * imports of its own and runs the same in Next.js and plain Node.
 *
 * Idempotent, and admin decisions always win:
 *   - The FIRST import of a lesson sets its content from the manifest:
 *     title, one-sentence summary, homework text, published flag (false),
 *     "coming soon" state, and the nutrition hold for Weeks 7 and 8.
 *   - The first time a video is placed in a lesson, its week, group, role,
 *     order and details come from the manifest.
 *   - Re-running the import never changes those again — so Arnold's
 *     publish switches, unlock dates, homework edits, approvals, groups,
 *     roles and ordering are never overwritten. It only adds what is
 *     missing (new lessons, files, videos, gaps). Video approval status is
 *     never set by the import at all: everything arrives pending.
 *   - PDFs are fingerprinted (SHA-256): uploading the same file again is
 *     skipped; a changed file becomes a new version and the old one is kept.
 */

// Groups whose videos are about food or drink — part of the Sports
// Nutrition scope that is not agreed yet, so they stay behind the gate
// even when they sit in a non-nutrition lesson (e.g. Week 11 "Game day").
const NUTRITION_GROUPS = new Set(['food', 'hydration', 'game day']);

// Manifest group -> kocha.videos.movement_pattern (for the movement
// pattern view). Groups with no pattern keep movement_pattern NULL.
const GROUP_PATTERNS = {
  'jump tests': 'testing',
  'agility test': 'testing',
  'session rpe': null,
  landing: 'jumping-landing',
  squat: 'squat',
  ankles: null,
  'warm-up': 'warm-up',
  mobility: 'mobility',
  'hip hinge': 'hinge',
  core: 'core',
  'energy systems': 'energy-systems',
  conditioning: 'energy-systems',
  'stopping and changing direction': 'stopping-cod',
  push: 'push',
  pull: 'pull',
  'lunge and split squat': 'lunge',
  'single-leg strength': 'single-leg',
  carry: 'carry',
  food: 'nutrition',
  hydration: 'hydration',
  sleep: 'sleep',
  'return to play': 'return-to-play',
};

const STATUS_LABELS = {
  metadata_checked: 'Metadata checked',
  found_not_checked: 'Found, NOT checked',
};

export function lessonFileSlug(n, index = 0) {
  return `lesson-${String(n).padStart(2, '0')}${index ? `-${index + 1}` : ''}`;
}

export function basename(path) {
  return String(path || '').split(/[\\/]/).pop();
}

function slugify(text) {
  return String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'gap';
}

function orNull(value) {
  const v = typeof value === 'string' ? value.trim() : value;
  return v === '' || v === undefined || v === 'n/a' ? null : v;
}

/** Check the manifest's shape before anything is written. */
export function validateManifest(manifest) {
  const errors = [];
  if (!manifest || !Array.isArray(manifest.weeks)) {
    return ['This is not a lessons manifest: there is no "weeks" list.'];
  }
  const seen = new Set();
  for (const w of manifest.weeks) {
    if (!Number.isInteger(w.week) || w.week < 1 || w.week > 12) errors.push(`Week number ${w.week} must be 1 to 12.`);
    if (seen.has(w.week)) errors.push(`Week ${w.week} appears twice.`);
    seen.add(w.week);
    if (!w.title) errors.push(`Week ${w.week} has no title.`);
    for (const v of w.videos || []) {
      if (!/^[A-Za-z0-9_-]{11}$/.test(v.youtube_id || '')) errors.push(`Week ${w.week}: a video has an invalid YouTube id (${v.youtube_id}).`);
      if (!['start', 'deeper'].includes(v.role)) errors.push(`Week ${w.week}: video ${v.youtube_id} has role "${v.role}" (expected start or deeper).`);
    }
    for (const f of w.files || []) {
      if (f.format !== 'PDF') errors.push(`Week ${w.week}: only PDF lesson files are supported (${f.file}).`);
    }
  }
  return errors;
}

function unwrap({ data, error }) {
  if (error) throw error;
  return data || [];
}

/** Row counts the import reports before and after each run. */
export async function countReport(db, cohortId) {
  const [weeks, files, videos, gaps, assignments] = await Promise.all([
    db.from('weeks').select('n, lesson_imported_at, published').eq('cohort_id', cohortId).then(unwrap),
    db.from('files').select('slug, storage_path').eq('cohort_id', cohortId).like('slug', 'lesson-%').then(unwrap),
    db.from('videos').select('status, lesson_imported_at, kind').then(unwrap),
    db.from('video_gaps').select('resolved_at').eq('cohort_id', cohortId).then(unwrap),
    db.from('assignments').select('id').then(unwrap),
  ]);
  return {
    lessons: weeks.length,
    lessons_imported: weeks.filter((w) => w.lesson_imported_at).length,
    lessons_published: weeks.filter((w) => w.published).length,
    lesson_pdfs: files.length,
    lesson_pdfs_uploaded: files.filter((f) => f.storage_path).length,
    videos: videos.filter((v) => v.kind === 'youtube').length,
    videos_in_lessons: videos.filter((v) => v.lesson_imported_at).length,
    videos_approved: videos.filter((v) => v.status === 'approved').length,
    homework: assignments.length,
    gaps_open: gaps.filter((g) => !g.resolved_at).length,
  };
}

/**
 * Write the manifest's lessons, homework, file rows, videos and gaps.
 * Returns what changed and which PDFs still need uploading.
 */
export async function importManifest(db, cohortId, manifest, { now = new Date() } = {}) {
  const errors = validateManifest(manifest);
  if (errors.length) {
    const err = new Error(errors.join(' '));
    err.validation = errors;
    throw err;
  }
  const stamp = now.toISOString();

  const [weekRows, fileRows, videoRows] = await Promise.all([
    db.from('weeks').select('id, n, gate, lesson_imported_at').eq('cohort_id', cohortId).then(unwrap),
    db.from('files').select('id, slug, storage_path, sha256, version').eq('cohort_id', cohortId).like('slug', 'lesson-%').then(unwrap),
    db.from('videos').select('id, source_key, lesson_imported_at').then(unwrap),
  ]);
  const weekByN = Object.fromEntries(weekRows.map((w) => [w.n, w]));
  const fileBySlug = Object.fromEntries(fileRows.map((f) => [f.slug, f]));
  const videoByKey = Object.fromEntries(videoRows.map((v) => [v.source_key, v]));

  const missingWeeks = manifest.weeks.filter((w) => !weekByN[w.week]).map((w) => w.week);
  if (missingWeeks.length) {
    throw new Error(`Weeks ${missingWeeks.join(', ')} are not in the database yet. Run the Kocha seed first.`);
  }

  const result = {
    lessons_set: [], lessons_kept: [], homework_set: 0,
    files_added: 0, videos_added: 0, videos_placed: 0, videos_kept: 0, gaps_added: 0,
    uploads: [],
  };

  const weekUpdates = [];
  const homeworkRows = [];
  const newFiles = [];
  const videoUpserts = [];
  const gapRows = [];

  for (const w of manifest.weeks) {
    const week = weekByN[w.week];
    const held = Boolean(w.hold_reason);
    const gate = held ? 'nutrition' : week.gate;

    // --- Lesson content: first import only ---
    if (!week.lesson_imported_at) {
      const update = {
        title: w.title,
        content_ready: w.content_ready !== false,
        published: w.published === true && !held,
        gate,
        lesson_imported_at: stamp,
      };
      if (w.one_sentence) update.takeaway = w.one_sentence;
      weekUpdates.push({ id: week.id, n: w.week, update });

      if (w.homework) {
        homeworkRows.push({
          week_id: week.id,
          title: w.homework.title,
          time_needed: orNull(w.homework.time_needed),
          brief: w.homework.brief,
          submit_what: w.homework.send || 'Send it to AMSC.',
          // The manifest's homework has no checklist or example; the
          // lesson PDF's page 2 carries the steps. Clear the v1 drafts so
          // nothing on the page contradicts the PDF.
          done_checklist: [],
          example: null,
        });
      }
    } else {
      result.lessons_kept.push(w.week);
    }

    // --- Lesson PDF rows ---
    (w.files || []).forEach((f, i) => {
      const slug = lessonFileSlug(w.week, i);
      const existing = fileBySlug[slug];
      if (!existing) {
        newFiles.push({
          cohort_id: cohortId,
          slug,
          title: `Lesson ${w.week} study card and homework sheet`,
          description: 'Page 1 is the study card. Page 2 is the homework sheet to print.',
          kind: 'study_card',
          format: 'PDF',
          audience: f.audience === 'admin' ? 'admin' : 'scholar',
          source: 'hosted',
          weeks: [w.week],
          show_on_home: false,
          gate: held ? 'nutrition' : null,
          published: false,
          version_label: orNull(f.version),
          sort: 100 + w.week,
        });
      }
      result.uploads.push({ week: w.week, slug, filename: basename(f.file) });
    });

    // --- Videos: placed from the manifest the first time only ---
    (w.videos || []).forEach((v, i) => {
      const key = `yt:${v.youtube_id}`;
      const existing = videoByKey[key];
      if (existing && existing.lesson_imported_at) {
        result.videos_kept += 1;
        return;
      }
      const group = orNull(v.group);
      const nutrition = held || NUTRITION_GROUPS.has(String(group || '').toLowerCase());
      videoUpserts.push({
        source_key: key,
        kind: 'youtube',
        youtube_id: v.youtube_id,
        url: v.url || `https://www.youtube.com/watch?v=${v.youtube_id}`,
        title: orNull(v.title),
        channel: orNull(v.channel),
        length_text: orNull(v.length),
        why_watch: orNull(v.why),
        weeks: [w.week],
        topic: group,
        movement_pattern: GROUP_PATTERNS[String(group || '').toLowerCase()] ?? null,
        audience_level: v.role === 'start' ? 'beginner' : 'deeper',
        shortlist_status: STATUS_LABELS[v.status] || v.status || null,
        gate: nutrition ? 'nutrition' : null,
        added_by: 'lessons manifest',
        sort: w.week * 100 + i,
        lesson_imported_at: stamp,
      });
      if (existing) result.videos_placed += 1; else result.videos_added += 1;
    });

    for (const g of w.gaps || []) {
      gapRows.push({
        cohort_id: cohortId, gap_key: `w${w.week}:${slugify(g.topic)}`,
        week_n: w.week, topic: g.topic, note: orNull(g.note),
      });
    }
  }
  for (const g of manifest.safeguarding_gap || []) {
    gapRows.push({ cohort_id: cohortId, gap_key: `all:${slugify(g.topic)}`, week_n: null, topic: g.topic, note: orNull(g.note) });
  }

  if (homeworkRows.length) {
    unwrap(await db.from('assignments').upsert(homeworkRows, { onConflict: 'week_id' }).select('id'));
    result.homework_set = homeworkRows.length;
  }
  if (newFiles.length) {
    const added = unwrap(await db.from('files').upsert(newFiles, { onConflict: 'cohort_id,slug', ignoreDuplicates: true }).select('id'));
    result.files_added = added.length;
  }
  if (videoUpserts.length) {
    // New rows arrive 'pending' (the column default); existing rows keep
    // their status because status is never part of this payload.
    unwrap(await db.from('videos').upsert(videoUpserts, { onConflict: 'source_key' }).select('id'));
  }
  if (gapRows.length) {
    const added = unwrap(await db.from('video_gaps').upsert(gapRows, { onConflict: 'cohort_id,gap_key', ignoreDuplicates: true }).select('id'));
    result.gaps_added = added.length;
  }

  // Lessons are marked imported LAST: if anything above fails, the next
  // run redoes this lesson's content in full instead of skipping it.
  for (const { id, n, update } of weekUpdates) {
    unwrap(await db.from('weeks').update(update).eq('id', id).select('id'));
    result.lessons_set.push(n);
  }

  // Attach file ids (and whether each PDF is already stored) to the uploads.
  const files = unwrap(await db.from('files').select('id, slug, storage_path, sha256, version, gate')
    .eq('cohort_id', cohortId).like('slug', 'lesson-%'));
  const bySlug = Object.fromEntries(files.map((f) => [f.slug, f]));
  result.uploads = result.uploads.map((u) => ({
    ...u,
    fileId: bySlug[u.slug].id,
    stored: Boolean(bySlug[u.slug].storage_path),
    sha256: bySlug[u.slug].sha256,
  }));
  return result;
}

/**
 * Where the next upload of a lesson file goes, or null when the stored
 * file already has this fingerprint (same PDF uploaded again).
 */
export function nextUploadPath(file, filename, sha256) {
  if (sha256 && file.sha256 === sha256 && file.storage_path) return null;
  const version = file.storage_path ? file.version + 1 : file.version;
  const safe = basename(filename).replace(/[^A-Za-z0-9._-]+/g, '_').slice(-100);
  return { path: `files/${file.slug}/v${version}-${safe}`, version };
}

/**
 * Record an uploaded lesson file. Lesson PDFs are published as files
 * straight away — coaches still only see them once the LESSON is
 * published — except held (nutrition) lessons, whose PDFs stay
 * unpublished and gated until Arnold publishes them himself.
 */
export async function recordUploadedFile(db, file, { path, sizeBytes, sha256, version }) {
  const update = {
    storage_path: path,
    size_bytes: sizeBytes ?? null,
    sha256: sha256 || null,
    version,
    source: 'hosted',
  };
  if (!file.gate) update.published = true;
  unwrap(await db.from('files').update(update).eq('id', file.id).select('id'));
  return update;
}
