'use client';

import { useEffect, useMemo, useState } from 'react';
import { getWaitlistProgram, listWaitlistPrograms } from '../../lib/waitlists';
import { SOURCE_LABELS } from '../../lib/waitlist-source';

/**
 * WaitlistView — the admin Waitlist tab. How many people have joined each
 * program's waitlist, where they came from (Instagram vs everything else),
 * who they are (position / level / age), and a CSV export of every row.
 *
 * Same inline-style visual language as CampView and the rest of
 * app/admin/page.js.
 */

const INK = '#f5f5f8';
const INK_2 = '#d3d3d3';
const INK_3 = '#888';
const LINE = '#222';
const SURFACE = '#111';
const BAR = '#d3d3d3';

function formatDateTime(iso) {
  return new Date(iso).toLocaleString('en-KE', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Nairobi',
  });
}

function pct(n, total) {
  return total ? `${Math.round((n / total) * 100)}%` : '—';
}

function Tile({ value, label, sub }) {
  return (
    <div style={{ background: SURFACE, border: `1px solid ${LINE}`, borderRadius: '8px', padding: '14px 16px', minWidth: 0 }}>
      <div style={{ fontFamily: 'Antonio, Oswald, sans-serif', fontWeight: 700, fontSize: '32px', lineHeight: 1, color: INK }}>{value}</div>
      <div style={{ fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: INK_2, marginTop: '8px' }}>{label}</div>
      {sub && <div style={{ fontSize: '12px', color: INK_3, marginTop: '2px' }}>{sub}</div>}
    </div>
  );
}

