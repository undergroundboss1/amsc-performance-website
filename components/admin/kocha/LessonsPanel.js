'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  AMBER, GREEN, INK, INK_2, INK_3, LINE,
  btn, btnPrimary, card, formatBytes, formatDate, h3, input, label, td, th, uploadLessonPdf,
} from './styles';

/**
 * Admin Kocha → Lessons. Top: access settings and the "Lesson readiness"
 * table (PDF, approved videos, homework, published). Pick a lesson to
 * edit it: publish, unlock date, replace the PDF, edit the homework, and
 * approve / reject / group / order its videos. Gaps (topics with no video
 * yet) are an admin-only to-do list.
 */

function Tick({ ok, children }) {
  return <span style={{ color: ok ? GREEN : INK_3 }}>{ok ? '✓' : '—'}{children ? ` ${children}` : ''}</span>;
}

/** YYYY-MM-DD of a timestamp in Nairobi, for a date input. */
function nairobiDay(iso) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Nairobi', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));
}

function Settings({ settings, api, onChange, setError }) {
  async function save(update) {
    try {
      await api('/api/admin/kocha/lessons', { action: 'update_settings', ...update });
      onChange();
    } catch (err) { setError(err.message); }
  }
  return (
    <div style={{ ...card, marginBottom: '16px' }}>
      <h3 style={h3}>Lesson access</h3>
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '13px', color: INK }}>
        {[
          ['open', 'Open: coaches can open any published lesson'],
          ['by_week', 'By week: a lesson opens on its unlock date'],
        ].map(([value, text]) => (
          <label key={value} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', minHeight: '36px' }}>
            <input type="radio" name="lesson-access" checked={settings.lessonAccessMode === value} onChange={() => save({ lessonAccessMode: value })} />
            {text}
          </label>
        ))}
      </div>
      <p style={{ color: INK_3, fontSize: '12px', margin: '8px 0 0' }}>
        Unpublished lessons are always hidden, whichever you choose.
      </p>
      <div style={{ borderTop: `1px solid ${LINE}`, marginTop: '12px', paddingTop: '12px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: INK, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={settings.nutritionEnabled}
            onChange={(e) => {
              if (e.target.checked && !window.confirm('Only switch this on once the Sports Nutrition scope is agreed with Clique Mambas. Lessons 7 and 8 also need publishing. Continue?')) return;
              save({ nutritionEnabled: e.target.checked });
            }}
          />
          Sports Nutrition scope agreed (unlocks Lessons 7 and 8 once published)
        </label>
      </div>
    </div>
  );
}

