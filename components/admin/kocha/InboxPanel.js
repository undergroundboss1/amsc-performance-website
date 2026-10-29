'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AMBER, GREEN, INK, INK_2, INK_3, LINE, btn, btnPrimary, card, formatDate, h3, input, label } from './styles';

/**
 * Admin Kocha → Homework inbox. Every submission, newest first, filterable
 * by lesson, zone, coach and status. Open attachments through short-lived
 * links, set a status and leave a note the coach will see on their lesson.
 */
const STATUS_LABELS = { submitted: 'New', reviewed: 'Reviewed', follow_up: 'Needs follow-up' };

function Submission({ s, api, reload, setError }) {
  const [status, setStatus] = useState(s.status === 'submitted' ? 'reviewed' : s.status);
  const [feedback, setFeedback] = useState(s.feedback || '');
  const [saved, setSaved] = useState('');

  async function open(mediaId) {
    try {
      const { url } = await api('/api/admin/kocha/submissions', { action: 'media_url', mediaId });
      window.open(url, '_blank', 'noopener');
    } catch (err) { setError(err.message); }
  }
  async function save() {
    try {
      await api('/api/admin/kocha/submissions', { action: 'review', id: s.id, status, feedback });
      setSaved('Saved. The coach will see this on their lesson page.');
      reload();
    } catch (err) { setError(err.message); }
  }

  return (
    <div style={{ border: `1px solid ${LINE}`, borderRadius: '6px', padding: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
        <div style={{ color: INK, fontSize: '14px', fontWeight: 600 }}>
          Lesson {s.lesson ?? '?'} · {s.coach.display_name}{s.coach.zone ? ` · Zone ${s.coach.zone}` : ''}
        </div>
        <div style={{ fontSize: '12px', color: s.status === 'submitted' ? AMBER : s.status === 'reviewed' ? GREEN : '#f87171', fontWeight: 700 }}>
          {STATUS_LABELS[s.status]} · {formatDate(s.created_at)}
        </div>
      </div>
      {s.homework_title && <div style={{ color: INK_3, fontSize: '12px' }}>{s.homework_title}</div>}
      {s.body && <p style={{ color: INK_2, fontSize: '13px', whiteSpace: 'pre-wrap', margin: '8px 0' }}>{s.body}</p>}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', margin: '6px 0' }}>
        {s.submission_media.map((m, i) => (
          <button key={m.id} type="button" style={btn} onClick={() => open(m.id)}>
            {m.kind === 'photo' ? `Photo ${i + 1}` : 'Voice note'}
          </button>
        ))}
        {s.link_url && <a href={s.link_url} target="_blank" rel="noopener noreferrer" style={{ ...btn, textDecoration: 'none' }}>Video link</a>}
      </div>
      <div style={{ color: INK_3, fontSize: '11px' }}>
        {s.no_athlete_data ? 'Coach says: no athlete data. ' : ''}
        {s.consent_confirmed ? 'Guardian consent confirmed for photos/video. ' : ''}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '8px', marginTop: '8px', alignItems: 'start' }}>
        <div>
          <label style={label} htmlFor={`st-${s.id}`}>Status</label>
          <select id={`st-${s.id}`} style={input} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="reviewed">Reviewed</option>
            <option value="follow_up">Needs follow-up</option>
            <option value="submitted">New (not reviewed)</option>
          </select>
        </div>
        <div>
          <label style={label} htmlFor={`fb-${s.id}`}>Note for the coach (they will see it)</label>
          <textarea id={`fb-${s.id}`} rows={2} maxLength={2000} style={input} value={feedback} onChange={(e) => setFeedback(e.target.value)} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '8px' }}>
        <button type="button" style={btnPrimary} onClick={save}>Save</button>
        {saved && <span style={{ color: GREEN, fontSize: '12px' }}>{saved}</span>}
      </div>
    </div>
  );
}

export default function InboxPanel({ api }) {
  const [subs, setSubs] = useState(null);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ lesson: '', zone: '', coach: '', status: 'submitted' });

  const load = useCallback(async () => {
    try { setSubs((await api('/api/admin/kocha/submissions')).submissions); } catch (err) { setError(err.message); }
  }, [api]);
  useEffect(() => { load(); }, [load]);

  const coaches = useMemo(() => {
    const m = {};
    for (const s of subs || []) m[s.scholar_id] = s.coach.display_name;
    return Object.entries(m).sort((a, b) => a[1].localeCompare(b[1]));
  }, [subs]);

  const shown = (subs || []).filter((s) =>
    (!filters.lesson || String(s.lesson) === filters.lesson) &&
    (!filters.zone || String(s.coach.zone) === filters.zone) &&
    (!filters.coach || s.scholar_id === filters.coach) &&
    (!filters.status || s.status === filters.status)
  );

  async function deleteCoach() {
    const name = coaches.find(([id]) => id === filters.coach)?.[1];
    if (!window.confirm(`Delete ALL homework from ${name}, including their photos and voice notes? This cannot be undone.`)) return;
    try {
      const r = await api('/api/admin/kocha/submissions', { action: 'delete_coach_submissions', scholarId: filters.coach });
      window.alert(`Deleted ${r.submissions} submissions and ${r.files} files.`);
      setFilters({ ...filters, coach: '' });
      load();
    } catch (err) { setError(err.message); }
  }

  const select = (key, options, all) => (
    <select aria-label={all} style={{ ...input, width: 'auto' }} value={filters[key]} onChange={(e) => setFilters({ ...filters, [key]: e.target.value })}>
      <option value="">{all}</option>
      {options.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
    </select>
  );

  return (
    <div style={card}>
      <h3 style={h3}>Homework inbox</h3>
      {error && <p role="alert" style={{ color: '#f87171', fontSize: '13px' }}>{error}</p>}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
        {select('status', Object.entries(STATUS_LABELS), 'All statuses')}
        {select('lesson', Array.from({ length: 12 }, (_, i) => [String(i + 1), `Lesson ${i + 1}`]), 'All lessons')}
        {select('zone', [['1', 'Zone 1'], ['2', 'Zone 2'], ['3', 'Zone 3']], 'All zones')}
        {select('coach', coaches, 'All coaches')}
      </div>
      {!subs && <p style={{ color: INK_3, fontSize: '13px' }}>Loading…</p>}
      {subs && shown.length === 0 && <p style={{ color: INK_3, fontSize: '13px' }}>Nothing here{filters.status === 'submitted' ? ': no new homework to review.' : '.'}</p>}
      <div style={{ display: 'grid', gap: '10px' }}>
        {shown.map((s) => <Submission key={`${s.id}-${s.status}`} s={s} api={api} reload={load} setError={setError} />)}
      </div>
      {filters.coach && (
        <button type="button" style={{ ...btn, marginTop: '16px', borderColor: '#7f1d1d', color: '#fca5a5' }} onClick={deleteCoach}>
          Delete all homework from this coach
        </button>
      )}
    </div>
  );
}
