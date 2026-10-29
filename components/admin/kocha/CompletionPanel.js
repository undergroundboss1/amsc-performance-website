'use client';

import { useCallback, useEffect, useState } from 'react';
import { GREEN, INK, INK_3, btn, card, h3, td, th } from './styles';

/**
 * Admin Kocha → Completion. Per coach, per lesson: C = study card opened,
 * V = watched a video (self-reported), H = homework sent. AMSC only;
 * coaches never see each other's progress. CSV export for reports.
 */
export default function CompletionPanel({ api, adminKey }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try { setData(await api('/api/admin/kocha/completion')); } catch (err) { setError(err.message); }
  }, [api]);
  useEffect(() => { load(); }, [load]);

  async function exportCsv() {
    try {
      const res = await fetch('/api/admin/kocha/completion?format=csv', { headers: { Authorization: `Bearer ${adminKey}` } });
      if (!res.ok) throw new Error('Export failed.');
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement('a');
      a.href = url; a.download = 'kocha-completion.csv';
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (err) { setError(err.message); }
  }

  if (!data) return <p style={{ color: INK_3, fontSize: '13px' }}>{error || 'Loading…'}</p>;
  const mark = (on, letter) => <span style={{ color: on ? GREEN : '#333', fontWeight: 700 }}>{letter}</span>;

  return (
    <div style={card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <h3 style={{ ...h3, margin: 0 }}>Completion</h3>
        <button type="button" style={btn} onClick={exportCsv}>Export CSV</button>
      </div>
      <p style={{ color: INK_3, fontSize: '12px', margin: '0 0 8px' }}>C = study card opened · V = video watched · H = homework sent</p>
      {error && <p role="alert" style={{ color: '#f87171', fontSize: '13px' }}>{error}</p>}
      {data.coaches.length === 0 ? <p style={{ color: INK_3, fontSize: '13px' }}>No coaches yet.</p> : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', fontSize: '12px', color: INK }}>
            <thead>
              <tr><th style={th}>Coach</th><th style={th}>Zone</th>{data.lessons.map((n) => <th key={n} style={th}>L{n}</th>)}</tr>
            </thead>
            <tbody>
              {data.coaches.map((c) => (
                <tr key={c.id}>
                  <td style={{ ...td, whiteSpace: 'nowrap' }}>{c.name}{c.active ? '' : ' (link off)'}</td>
                  <td style={td}>{c.zone ?? '—'}</td>
                  {data.lessons.map((n) => (
                    <td key={n} style={{ ...td, whiteSpace: 'nowrap', letterSpacing: '2px' }}>
                      {mark(c.lessons[n].opened, 'C')}{mark(c.lessons[n].watched, 'V')}{mark(c.lessons[n].sent, 'H')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