function Readiness({ lessons, onEdit, onPublish }) {
  return (
    <div style={{ ...card, marginBottom: '16px' }}>
      <h3 style={h3}>Lesson readiness</h3>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', color: INK }}>
          <thead>
            <tr>{['Lesson', 'PDF', 'Videos approved', 'Homework', 'Published', ''].map((h) => <th key={h} style={th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {lessons.map((l) => (
              <tr key={l.id}>
                <td style={td}>
                  <div style={{ fontWeight: 600 }}>{l.n}. {l.title}</div>
                  {l.readiness.held && <div style={{ color: AMBER, fontSize: '11px' }}>ON HOLD: nutrition scope</div>}
                  {!l.content_ready && <div style={{ color: INK_3, fontSize: '11px' }}>Coming soon (no PDF yet)</div>}
                </td>
                <td style={td}><Tick ok={l.readiness.pdf} /></td>
                <td style={td}>
                  <Tick ok={l.readiness.videos_start_approved > 0}>
                    {l.readiness.videos_approved}/{l.readiness.videos_total}
                  </Tick>
                  {l.readiness.videos_total > 0 && l.readiness.videos_start_approved === 0 && (
                    <div style={{ color: INK_3, fontSize: '11px' }}>no Start here approved</div>
                  )}
                </td>
                <td style={td}><Tick ok={l.readiness.homework} /></td>
                <td style={td}>
                  <button type="button" style={l.published ? btn : btnPrimary} onClick={() => onPublish(l)}>
                    {l.published ? 'Published · Unpublish' : 'Publish'}
                  </button>
                </td>
                <td style={td}><button type="button" style={btn} onClick={() => onEdit(l.n)}>Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function VideoRow({ v, api, reload, setError, first, last }) {
  const [topic, setTopic] = useState(v.topic || '');
  const notChecked = (v.shortlist_status || '').toLowerCase().startsWith('found');
  async function update(fields) {
    try { await api('/api/admin/kocha/lessons', { action: 'update_video', id: v.id, ...fields }); reload(); } catch (err) { setError(err.message); }
  }
  async function move(direction) {
    try { await api('/api/admin/kocha/lessons', { action: 'move_video', id: v.id, direction }); reload(); } catch (err) { setError(err.message); }
  }
  const statusColor = v.status === 'approved' ? GREEN : v.status === 'rejected' ? '#f87171' : AMBER;
  return (
    <div style={{ border: `1px solid ${LINE}`, borderRadius: '6px', padding: '10px 12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0, flex: '1 1 260px' }}>
          <div style={{ color: INK, fontSize: '14px', fontWeight: 600 }}>{v.title || '(no title)'}</div>
          <div style={{ color: INK_3, fontSize: '12px' }}>
            {[v.channel, v.length_text].filter(Boolean).join(' · ') || 'No channel or length yet'}
            {' · '}<a href={`https://www.youtube.com/watch?v=${v.youtube_id}`} target="_blank" rel="noopener noreferrer" style={{ color: INK_2 }}>Open on YouTube</a>
          </div>
          {v.why_watch && <div style={{ color: INK_2, fontSize: '12px', marginTop: '4px' }}>{v.why_watch}</div>}
          <div style={{ fontSize: '12px', marginTop: '4px' }}>
            <span style={{ color: statusColor, fontWeight: 700, textTransform: 'uppercase' }}>{v.status}</span>
            {notChecked && <span style={{ color: AMBER, marginLeft: '8px' }}>NOT CHECKED YET: watch it before approving</span>}
            {v.gate && <span style={{ color: AMBER, marginLeft: '8px' }}>Held (nutrition)</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <button type="button" style={btn} disabled={first} onClick={() => move('up')} aria-label="Move up">↑</button>
          <button type="button" style={btn} disabled={last} onClick={() => move('down')} aria-label="Move down">↓</button>
          {v.status !== 'approved' && <button type="button" style={btnPrimary} onClick={() => update({ status: 'approved' })}>Approve</button>}
          {v.status !== 'rejected' && <button type="button" style={btn} onClick={() => update({ status: 'rejected' })}>Reject</button>}
          {v.status !== 'pending' && <button type="button" style={btn} onClick={() => update({ status: 'pending' })}>Back to pending</button>}
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        <label style={{ ...label, margin: 0 }} htmlFor={`grp-${v.id}`}>Group</label>
        <input id={`grp-${v.id}`} style={{ ...input, width: '200px', minHeight: '32px', padding: '4px 8px' }} value={topic}
          onChange={(e) => setTopic(e.target.value)} onBlur={() => topic !== (v.topic || '') && update({ topic })} />
        <label style={{ ...label, margin: 0 }} htmlFor={`role-${v.id}`}>Role</label>
        <select id={`role-${v.id}`} style={{ ...input, width: 'auto', minHeight: '32px', padding: '4px 8px' }}
          value={v.audience_level === 'deeper' ? 'deeper' : 'start'} onChange={(e) => update({ role: e.target.value })}>
          <option value="start">Start here</option>
          <option value="deeper">Go deeper</option>
        </select>
      </div>
    </div>
  );
}

function LessonEditor({ lesson, api, reload, setError, onClose }) {
  const [form, setForm] = useState({
    title: lesson.title, takeaway: lesson.takeaway || '', unlock: nairobiDay(lesson.release_at),
  });
  const [hw, setHw] = useState({
    title: lesson.homework?.title || '', timeNeeded: lesson.homework?.time_needed || '',
    brief: lesson.homework?.brief || '', submitWhat: lesson.homework?.submit_what || '',
  });
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');

  async function call(body, done) {
    setError(''); setMsg('');
    try { await api('/api/admin/kocha/lessons', body); setMsg(done); reload(); } catch (err) { setError(err.message); }
  }

  async function replacePdf(file) {
    if (!file) return;
    setBusy('Uploading PDF…'); setError(''); setMsg('');
    try {
      const fileId = lesson.pdf?.id || (await api('/api/admin/kocha/lessons', { action: 'create_pdf_row', weekId: lesson.id })).file.id;
      const result = await uploadLessonPdf(api, fileId, file);
      setMsg(result === 'unchanged' ? 'That PDF is already uploaded; nothing changed.' : `Uploaded as version ${result.version}. The old version is kept.`);
      reload();
    } catch (err) { setError(err.message); } finally { setBusy(''); }
  }

  const videos = lesson.videos;
  return (
    <div style={{ ...card, borderColor: '#444', marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h3 style={{ ...h3, margin: 0 }}>Lesson {lesson.n}: edit</h3>
        <button type="button" style={btn} onClick={onClose}>Close</button>
      </div>
      {msg && <p role="status" style={{ color: GREEN, fontSize: '13px' }}>{msg}</p>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
        <div>
          <label style={label} htmlFor="le-title">Title</label>
          <input id="le-title" style={input} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div>
          <label style={label} htmlFor="le-unlock">Unlock date (opens 00:00 Nairobi; used in By week mode)</label>
          <input id="le-unlock" type="date" style={input} value={form.unlock} onChange={(e) => setForm({ ...form, unlock: e.target.value })} />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={label} htmlFor="le-takeaway">One sentence to remember</label>
          <input id="le-takeaway" style={input} value={form.takeaway} onChange={(e) => setForm({ ...form, takeaway: e.target.value })} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
        <button type="button" style={btnPrimary} onClick={() => call({
          action: 'update_lesson', id: lesson.id, title: form.title, takeaway: form.takeaway,
          releaseAt: `${form.unlock}T00:00:00+03:00`,
        }, 'Lesson saved.')}>Save lesson</button>
        <button type="button" style={btn} onClick={() => call({ action: 'update_lesson', id: lesson.id, published: !lesson.published }, lesson.published ? 'Unpublished.' : 'Published.')}>
          {lesson.published ? 'Unpublish' : 'Publish'}
        </button>
        <button type="button" style={btn} onClick={() => call({ action: 'update_lesson', id: lesson.id, contentReady: !lesson.content_ready }, 'Saved.')}>
          {lesson.content_ready ? 'Mark as coming soon' : 'Mark as ready'}
        </button>
      </div>
      {lesson.readiness.held && (
        <p style={{ color: AMBER, fontSize: '12px' }}>On hold: coaches will not see this lesson until it is published AND “Sports Nutrition scope agreed” is on.</p>
      )}

      <div style={{ borderTop: `1px solid ${LINE}`, marginTop: '16px', paddingTop: '12px' }}>
        <h3 style={h3}>Study card PDF</h3>
        <p style={{ color: INK_2, fontSize: '13px', margin: '0 0 8px' }}>
          {lesson.pdf?.storage_path
            ? `Version ${lesson.pdf.version}${lesson.pdf.version_label ? ` (${lesson.pdf.version_label})` : ''} · ${formatBytes(lesson.pdf.size_bytes)} · updated ${formatDate(lesson.pdf.updated_at)}`
            : 'No PDF uploaded yet.'}
        </p>
        <label style={{ ...btn, display: 'inline-block' }}>
          {busy || (lesson.pdf?.storage_path ? 'Replace PDF' : 'Upload PDF')}
          <input type="file" accept=".pdf,application/pdf" style={{ display: 'none' }} disabled={Boolean(busy)}
            onChange={(e) => { replacePdf(e.target.files?.[0]); e.target.value = ''; }} />
        </label>
      </div>

      <div style={{ borderTop: `1px solid ${LINE}`, marginTop: '16px', paddingTop: '12px' }}>
        <h3 style={h3}>Homework</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
          <div><label style={label} htmlFor="hw-t">Title</label><input id="hw-t" style={input} value={hw.title} onChange={(e) => setHw({ ...hw, title: e.target.value })} /></div>
          <div><label style={label} htmlFor="hw-tn">Time needed</label><input id="hw-tn" style={input} value={hw.timeNeeded} onChange={(e) => setHw({ ...hw, timeNeeded: e.target.value })} /></div>
          <div style={{ gridColumn: '1 / -1' }}><label style={label} htmlFor="hw-b">What to do</label><textarea id="hw-b" rows={3} style={input} value={hw.brief} onChange={(e) => setHw({ ...hw, brief: e.target.value })} /></div>
          <div style={{ gridColumn: '1 / -1' }}><label style={label} htmlFor="hw-s">Send</label><input id="hw-s" style={input} value={hw.submitWhat} onChange={(e) => setHw({ ...hw, submitWhat: e.target.value })} /></div>
        </div>
        <button type="button" style={{ ...btnPrimary, marginTop: '10px' }} onClick={() => call({ action: 'update_homework', weekId: lesson.id, ...hw }, 'Homework saved.')}>Save homework</button>
      </div>

      <div style={{ borderTop: `1px solid ${LINE}`, marginTop: '16px', paddingTop: '12px' }}>
        <h3 style={h3}>Videos ({videos.filter((v) => v.status === 'approved').length} of {videos.length} approved)</h3>
        <p style={{ color: INK_3, fontSize: '12px', margin: '0 0 8px' }}>Only approved videos appear to coaches. Order here is the order on the lesson page.</p>
        <div style={{ display: 'grid', gap: '8px' }}>
          {videos.map((v, i) => (
            <VideoRow key={`${v.id}-${v.topic}-${v.audience_level}-${v.status}`} v={v} api={api} reload={reload} setError={setError} first={i === 0} last={i === videos.length - 1} />
          ))}
          {videos.length === 0 && <p style={{ color: INK_3, fontSize: '13px' }}>No videos for this lesson yet.</p>}
        </div>
      </div>

      {lesson.gaps.length > 0 && (
        <div style={{ borderTop: `1px solid ${LINE}`, marginTop: '16px', paddingTop: '12px' }}>
          <h3 style={h3}>Gaps (admin only)</h3>
          <GapList gaps={lesson.gaps} api={api} reload={reload} setError={setError} />
        </div>
      )}
    </div>
  );
}

function GapList({ gaps, api, reload, setError }) {
  async function toggle(g) {
    try { await api('/api/admin/kocha/lessons', { action: 'resolve_gap', id: g.id, resolved: !g.resolved_at }); reload(); } catch (err) { setError(err.message); }
  }
  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '6px' }}>
      {gaps.map((g) => (
        <li key={g.id}>
          <label style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '13px', color: g.resolved_at ? INK_3 : INK, cursor: 'pointer' }}>
            <input type="checkbox" checked={Boolean(g.resolved_at)} onChange={() => toggle(g)} />
            <span>
              {g.week_n ? `Lesson ${g.week_n}: ` : 'All lessons: '}<strong>{g.topic}</strong>{g.note ? ` — ${g.note}` : ''}
            </span>
          </label>
        </li>
      ))}
    </ul>
  );
}

export default function LessonsPanel({ api }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    try { setData(await api('/api/admin/kocha/lessons')); } catch (err) { setError(err.message); }
  }, [api]);
  useEffect(() => { load(); }, [load]);

  async function togglePublish(l) {
    if (!l.published && l.readiness.held && !window.confirm(`Lesson ${l.n} is on hold (nutrition scope not agreed). Publish anyway? Coaches still will not see it until the scope switch is on.`)) return;
    try { await api('/api/admin/kocha/lessons', { action: 'update_lesson', id: l.id, published: !l.published }); load(); } catch (err) { setError(err.message); }
  }

  if (!data) return <p style={{ color: INK_3, fontSize: '13px' }}>{error || 'Loading…'}</p>;
  const lesson = data.lessons.find((l) => l.n === editing);
  const allGaps = [...data.lessons.flatMap((l) => l.gaps), ...data.courseGaps];

  return (
    <div>
      {error && <p role="alert" style={{ color: '#f87171', fontSize: '13px' }}>{error}</p>}
      <Settings settings={data.settings} api={api} onChange={load} setError={setError} />
      {lesson && <LessonEditor key={lesson.id} lesson={lesson} api={api} reload={load} setError={setError} onClose={() => setEditing(null)} />}
      <Readiness lessons={data.lessons} onEdit={setEditing} onPublish={togglePublish} />
      <div style={card}>
        <h3 style={h3}>Video gaps to-do ({allGaps.filter((g) => !g.resolved_at).length} open) · coaches never see these</h3>
        {allGaps.length ? <GapList gaps={allGaps} api={api} reload={load} setError={setError} /> : <p style={{ color: INK_3, fontSize: '13px' }}>No gaps. Import the lessons manifest to load them.</p>}
      </div>
    </div>
  );
}
