'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Homework submission for one lesson: a short text, up to 3 photos, one
 * voice note and/or a video link.
 *
 * Safeguarding (athletes are minors): a required consent tick whenever a
 * photo or video link is attached, and a "no athlete data" option. The
 * server and the database enforce the same rules.
 *
 * Low data: photos are shrunk on the phone (max 1600 px, JPEG) before
 * upload, so a 4 MB camera photo goes up as roughly 300 KB. Files go
 * straight to private storage through one-time signed upload URLs.
 */

const MAX_PHOTOS = 3;
const MAX_AUDIO_BYTES = 10 * 1024 * 1024;

async function shrinkPhoto(file) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not read that photo.'))), 'image/jpeg', 0.8)
  );
}

async function uploadOne(weekN, kind, blob, contentType) {
  const res = await fetch('/api/kocha/homework/upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ weekN, kind, contentType, size: blob.size }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Upload failed.');
  const put = await fetch(data.signedUrl, { method: 'PUT', headers: { 'Content-Type': contentType, 'x-upsert': 'false' }, body: blob });
  if (!put.ok) throw new Error('Upload failed. Check your connection and try again.');
  return { path: data.path, kind };
}

export default function HomeworkForm({ weekN, consentText }) {
  const router = useRouter();
  const [body, setBody] = useState('');
  const [photos, setPhotos] = useState([]);
  const [audio, setAudio] = useState(null);
  const [link, setLink] = useState('');
  const [noAthleteData, setNoAthleteData] = useState(false);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const needsConsent = photos.length > 0 || link.trim() !== '';

  function pickPhotos(e) {
    const files = [...(e.target.files || [])].slice(0, MAX_PHOTOS);
    if ((e.target.files || []).length > MAX_PHOTOS) setError(`Up to ${MAX_PHOTOS} photos. The first ${MAX_PHOTOS} were kept.`);
    setPhotos(files);
  }

  function pickAudio(e) {
    const file = e.target.files?.[0] || null;
    if (file && file.size > MAX_AUDIO_BYTES) {
      setError('That voice note is over 10 MB. Please record a shorter one (2 minutes is plenty).');
      e.target.value = '';
      return;
    }
    setAudio(file);
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!body.trim() && !photos.length && !audio && !link.trim()) {
      setError('Add a short note, a photo, a voice note or a link before sending.');
      return;
    }
    if (link.trim() && !/^https:\/\/\S+$/.test(link.trim())) {
      setError('The video link must start with https://');
      return;
    }
    if (needsConsent && !consent) {
      setError('Please tick the consent box before sending photos or video.');
      return;
    }
    try {
      const media = [];
      for (let i = 0; i < photos.length; i++) {
        setBusy(`Uploading photo ${i + 1} of ${photos.length}…`);
        media.push(await uploadOne(weekN, 'photo', await shrinkPhoto(photos[i]), 'image/jpeg'));
      }
      if (audio) {
        setBusy('Uploading voice note…');
        media.push(await uploadOne(weekN, 'audio', audio, audio.type || 'audio/mp4'));
      }
      setBusy('Sending…');
      const res = await fetch('/api/kocha/homework', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekN, body, linkUrl: link.trim(), media, noAthleteData, consent }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not send. Please try again.');
      setSent(true);
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  }

  if (sent) {
    return (
      <p role="status" className="font-body text-white bg-surface-light rounded-lg p-4">
        Sent. AMSC will review it and you will see the feedback here.
      </p>
    );
  }

  const field = 'w-full bg-background border border-white/15 rounded-lg px-3 py-2 text-white font-body text-sm focus:outline-none focus:border-accent';
  const label = 'block font-body text-sm text-white mb-1';

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <p role="note" className="font-body text-sm text-white border-l-2 border-accent pl-3">{consentText}</p>

      <div>
        <label htmlFor={`hw-body-${weekN}`} className={label}>What you did (short note)</label>
        <textarea id={`hw-body-${weekN}`} rows={4} maxLength={5000} value={body} onChange={(e) => setBody(e.target.value)} className={field} />
      </div>

      <div>
        <label htmlFor={`hw-photos-${weekN}`} className={label}>Photos (up to {MAX_PHOTOS})</label>
        <input id={`hw-photos-${weekN}`} type="file" accept="image/*" multiple onChange={pickPhotos} className="block w-full text-sm text-secondary font-body file:mr-3 file:min-h-[44px] file:px-4 file:rounded-full file:border-0 file:bg-surface-light file:text-white" />
        {photos.length > 0 && <p className="text-secondary text-xs font-body mt-1">{photos.length} selected. They are made smaller before sending to save data.</p>}
      </div>

      <div>
        <label htmlFor={`hw-audio-${weekN}`} className={label}>Voice note (optional)</label>
        <input id={`hw-audio-${weekN}`} type="file" accept="audio/*" onChange={pickAudio} className="block w-full text-sm text-secondary font-body file:mr-3 file:min-h-[44px] file:px-4 file:rounded-full file:border-0 file:bg-surface-light file:text-white" />
      </div>

      <div>
        <label htmlFor={`hw-link-${weekN}`} className={label}>Video link (optional, e.g. Google Drive or YouTube)</label>
        <input id={`hw-link-${weekN}`} type="url" inputMode="url" placeholder="https://" value={link} onChange={(e) => setLink(e.target.value)} className={`${field} min-h-[44px]`} />
      </div>

      <label className="flex items-start gap-3 min-h-[44px] cursor-pointer font-body text-sm text-white">
        <input type="checkbox" checked={noAthleteData} onChange={(e) => setNoAthleteData(e.target.checked)} className="mt-0.5 w-6 h-6 flex-shrink-0 accent-[#DC2626]" />
        No athlete data in this submission (no names, faces or voices of athletes).
      </label>

      {needsConsent && (
        <label className="flex items-start gap-3 min-h-[44px] cursor-pointer font-body text-sm text-white">
          <input type="checkbox" required checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 w-6 h-6 flex-shrink-0 accent-[#DC2626]" />
          I have guardian consent for every athlete shown in these photos or video. (Required when you add photos or video.)
        </label>
      )}

      {error && <p role="alert" className="text-red-400 text-sm font-body">{error}</p>}

      <button
        type="submit"
        disabled={Boolean(busy)}
        className="inline-flex items-center justify-center min-h-[44px] px-6 rounded-full bg-accent text-white font-display font-bold text-sm tracking-wider uppercase hover:bg-accent-dark disabled:opacity-60"
      >
        {busy || 'Send homework'}
      </button>
    </form>
  );
}