function Breakdown({ title, items, total }) {
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <div style={{ background: SURFACE, border: `1px solid ${LINE}`, borderRadius: '8px', padding: '16px' }}>
      <h3 style={{ fontFamily: 'Oswald, sans-serif', fontSize: '12px', letterSpacing: '0.16em', textTransform: 'uppercase', color: INK_2, margin: '0 0 12px', fontWeight: 600 }}>{title}</h3>
      {items.length === 0 && <p style={{ color: INK_3, fontSize: '13px', margin: 0 }}>No data yet.</p>}
      {items.map((i) => (
        <div key={i.key} title={`${i.label}: ${i.count} (${pct(i.count, total)})`} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 64px', gap: '10px', alignItems: 'center', padding: '5px 0' }}>
          <span style={{ fontSize: '13px', color: INK, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.label}</span>
          <span style={{ height: '10px', background: '#1c1c1c', borderRadius: '0 4px 4px 0' }}>
            <span style={{ display: 'block', height: '100%', width: `${(i.count / max) * 100}%`, background: BAR, borderRadius: '0 4px 4px 0', minWidth: i.count ? '2px' : 0 }} />
          </span>
          <span style={{ fontSize: '13px', color: INK_2, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
            {i.count} <span style={{ color: INK_3 }}>{pct(i.count, total)}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

function Days({ days }) {
  const max = Math.max(1, ...days.map((d) => d.count));
  return (
    <div style={{ background: SURFACE, border: `1px solid ${LINE}`, borderRadius: '8px', padding: '16px' }}>
      <h3 style={{ fontFamily: 'Oswald, sans-serif', fontSize: '12px', letterSpacing: '0.16em', textTransform: 'uppercase', color: INK_2, margin: '0 0 12px', fontWeight: 600 }}>Signups per day · last 14 days</h3>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${days.length}, 1fr)`, gap: '2px', alignItems: 'end', height: '96px' }}>
        {days.map((d) => (
          <div key={d.day} title={`${d.day}: ${d.count}`} style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', cursor: 'default' }}>
            <div style={{ height: `${(d.count / max) * 100}%`, minHeight: d.count ? '2px' : 0, background: BAR, borderRadius: '4px 4px 0 0' }} />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: INK_3, marginTop: '6px', borderTop: `1px solid ${LINE}`, paddingTop: '6px' }}>
        <span>{days[0]?.day}</span>
        <span>Peak {Math.max(0, ...days.map((d) => d.count))}/day</span>
        <span>Today</span>
      </div>
    </div>
  );
}

export default function WaitlistView({ adminKey }) {
  const programs = listWaitlistPrograms();
  const [slug, setSlug] = useState(programs[0]?.slug);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [exporting, setExporting] = useState(false);

  const program = getWaitlistProgram(slug);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/waitlist?program=${encodeURIComponent(slug)}`, {
        headers: { Authorization: `Bearer ${adminKey}` },
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || 'Failed to load the waitlist.'); return; }
      setData(json);
    } catch {
      setError('Network error loading the waitlist.');
    } finally {
      setLoading(false);
    }
  }

  async function exportCsv() {
    setExporting(true);
    try {
      const res = await fetch(`/api/admin/waitlist?program=${encodeURIComponent(slug)}&format=csv`, {
        headers: { Authorization: `Bearer ${adminKey}` },
      });
      if (!res.ok) { setError('Export failed.'); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `amsc-waitlist-${slug}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError('Export failed.');
    } finally {
      setExporting(false);
    }
  }

  useEffect(() => { if (slug) load(); }, [slug]); // eslint-disable-line react-hooks/exhaustive-deps

  const labelOf = useMemo(() => {
    const map = {};
    if (program) {
      for (const o of [...program.form.positions, ...program.form.levels, ...program.form.ageBands]) map[o.value] = o.label;
    }
    return (v) => map[v] || v || '—';
  }, [program]);

  const filtered = useMemo(() => {
    const rows = data?.signups || [];
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.first_name, r.email, r.instagram_handle, r.whatsapp_number].some((f) => f && f.toLowerCase().includes(q))
    );
  }, [data, query]);

  const s = data?.summary;
  const btn = { background: '#1a1a1a', border: `1px solid ${LINE}`, color: INK, borderRadius: '6px', padding: '7px 14px', fontSize: '12px', fontWeight: 700, letterSpacing: '0.06em', cursor: 'pointer' };

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {programs.length > 1 ? (
            <select value={slug} onChange={(e) => setSlug(e.target.value)} style={{ ...btn, fontWeight: 400 }}>
              {programs.map((p) => <option key={p.slug} value={p.slug}>{p.name}</option>)}
            </select>
          ) : (
            <span style={{ fontFamily: 'Oswald, sans-serif', fontSize: '16px', letterSpacing: '0.06em', textTransform: 'uppercase', color: INK }}>{program?.name}</span>
          )}
          {program && <span style={{ fontSize: '12px', color: INK_3 }}>{program.path}{program.open ? '' : ' · closed'}</span>}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={load} disabled={loading} style={btn}>{loading ? 'Loading…' : 'Refresh'}</button>
          <button onClick={exportCsv} disabled={exporting || !s?.total} style={{ ...btn, opacity: exporting || !s?.total ? 0.5 : 1 }}>
            {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
        </div>
      </div>

      {error && <div style={{ background: '#450a0a', color: '#fca5a5', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', fontSize: '13px' }}>{error}</div>}

      {s && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', marginBottom: '8px' }}>
            <Tile value={s.total} label="Total joined" />
            <Tile value={s.active} label="Emailable" sub={`Consented, not unsubscribed · ${s.unsubscribed} unsubscribed`} />
            <Tile value={s.last24h} label="Last 24h" />
            <Tile value={s.last7d} label="Last 7 days" />
            <Tile value={s.instagram} label="From Instagram" sub={`${pct(s.instagram, s.total)} of total · ${s.total - s.instagram} other`} />
            <Tile value={s.earlyAccess} label="Early access" sub={`${pct(s.earlyAccess, s.total)} opted in`} />
            <Tile value={s.otherMarketing} label="Other AMSC emails" sub="Opted in to other programs" />
            <Tile value={s.emailsSent} label="Confirmations sent" sub={s.emailsSent < s.total ? `${s.total - s.emailsSent} not sent — check Resend` : 'All sent'} />
          </div>

          <div style={{ marginBottom: '8px' }}>
            <Days days={s.days} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '8px', marginBottom: '24px' }}>
            <Breakdown title="Source" items={s.bySource.map((i) => ({ ...i, label: SOURCE_LABELS[i.key] || i.label }))} total={s.total} />
            <Breakdown title="Position" items={s.byPosition} total={s.total} />
            <Breakdown title="Level" items={s.byLevel} total={s.total} />
            <Breakdown title="Age" items={s.byAge} total={s.total} />
            {s.byCampaign.length > 0 && <Breakdown title="Campaign (utm_campaign)" items={s.byCampaign} total={s.total} />}
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <h3 style={{ fontFamily: 'Oswald, sans-serif', fontSize: '12px', letterSpacing: '0.16em', textTransform: 'uppercase', color: INK_2, margin: 0, fontWeight: 600 }}>
              Signups {query ? `· ${filtered.length} match` : ''}
            </h3>
            <input
              type="search"
              placeholder="Search name, email, number, @handle"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ background: SURFACE, border: `1px solid ${LINE}`, color: INK, borderRadius: '6px', padding: '7px 10px', fontSize: '13px', width: '220px', maxWidth: '55%' }}
            />
          </div>

          {filtered.length === 0 ? (
            <p style={{ color: INK_3, fontSize: '13px' }}>{s.total === 0 ? 'No signups yet.' : 'No matches.'}</p>
          ) : (
            <div style={{ overflowX: 'auto', border: `1px solid ${LINE}`, borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: SURFACE, textAlign: 'left', color: INK_2 }}>
                    {['Joined', 'Name', 'Email', 'WhatsApp', 'Status', 'Instagram', 'Position', 'Level', 'Age', 'Source', 'Early'].map((h) => (
                      <th key={h} style={{ padding: '8px 10px', fontWeight: 600, whiteSpace: 'nowrap', borderBottom: `1px solid ${LINE}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, 300).map((r) => (
                    <tr key={r.id} style={{ borderBottom: `1px solid ${LINE}`, color: INK }}>
                      <td style={{ padding: '8px 10px', whiteSpace: 'nowrap', color: INK_2 }}>{formatDateTime(r.created_at)}</td>
                      <td style={{ padding: '8px 10px' }}>{r.first_name}</td>
                      <td style={{ padding: '8px 10px' }}>{r.email}</td>
                      <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                        {r.whatsapp_number ? (
                          <a href={`https://wa.me/${r.whatsapp_number.replace('+', '')}`} target="_blank" rel="noopener noreferrer" style={{ color: INK }}>{r.whatsapp_number}</a>
                        ) : '—'}
                      </td>
                      <td style={{ padding: '8px 10px', whiteSpace: 'nowrap', color: r.unsubscribed_at ? INK_3 : r.marketing_consent ? '#86efac' : '#fbbf24' }}>
                        {r.unsubscribed_at ? 'Unsubscribed' : r.marketing_consent ? `Subscribed${r.other_marketing_opt_in ? ' +' : ''}` : 'No consent (v1)'}
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        {r.instagram_handle ? (
                          <a href={`https://www.instagram.com/${r.instagram_handle}/`} target="_blank" rel="noopener noreferrer" style={{ color: INK }}>@{r.instagram_handle}</a>
                        ) : '—'}
                      </td>
                      <td style={{ padding: '8px 10px' }}>{labelOf(r.position)}</td>
                      <td style={{ padding: '8px 10px' }}>{labelOf(r.level)}</td>
                      <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>{labelOf(r.age_band)}{r.guardian_consent ? ' · guardian ✓' : ''}</td>
                      <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>{SOURCE_LABELS[r.source] || r.source}{r.utm_campaign ? ` · ${r.utm_campaign}` : ''}</td>
                      <td style={{ padding: '8px 10px' }}>{r.early_access_opt_in ? 'Yes' : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {filtered.length > 300 && (
            <p style={{ color: INK_3, fontSize: '12px', marginTop: '8px' }}>Showing the latest 300. Export CSV for every row.</p>
          )}
        </>
      )}

      {!s && !error && loading && <p style={{ color: INK_3, fontSize: '13px' }}>Loading…</p>}
    </div>
  );
}
