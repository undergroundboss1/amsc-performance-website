'use client';

import { useCallback, useEffect, useState } from 'react';
import { FILE_KIND_LABELS } from '../../lib/kocha/constants';
import { whatsappLink } from '../../lib/client-comms';
import { withText } from '../../lib/kocha/share';

/**
 * KochaView — the admin Kocha tab (Kocha Mwenzangu Coach Resource Hub).
 *
 * Phase 1: Coaches (add a coach, send their personal link, revoke or
 * replace it) and Files (upload, replace, publish). Videos, homework,
 * completion and WhatsApp templates follow in later phases.
 *
 * Same inline-style visual language as WaitlistView and CampView.
 */

const INK = '#f5f5f8';
const INK_2 = '#d3d3d3';
const INK_3 = '#888';
const LINE = '#222';
const SURFACE = '#111';
const RED = '#a60a08';

const label = { display: 'block', fontSize: '12px', color: INK_2, marginBottom: '4px' };
const input = {
  width: '100%', background: '#0a0a0a', border: `1px solid ${LINE}`, borderRadius: '6px',
  padding: '9px 10px', color: INK, fontSize: '14px', minHeight: '40px', boxSizing: 'border-box',
};
const btn = {
  background: 'transparent', color: INK, border: `1px solid #333`, borderRadius: '6px',
  padding: '7px 12px', fontSize: '12px', fontWeight: 700, letterSpacing: '0.06em', cursor: 'pointer',
};
const btnPrimary = { ...btn, background: RED, border: 'none', color: INK };
const card = { background: SURFACE, border: `1px solid ${LINE}`, borderRadius: '8px', padding: '14px 16px' };
const h3 = {
  fontFamily: 'Oswald, sans-serif', fontSize: '12px', letterSpacing: '0.16em', textTransform: 'uppercase',
  color: INK_2, margin: '0 0 12px', fontWeight: 600,
};

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-KE', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Nairobi',
  });
}

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return '—';
  return bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function useAdminApi(adminKey) {
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

// ─────────────────────────────────────────────────────────────
// Coaches
// ─────────────────────────────────────────────────────────────

/** Shown once after a link is created or replaced: it cannot be shown again. */
function LinkReveal({ reveal, onClose }) {
  const [copied, setCopied] = useState(false);
  const send = withText(
    whatsappLink(reveal.phone),
    `Hi ${reveal.name}, here is your personal link to the Kocha Mwenzangu Coach Resource Hub. Keep it to yourself: it is your key.\n${reveal.link}`
  );
  return (
    <div style={{ ...card, borderColor: RED, marginBottom: '16px' }}>
      <p style={{ color: INK, fontSize: '14px', margin: '0 0 8px', fontWeight: 600 }}>Personal link for {reveal.name}</p>
      <p style={{ color: INK_2, fontSize: '13px', margin: '0 0 10px' }}>
        Send it now. For security it is not stored, so it cannot be shown again (you can always replace it).
      </p>
      <input readOnly value={reveal.link} style={{ ...input, fontSize: '12px' }} onFocus={(e) => e.target.select()} aria-label="Personal link" />
      <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
        {send && <a href={send} target="_blank" rel="noopener noreferrer" style={{ ...btnPrimary, textDecoration: 'none' }}>Send on WhatsApp</a>}
        <button
          type="button"
          style={btn}
          onClick={() => navigator.clipboard?.writeText(reveal.link).then(() => setCopied(true))}
        >
          {copied ? 'Copied' : 'Copy link'}
        </button>
        <button type="button" style={btn} onClick={onClose}>Done</button>
      </div>
    </div>
  );
}

function CoachesPanel({ api }) {
  const [scholars, setScholars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ displayName: '', phone: '', zone: '' });
  const [saving, setSaving] = useState(false);
  const [reveal, setReveal] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api('/api/admin/kocha/scholars');
      setScholars(data.scholars);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { load(); }, [load]);

  async function create(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const data = await api('/api/admin/kocha/scholars', { action: 'create', ...form });
      setReveal({ name: data.scholar.display_name, phone: data.scholar.phone, link: data.link });
      setForm({ displayName: '', phone: '', zone: '' });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function act(s, action) {
    const confirmText = {
      reissue: `Replace ${s.display_name}'s link? Their old link stops working on every phone.`,
      revoke: `Turn off ${s.display_name}'s link? They will be signed out everywhere until you send a new one.`,
    }[action];
    if (confirmText && !window.confirm(confirmText)) return;
    try {
      const data = await api('/api/admin/kocha/scholars', { action, id: s.id });
      if (data.link) setReveal({ name: s.display_name, phone: s.phone, link: data.link });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function changeZone(s, zone) {
    try {
      await api('/api/admin/kocha/scholars', {
        action: 'update', id: s.id, displayName: s.display_name, phone: s.phone || '', zone,
      });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      {reveal && <LinkReveal reveal={reveal} onClose={() => setReveal(null)} />}

      <form onSubmit={create} style={{ ...card, marginBottom: '16px' }}>
        <h3 style={h3}>Add a coach</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
          <div>
            <label htmlFor="kc-name" style={label}>Name</label>
            <input id="kc-name" style={input} required maxLength={80} value={form.displayName}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
          </div>
          <div>
            <label htmlFor="kc-phone" style={label}>WhatsApp number</label>
            <input id="kc-phone" style={input} inputMode="tel" placeholder="07…" value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <label htmlFor="kc-zone" style={label}>Zone</label>
            <select id="kc-zone" style={input} value={form.zone} onChange={(e) => setForm({ ...form, zone: e.target.value })}>
              <option value="">Not set</option>
              <option value="1">Zone 1</option>
              <option value="2">Zone 2</option>
              <option value="3">Zone 3</option>
            </select>
          </div>
        </div>
        <button type="submit" style={{ ...btnPrimary, marginTop: '12px' }} disabled={saving}>
          {saving ? 'Adding…' : 'Add coach and create link'}
        </button>
      </form>

      {error && <p role="alert" style={{ color: '#f87171', fontSize: '13px' }}>{error}</p>}

      <div style={card}>
        <h3 style={h3}>Coaches ({scholars.length})</h3>
        {loading && <p style={{ color: INK_3, fontSize: '13px' }}>Loading…</p>}
        {!loading && scholars.length === 0 && <p style={{ color: INK_3, fontSize: '13px' }}>No coaches yet.</p>}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', color: INK }}>
            <thead>
              <tr>
                {['Coach', 'WhatsApp', 'Zone', 'Link', 'Last opened', ''].map((h) => (
                  <th key={h} style={{ textAlign: 'left', color: INK_3, fontWeight: 600, padding: '6px 8px', borderBottom: `1px solid ${LINE}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {scholars.map((s) => (
                <tr key={s.id}>
                  <td style={{ padding: '8px', borderBottom: `1px solid ${LINE}` }}>{s.display_name}</td>
                  <td style={{ padding: '8px', borderBottom: `1px solid ${LINE}`, whiteSpace: 'nowrap' }}>{s.phone || '—'}</td>
                  <td style={{ padding: '8px', borderBottom: `1px solid ${LINE}` }}>
                    <select aria-label={`Zone for ${s.display_name}`} value={s.zone || ''} onChange={(e) => changeZone(s, e.target.value)}
                      style={{ ...input, minHeight: '32px', padding: '4px 6px', width: 'auto' }}>
                      <option value="">—</option>
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                    </select>
                  </td>
                  <td style={{ padding: '8px', borderBottom: `1px solid ${LINE}`, color: s.revoked_at ? '#f87171' : INK_2 }}>
                    {s.revoked_at ? 'Turned off' : s.token_issued_at ? `Sent ${formatDate(s.token_issued_at)}` : 'None'}
                  </td>
                  <td style={{ padding: '8px', borderBottom: `1px solid ${LINE}`, color: INK_2 }}>{formatDate(s.last_seen_at)}</td>
                  <td style={{ padding: '8px', borderBottom: `1px solid ${LINE}`, whiteSpace: 'nowrap' }}>
                    <button type="button" style={btn} onClick={() => act(s, 'reissue')}>New link</button>{' '}
                    {!s.revoked_at && <button type="button" style={btn} onClick={() => act(s, 'revoke')}>Turn off</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Files
// ─────────────────────────────────────────────────────────────

const EMPTY_FILE = { title: '', description: '', kind: 'study_card', format: 'PDF', weeks: '', showOnHome: false, source: 'hosted', externalUrl: '' };

function parseWeeks(text) {
  return String(text).split(/[\s,]+/).filter(Boolean).map(Number);
}

function FilesPanel({ api }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [form, setForm] = useState(EMPTY_FILE);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api('/api/admin/kocha/files');
      setFiles(data.files);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { load(); }, [load]);

  async function upload(file, chosen) {
    if (!chosen) return;
    setBusy(file.id);
    setError('');
    try {
      const { path, signedUrl } = await api('/api/admin/kocha/files', { action: 'upload_url', id: file.id, filename: chosen.name });
      const put = await fetch(signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': chosen.type || 'application/octet-stream', 'x-upsert': 'false' },
        body: chosen,
      });
      if (!put.ok) throw new Error('Upload failed. Check the file is under 20 MB and try again.');
      await api('/api/admin/kocha/files', { action: 'confirm_upload', id: file.id, path });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  }

  async function update(file, fields) {
    setBusy(file.id);
    setError('');
    try {
      await api('/api/admin/kocha/files', { action: 'update', id: file.id, ...fields });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  }

  async function create(e) {
    e.preventDefault();
    setError('');
    try {
      await api('/api/admin/kocha/files', { action: 'create', ...form, weeks: parseWeeks(form.weeks) });
      setForm(EMPTY_FILE);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      {error && <p role="alert" style={{ color: '#f87171', fontSize: '13px' }}>{error}</p>}

      <div style={{ ...card, marginBottom: '16px' }}>
        <h3 style={h3}>Files ({files.length})</h3>
        <p style={{ color: INK_3, fontSize: '12px', margin: '0 0 12px' }}>
          Scholars only see a file once it is uploaded and published, and only on weeks that are open.
          Uploading a new version keeps the old one in storage.
        </p>
        {loading && <p style={{ color: INK_3, fontSize: '13px' }}>Loading…</p>}
        <div style={{ display: 'grid', gap: '10px' }}>
          {files.map((f) => (
            <div key={f.id} style={{ border: `1px solid ${LINE}`, borderRadius: '6px', padding: '10px 12px', opacity: busy === f.id ? 0.6 : 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: INK, fontSize: '14px', fontWeight: 600 }}>{f.title}</div>
                  <div style={{ color: INK_3, fontSize: '12px', marginTop: '2px' }}>
                    {FILE_KIND_LABELS[f.kind]} · {f.format} · {formatBytes(f.size_bytes)} · v{f.version}
                    {' · '}Weeks {f.weeks.length ? f.weeks.join(', ') : '—'}{f.show_on_home ? ' · Course home' : ''}
                    {f.audience === 'admin' ? ' · ADMIN ONLY' : ''}{f.gate ? ` · Gate: ${f.gate}` : ''}
                    {' · '}{f.download_count} downloads
                  </div>
                  <div style={{ color: f.published ? '#4ade80' : INK_2, fontSize: '12px', marginTop: '2px' }}>
                    {f.published ? 'Published' : 'Not published'}
                    {f.source === 'hosted' && !f.storage_path ? ' · Not uploaded yet' : ''}
                    {f.source === 'whatsapp' ? ' · Posted in WhatsApp' : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {f.source === 'hosted' && (
                    <label style={{ ...btn, display: 'inline-block' }}>
                      {f.storage_path ? 'Replace file' : 'Upload file'}
                      <input
                        type="file"
                        accept={f.format === 'PDF' ? '.pdf,application/pdf' : '.xlsx'}
                        style={{ display: 'none' }}
                        disabled={busy === f.id}
                        onChange={(e) => { upload(f, e.target.files?.[0]); e.target.value = ''; }}
                      />
                    </label>
                  )}
                  <button type="button" style={f.published ? btn : btnPrimary} disabled={busy === f.id}
                    onClick={() => update(f, { published: !f.published })}>
                    {f.published ? 'Unpublish' : 'Publish'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={create} style={card}>
        <h3 style={h3}>Add a file</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label htmlFor="kf-title" style={label}>Title</label>
            <input id="kf-title" style={input} required maxLength={120} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label htmlFor="kf-desc" style={label}>What it is (one sentence)</label>
            <input id="kf-desc" style={input} maxLength={300} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <label htmlFor="kf-kind" style={label}>Type</label>
            <select id="kf-kind" style={input} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
              {Object.entries(FILE_KIND_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="kf-format" style={label}>Format</label>
            <select id="kf-format" style={input} value={form.format} onChange={(e) => setForm({ ...form, format: e.target.value })}>
              <option value="PDF">PDF</option>
              <option value="XLSX">XLSX</option>
            </select>
          </div>
          <div>
            <label htmlFor="kf-weeks" style={label}>Weeks (e.g. 3 or 1, 2)</label>
            <input id="kf-weeks" style={input} value={form.weeks} onChange={(e) => setForm({ ...form, weeks: e.target.value })} />
          </div>
          <div>
            <label htmlFor="kf-source" style={label}>Where it lives</label>
            <select id="kf-source" style={input} value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
              <option value="hosted">Uploaded here</option>
              <option value="whatsapp">Posted in WhatsApp group</option>
              <option value="external">Outside link</option>
            </select>
          </div>
          {form.source === 'external' && (
            <div style={{ gridColumn: '1 / -1' }}>
              <label htmlFor="kf-url" style={label}>Link (https://…)</label>
              <input id="kf-url" style={input} value={form.externalUrl} onChange={(e) => setForm({ ...form, externalUrl: e.target.value })} />
            </div>
          )}
          <label style={{ ...label, display: 'flex', alignItems: 'center', gap: '8px', marginTop: '20px' }}>
            <input type="checkbox" checked={form.showOnHome} onChange={(e) => setForm({ ...form, showOnHome: e.target.checked })} />
            Also show on the course home
          </label>
        </div>
        <button type="submit" style={{ ...btnPrimary, marginTop: '12px' }}>Add file</button>
      </form>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Tab
// ─────────────────────────────────────────────────────────────

export default function KochaView({ adminKey }) {
  const api = useAdminApi(adminKey);
  const [panel, setPanel] = useState('coaches');

  return (
    <div>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
        {[['coaches', 'Coaches'], ['files', 'Files']].map(([key, text]) => (
          <button
            key={key}
            type="button"
            onClick={() => setPanel(key)}
            aria-pressed={panel === key}
            style={{ ...btn, background: panel === key ? '#1a1a1a' : 'transparent', borderColor: panel === key ? '#555' : '#333' }}
          >
            {text}
          </button>
        ))}
      </div>
      {panel === 'coaches' ? <CoachesPanel api={api} /> : <FilesPanel api={api} />}
    </div>
  );
}
