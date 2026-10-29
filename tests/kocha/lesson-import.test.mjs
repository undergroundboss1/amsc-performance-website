import { test } from 'node:test';
import assert from 'node:assert/strict';
import { basename, lessonFileSlug, nextUploadPath, validateManifest } from '../../lib/kocha/lesson-import.js';

test('lesson file slugs and basenames', () => {
  assert.equal(lessonFileSlug(3), 'lesson-03');
  assert.equal(lessonFileSlug(12, 1), 'lesson-12-2');
  assert.equal(basename('lessons/Week03_Movement-and-injury-risk.pdf'), 'Week03_Movement-and-injury-risk.pdf');
});

test('manifest validation catches the mistakes that would corrupt lessons', () => {
  assert.deepEqual(validateManifest({ weeks: [{ week: 1, title: 'A', videos: [{ youtube_id: 'IBC00PJ28uk', role: 'start' }] }] }), []);
  assert.equal(validateManifest({}).length, 1);
  const errors = validateManifest({ weeks: [
    { week: 1, title: 'A' }, { week: 1, title: 'B' }, { week: 13 }, { week: 2, title: 'C', videos: [{ youtube_id: 'bad', role: 'later' }] },
    { week: 3, title: 'D', files: [{ format: 'DOCX', file: 'x.docx' }] },
  ] });
  assert.ok(errors.some((e) => /appears twice/.test(e)));
  assert.ok(errors.some((e) => /1 to 12/.test(e)));
  assert.ok(errors.some((e) => /invalid YouTube id/.test(e)));
  assert.ok(errors.some((e) => /role "later"/.test(e)));
  assert.ok(errors.some((e) => /only PDF/.test(e)));
});

test('the same PDF is never uploaded twice; a changed one becomes the next version', () => {
  const fresh = { slug: 'lesson-03', storage_path: null, sha256: null, version: 1 };
  assert.deepEqual(nextUploadPath(fresh, 'Week03 Movement.pdf', 'a'.repeat(64)), { path: 'files/lesson-03/v1-Week03_Movement.pdf', version: 1 });
  const stored = { slug: 'lesson-03', storage_path: 'files/lesson-03/v1-x.pdf', sha256: 'a'.repeat(64), version: 1 };
  assert.equal(nextUploadPath(stored, 'x.pdf', 'a'.repeat(64)), null);
  assert.deepEqual(nextUploadPath(stored, 'x.pdf', 'b'.repeat(64)), { path: 'files/lesson-03/v2-x.pdf', version: 2 });
});
