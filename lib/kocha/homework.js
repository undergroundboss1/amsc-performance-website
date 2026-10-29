/**
 * Homework submission rules — pure, shared by the API and the tests
 * (tests/kocha/homework.test.mjs). Athletes are minors, so the consent
 * rules here mirror the database CHECKs on kocha.submissions.
 */

export const MAX_PHOTOS = 3;
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // after on-phone shrinking it is ~300 KB
export const MAX_AUDIO_BYTES = 10 * 1024 * 1024;

export const PHOTO_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
export const AUDIO_TYPES = {
  'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'audio/x-m4a': 'm4a', 'audio/m4a': 'm4a', 'audio/aac': 'aac',
  'audio/ogg': 'ogg', 'audio/webm': 'webm', 'audio/wav': 'wav', 'audio/x-wav': 'wav', 'audio/3gpp': '3gp',
};

/** Validate an upload request; returns { ext } or { error }. */
export function checkUpload({ kind, contentType, size }) {
  const types = kind === 'photo' ? PHOTO_TYPES : kind === 'audio' ? AUDIO_TYPES : null;
  if (!types) return { error: 'Unknown upload type.' };
  const ext = types[String(contentType || '').toLowerCase()];
  if (!ext) return { error: kind === 'photo' ? 'Photos must be JPEG, PNG or WebP.' : 'That voice-note format is not supported. Try recording again in WhatsApp or Voice Memos.' };
  const max = kind === 'photo' ? MAX_PHOTO_BYTES : MAX_AUDIO_BYTES;
  if (!Number.isFinite(size) || size <= 0 || size > max) {
    return { error: kind === 'photo' ? 'That photo is too large.' : 'That voice note is over 10 MB. Please record a shorter one.' };
  }
  return { ext };
}

/**
 * Validate a submission and work out its safeguarding flags.
 * Returns { row } (fields for kocha.submissions) or { error }.
 */
export function checkSubmission({ body, linkUrl, media, noAthleteData, consent }, scholarId) {
  const text = typeof body === 'string' ? body.trim().replace(/<[^>]*>/g, '') : '';
  const link = typeof linkUrl === 'string' ? linkUrl.trim() : '';
  const items = Array.isArray(media) ? media : [];

  if (text.length > 5000) return { error: 'Your note is too long (5,000 characters at most).' };
  if (link && (!/^https:\/\/\S+$/.test(link) || link.length > 500)) return { error: 'The video link must start with https://' };

  const photos = items.filter((m) => m && m.kind === 'photo');
  const audios = items.filter((m) => m && m.kind === 'audio');
  if (photos.length + audios.length !== items.length) return { error: 'Unknown attachment.' };
  if (photos.length > MAX_PHOTOS) return { error: `Up to ${MAX_PHOTOS} photos.` };
  if (audios.length > 1) return { error: 'One voice note at most.' };

  // Every file must sit in this coach's own folder.
  const prefix = `submissions/${scholarId}/`;
  for (const m of items) {
    if (typeof m.path !== 'string' || !m.path.startsWith(prefix) || !/^[0-9a-f-]{36}\.[a-z0-9]{2,4}$/.test(m.path.slice(prefix.length))) {
      return { error: 'Invalid attachment.' };
    }
  }

  if (!text && !items.length && !link) return { error: 'Add a short note, a photo, a voice note or a link before sending.' };

  // Photos and video can show athletes: consent is required whenever
  // either is attached, whatever else is ticked.
  const visual = photos.length > 0 || Boolean(link);
  if (visual && consent !== true) return { error: 'Please tick the consent box before sending photos or video.' };

  return {
    row: {
      body: text || null,
      link_url: link || null,
      no_athlete_data: noAthleteData === true,
      has_athlete_media: visual && noAthleteData !== true,
      consent_confirmed: visual && consent === true,
    },
  };
}
