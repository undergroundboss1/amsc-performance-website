'use client';

import { useEffect, useState } from 'react';
import { actionLabel } from '../../lib/admin-audit';

/**
 * AuditLogView — "who did what, and when" across both camp and client
 * admin activity, reachable from both the Camp tab and the main admin nav.
 *
 * Newest-first by default, filterable by actor and domain. Matches the
 * inline-style visual language already used throughout app/admin/page.js
 * (ArrearsView, RevenueView, etc.) rather than the Tailwind-class
 * convention used on the public-facing pages — this lives inside the
 * same admin shell, not a different one.
 */

const ACTORS = ['arnold', 'khivali', 'jenny'];
const ACTOR_LABELS = { arnold: 'Arnold', khivali: 'Khivali', jenny: 'Jenny' };

function formatDateTime(iso) {
  return new Date(iso).toLocaleString('en-KE', {
    day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

export default function AuditLogView({ adminKey }) {
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actorFilter, setActorFilter] = useState('');
  const [domainFilter, setDomainFilter] = useState('');

  async function fetchLog() {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (actorFilter) params.set('actor', actorFilter);
      if (domainFilter) params.set('domain', domainFilter);
      const res = await fetch(`/api/admin/audit-log?${params.toString()}`, {
        headers: { Authorization: `Bearer ${adminKey}` },
      });
      const json = await res.json();
      // A failed fetch must never fall through to the empty state below.
      // "No activity recorded yet" is a factual claim about the log; showing
      // it when the request actually failed hides a broken audit trail behind
      // a reassuring message — which is exactly how a permissions fault here
      // went unnoticed once already.
      if (!res.ok) {
        setActions([]);
        setError(json.error || `Failed to load activity (HTTP ${res.status}).`);
        return;
      }
      setActions(json.actions || []);
    } catch (e) {
      console.error('AuditLogView fetch error', e);
      setActions([]);
      setError('Network error while loading activity.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchLog(); }, [adminKey, actorFilter, domainFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      {/* Filters */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '10px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={fetchLog}
            style={{ background: 'transparent', border: '1px solid #333', color: '#555', borderRadius: '6px', padding: '5px 12px', fontSize: '12px', cursor: 'pointer' }}
          >
            ↻ Refresh
          </button>
          <select
            value={actorFilter}
            onChange={(e) => setActorFilter(e.target.value)}
            style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '6px', padding: '6px 10px', color: '#f5f5f8', fontSize: '13px' }}
          >
            <option value="">All admins</option>
            {ACTORS.map((a) => <option key={a} value={a}>{ACTOR_LABELS[a]}</option>)}
          </select>
          <select
            value={domainFilter}
            onChange={(e) => setDomainFilter(e.target.value)}
            style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '6px', padding: '6px 10px', color: '#f5f5f8', fontSize: '13px' }}
          >
            <option value="">Camp + Client</option>
            <option value="camp">Camp only</option>
            <option value="client">Client only</option>
          </select>
        </div>
      </div>

      {/* Log */}
      {loading ? (
        <p style={{ color: '#555', fontSize: '13px' }}>Loading activity…</p>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', background: '#1a1a1a', border: '1px solid #3a1f1f', borderRadius: '10px' }}>
          <p style={{ color: '#fca5a5', fontSize: '13px', margin: '0 0 4px' }}>Couldn{'’'}t load the activity log.</p>
          <p style={{ color: '#555', fontSize: '12px', margin: '0 0 14px' }}>{error}</p>
          <button
            onClick={fetchLog}
            style={{ background: 'transparent', border: '1px solid #333', color: '#d3d3d3', borderRadius: '6px', padding: '5px 12px', fontSize: '12px', cursor: 'pointer' }}
          >
            Try again
          </button>
        </div>
      ) : actions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', background: '#1a1a1a', border: '1px solid #222', borderRadius: '10px' }}>
          <p style={{ color: '#555', fontSize: '13px', margin: 0 }}>No activity recorded yet.</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #222' }}>
                {['When', 'Who', 'Domain', 'Action', 'Detail'].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 10px', color: '#555', fontFamily: 'Oswald, sans-serif', fontWeight: 700, fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {actions.map((a) => (
                <tr key={a.id} style={{ borderBottom: '1px solid #111' }}>
                  <td style={{ padding: '9px 10px', color: '#d3d3d3', whiteSpace: 'nowrap', fontSize: '12px' }}>{formatDateTime(a.created_at)}</td>
                  <td style={{ padding: '9px 10px', color: '#f5f5f8', fontWeight: 600, whiteSpace: 'nowrap' }}>{ACTOR_LABELS[a.actor] || a.actor}</td>
                  <td style={{ padding: '9px 10px' }}>
                    <span style={{
                      background: a.domain === 'camp' ? '#1a2e1a' : '#1a1a2e',
                      color: a.domain === 'camp' ? '#86efac' : '#93c5fd',
                      borderRadius: '4px', padding: '2px 7px', fontSize: '10px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
                    }}>
                      {a.domain}
                    </span>
                  </td>
                  <td style={{ padding: '9px 10px', color: '#f5f5f8', whiteSpace: 'nowrap' }}>{actionLabel(a.action)}</td>
                  <td style={{ padding: '9px 10px', color: '#555', fontSize: '12px', maxWidth: '360px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {a.detail ? JSON.stringify(a.detail) : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
