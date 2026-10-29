/**
 * Shared inline styles for the admin Kocha tab — the same visual language
 * as WaitlistView, CampView and the rest of app/admin/page.js.
 */
import { useCallback } from 'react';

export const INK = '#f5f5f8';
export const INK_2 = '#d3d3d3';
export const INK_3 = '#888';
export const LINE = '#222';
export const SURFACE = '#111';
export const RED = '#a60a08';
export const GREEN = '#4ade80';
export const AMBER = '#facc15';

export const label = { display: 'block', fontSize: '12px', color: INK_2, marginBottom: '4px' };
export const input = {
  width: '100%', background: '#0a0a0a', border: `1px solid ${LINE}`, borderRadius: '6px',
  padding: '9px 10px', color: INK, fontSize: '14px', minHeight: '40px', boxSizing: 'border-box',
};
export const btn = {
  background: 'transparent', color: INK, border: '1px solid #333', borderRadius: '6px',
  padding: '7px 12px', fontSize: '12px', fontWeight: 700, letterSpacing: '0.06em', cursor: 'pointer', minHeight: '36px',
};
export const btnPrimary = { ...btn, background: RED, border: 'none', color: INK };
export const card = { background: SURFACE, border: `1px solid ${LINE}`, borderRadius: '8px', padding: '14px 16px' };
export const h3 = {
  fontFamily: 'Oswald, sans-serif', fontSize: '12px', letterSpacing: '0.16em', textTransform: 'uppercase',
  color: INK_2, margin: '0 0 12px', fontWeight: 600,
};
export const td = { padding: '8px', borderBottom: `1px solid ${LINE}`, verticalAlign: 'top' };
export const th = { textAlign: 'left', color: INK_3, fontWeight: 600, padding: '6px 8px', borderBottom: `1px solid ${LINE}` };

export function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-KE', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Nairobi',
  });
}

export function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return '—';
  return bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** fetch() against the admin API with the admin key. GET when no body. */
export function useAdminApi(adminKey) {
  return useCallback(async (path, body) => {
    const res = await fetch(path, {
      method: body ? 'POST' : 'GET',
      headers: { Authorization: `Bearer ${adminKey}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Request failed.');
    return data;
  }, [adminKey]);
}

/** SHA-256 of a File in the browser, as hex — the import's fingerprint. */
export async function sha256Hex(file) {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Upload one lesson PDF through the import endpoint: skips it when the
 * same file is already stored, otherwise uploads a new version.
 * Returns 'unchanged' or the confirmed { version, size_bytes }.
 */
export async function uploadLessonPdf(api, fileId, file) {
  const sha256 = await sha256Hex(file);
  const target = await api('/api/admin/kocha/import', { action: 'upload_url', fileId, filename: file.name, sha256 });
  if (target.unchanged) return 'unchanged';
  const put = await fetch(target.signedUrl, {
    method: 'PUT', headers: { 'Content-Type': 'application/pdf', 'x-upsert': 'false' }, body: file,
  });
  if (!put.ok) throw new Error(`Upload of ${file.name} failed. Check it is under 20 MB and try again.`);
  return api('/api/admin/kocha/import', { action: 'confirm', fileId, path: target.path, sha256, version: target.version });
}
