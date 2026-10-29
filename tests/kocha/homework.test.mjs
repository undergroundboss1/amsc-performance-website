import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkSubmission, checkUpload } from '../../lib/kocha/homework.js';

const ME = '11111111-1111-4111-8111-111111111111';
const photo = (n = 1) => ({ kind: 'photo', path: `submissions/${ME}/0000000${n}-0000-4000-8000-000000000000.jpg` });
const voice = { kind: 'audio', path: `submissions/${ME}/00000009-0000-4000-8000-000000000000.m4a` };

test('a text-only submission needs no consent and is not athlete media', () => {
  const { row, error } = checkSubmission({ body: 'Ran the session; 12 athletes.' }, ME);
  assert.equal(error, undefined);
  assert.deepEqual(row, { body: 'Ran the session; 12 athletes.', link_url: null, no_athlete_data: false, has_athlete_media: false, consent_confirmed: false });
});

test('photos or a video link always need the consent tick', () => {
  assert.match(checkSubmission({ media: [photo()] }, ME).error, /consent/);
  assert.match(checkSubmission({ linkUrl: 'https://drive.google.com/x' }, ME).error, /consent/);
  assert.match(checkSubmission({ media: [photo()], noAthleteData: true }, ME).error, /consent/);
});

test('with consent, photos count as athlete media unless "no athlete data" is ticked', () => {
  assert.equal(checkSubmission({ media: [photo()], consent: true }, ME).row.has_athlete_media, true);
  const noData = checkSubmission({ media: [photo()], consent: true, noAthleteData: true }, ME).row;
  assert.equal(noData.has_athlete_media, false);
  assert.equal(noData.no_athlete_data, true);
  assert.equal(noData.consent_confirmed, true);
});

test('a voice note alone needs no consent (it is the coach speaking)', () => {
  const { row, error } = checkSubmission({ media: [voice] }, ME);
  assert.equal(error, undefined);
  assert.equal(row.has_athlete_media, false);
});

test('flags always satisfy the database CHECKs', () => {
  for (const body of [
    { body: 'x' }, { media: [photo()], consent: true }, { media: [photo()], consent: true, noAthleteData: true },
    { linkUrl: 'https://youtu.be/x', consent: true }, { media: [voice], noAthleteData: true },
  ]) {
    const { row } = checkSubmission(body, ME);
    assert.ok(!row.has_athlete_media || row.consent_confirmed, 'media requires consent');
    assert.ok(!(row.has_athlete_media && row.no_athlete_data), 'media and no-data are exclusive');
  }
});

test("attachments must be in the coach's own folder", () => {
  const other = { kind: 'photo', path: 'submissions/22222222-2222-4222-8222-222222222222/00000001-0000-4000-8000-000000000000.jpg' };
  assert.equal(checkSubmission({ media: [other], consent: true }, ME).error, 'Invalid attachment.');
  assert.equal(checkSubmission({ media: [{ kind: 'photo', path: `submissions/${ME}/../x.jpg` }], consent: true }, ME).error, 'Invalid attachment.');
  assert.equal(checkSubmission({ media: [{ kind: 'photo', path: 'files/lesson-01/v1-x.pdf' }], consent: true }, ME).error, 'Invalid attachment.');
});

test('limits: 3 photos, 1 voice note, https links, something to send', () => {
  assert.match(checkSubmission({ media: [photo(1), photo(2), photo(3), photo(4)], consent: true }, ME).error, /Up to 3/);
  assert.match(checkSubmission({ media: [voice, voice] }, ME).error, /One voice note/);
  assert.match(checkSubmission({ linkUrl: 'http://x.com', consent: true }, ME).error, /https/);
  assert.match(checkSubmission({ body: '   ' }, ME).error, /Add a short note/);
  assert.equal(checkSubmission({ body: '<script>x</script>hi' }, ME).row.body, 'xhi');
});

test('uploads: allowed types and sizes only', () => {
  assert.equal(checkUpload({ kind: 'photo', contentType: 'image/jpeg', size: 300_000 }).ext, 'jpg');
  assert.equal(checkUpload({ kind: 'audio', contentType: 'audio/x-m4a', size: 2_000_000 }).ext, 'm4a');
  assert.ok(checkUpload({ kind: 'photo', contentType: 'image/heic', size: 1 }).error);
  assert.ok(checkUpload({ kind: 'video', contentType: 'video/mp4', size: 1 }).error);
  assert.ok(checkUpload({ kind: 'audio', contentType: 'audio/mpeg', size: 11 * 1024 * 1024 }).error);
  assert.ok(checkUpload({ kind: 'photo', contentType: 'image/png', size: 0 }).error);
});
