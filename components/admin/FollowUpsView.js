'use client';

import { useState } from 'react';
import { getPaymentTiming } from '../../lib/billing';
import {
  COMMS_STATUSES,
  COMMS_STATUS_LABELS,
  COMMS_STATUS_COLORS,
  ESCALATION_REASONS,
  ESCALATION_REASON_LABELS,
  ACTOR_LABELS,
  timeAgo,
  whatsappLink,
} from '../../lib/client-comms';

/**
 * FollowUpsView — the shared client conversation queue.
 *
 * Khivali works the whole list day to day; Arnold works the Escalated filter.
 * The list and its escalation count are owned by app/admin/page.js so the tab
 * badge and this view never disagree about how many escalations are open.
 *
 * Matches the inline-style visual language of the other admin views
 * (ArrearsView, AuditLogView) rather than the Tailwind classes used on the
 * public-facing pages.
 */

const FILTERS = [
  ['open', 'Open'],
  ...COMMS_STATUSES.map((s) => [s, COMMS_STATUS_LABELS[s]]),
];

function StatusBadge({ status }) {
  const c = COMMS_STATUS_COLORS[status] || COMMS_STATUS_COLORS.resolved;
  return (
    <span style={{
      background: c.bg, color: c.fg, borderRadius: '4px', padding: '2px 7px',
      fontSize: '10px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
      whiteSpace: 'nowrap',
    }}>
      {status === 'escalated' ? '🚩 ' : ''}{COMMS_STATUS_LABELS[status] || status}
    </span>
  );
}

/**
 * The billing line for a client, so payment chases carry their own context.
 *
 * getPaymentTiming returns null when there is nothing to bill yet — a new lead
 * who has neither paid nor started training is not in arrears, they simply
 * haven't begun, and flagging them red would bury the clients who genuinely owe.
 */
function billingHint(client) {
  const timing = getPaymentTiming(client);
  if (!timing || timing.paused) return null;
  if (timing.daysOverdue > 0) {
    return {
      text: client.last_paid_at
        ? `${timing.daysOverdue} day${timing.daysOverdue !== 1 ? 's' : ''} overdue`
        : 'Training, never paid',
      urgent: true,
    };
  }
  if (timing.daysUntilDue <= 7) {
    return { text: `Due in ${timing.daysUntilDue} day${timing.daysUntilDue !== 1 ? 's' : ''}`, urgent: false };
  }
  return null;
}

export default function FollowUpsView({ clients, counts, loading, loadError, adminKey, onRefresh, onOpenClient }) {
  const [filter, setFilter] = useState('open');
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({ status: '', reason: '', note: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function startEditing(client) {
    setEditingId(client.id);
    setError('');
    setDraft({
      status: client.comms_status || '',
      reason: client.escalation_reason || 'other',
      note: client.comms_note || '',
    });
  }

  async function save(clientId, overrides = {}) {
    const next = { ...draft, ...overrides };
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/client-comms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminKey}` },
        body: JSON.stringify({
          clientId,
          commsStatus: next.status || null,
          commsNote: next.note,
          escalationReason: next.status === 'escalated' ? next.reason : null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Failed to save.');
        return;
      }
      setEditingId(null);
      await onRefresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const visible = clients.filter((c) => {
    if (filter === 'open' ? c.comms_status === 'resolved' : c.comms_status !== filter) return false;
    if (!search) return true;
    return (c.full_name || '').toLowerCase().includes(search.toLowerCase());
  });

  const escalatedCount = counts.escalated || 0;

  return (
    <div>
      {/* Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '10px', flexWrap: 'wrap' }}>
        <button
          onClick={onRefresh}
          style={{ background: 'transparent', border: '1px solid #333', color: '#555', borderRadius: '6px', padding: '5px 12px', fontSize: '12px', cursor: 'pointer' }}
        >
          ↻ Refresh
        </button>
        <input
          type="text"
          placeholder="Filter by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '6px', padding: '6px 12px', color: '#f5f5f8', fontSize: '13px', width: '200px' }}
        />
      </div>

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '20px' }}>
        {FILTERS.map(([key, label]) => {
          const count = key === 'open'
            ? clients.filter((c) => c.comms_status !== 'resolved').length
            : counts[key] || 0;
          const active = filter === key;
          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              style={{
                background: active ? (key === 'escalated' ? '#450a0a' : '#a60a08') : 'transparent',
                border: `1px solid ${active ? 'transparent' : '#333'}`,
                color: active ? '#f5f5f8' : '#555',
                borderRadius: '999px', padding: '5px 14px', fontSize: '11px', fontWeight: 700,
                letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              {key === 'escalated' ? '🚩 ' : ''}{label}{count > 0 ? ` (${count})` : ''}
            </button>
          );
        })}
      </div>

      {/* Escalation callout — the one thing Arnold opens this tab for */}
      {escalatedCount > 0 && filter !== 'escalated' && (
        <div
          onClick={() => setFilter('escalated')}
          style={{
            background: 'rgba(166,10,8,0.08)', border: '1px solid rgba(166,10,8,0.3)', borderRadius: '8px',
            padding: '12px 14px', marginBottom: '20px', cursor: 'pointer',
          }}
        >
          <p style={{ color: '#fca5a5', fontSize: '13px', fontWeight: 600, margin: 0 }}>
            🚩 {escalatedCount} conversation{escalatedCount !== 1 ? 's' : ''} waiting on Arnold
          </p>
        </div>
      )}

      {error && (
        <p style={{ color: '#fca5a5', fontSize: '13px', marginBottom: '12px' }}>{error}</p>
      )}

      {/* Queue */}
      {loading ? (
        <p style={{ color: '#555', fontSize: '13px' }}>Loading follow-ups…</p>
      ) : loadError ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', background: 'rgba(166,10,8,0.06)', border: '1px solid rgba(166,10,8,0.3)', borderRadius: '10px' }}>
          <p style={{ color: '#fca5a5', fontSize: '14px', fontWeight: 600, margin: '0 0 4px 0' }}>Queue unavailable</p>
          <p style={{ color: '#555', fontSize: '13px', margin: 0 }}>{loadError}</p>
        </div>
      ) : visible.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', background: '#1a1a1a', border: '1px solid #222', borderRadius: '10px' }}>
          <p style={{ color: '#22c55e', fontSize: '14px', fontWeight: 600, margin: '0 0 4px 0' }}>✓ Queue clear</p>
          <p style={{ color: '#555', fontSize: '13px', margin: 0 }}>
            {filter === 'open' ? 'No open conversations to work.' : 'Nothing in this filter.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {visible.map((c) => {
            const editing = editingId === c.id;
            const billing = billingHint(c);
            const wa = whatsappLink(c.phone);

            return (
              <div
                key={c.id}
                style={{
                  background: '#1a1a1a',
                  border: `1px solid ${c.comms_status === 'escalated' ? 'rgba(166,10,8,0.35)' : '#222'}`,
                  borderRadius: '10px',
                  padding: '14px',
                }}
              >
                {/* Row header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                      <span
                        onClick={() => onOpenClient(c)}
                        style={{ color: '#f5f5f8', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}
                      >
                        {c.full_name}
                      </span>
                      <StatusBadge status={c.comms_status} />
                      {c.comms_status === 'escalated' && c.escalation_reason && (
                        <span style={{ color: '#fca5a5', fontSize: '11px' }}>
                          {ESCALATION_REASON_LABELS[c.escalation_reason]}
                        </span>
                      )}
                    </div>
                    <p style={{ color: '#555', fontSize: '12px', margin: 0 }}>
                      Last touched {timeAgo(c.comms_updated_at)}
                      {c.comms_updated_by ? ` by ${ACTOR_LABELS[c.comms_updated_by] || c.comms_updated_by}` : ''}
                      {billing ? ' · ' : ''}
                      {billing && (
                        <span style={{ color: billing.urgent ? '#a60a08' : '#fbbf24' }}>{billing.text}</span>
                      )}
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    {wa && (
                      <a
                        href={wa}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ background: 'transparent', border: '1px solid #333', color: '#86efac', borderRadius: '6px', padding: '5px 10px', fontSize: '11px', fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}
                      >
                        WhatsApp
                      </a>
                    )}
                    <button
                      onClick={() => (editing ? setEditingId(null) : startEditing(c))}
                      style={{ background: 'transparent', border: '1px solid #333', color: '#d3d3d3', borderRadius: '6px', padding: '5px 10px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      {editing ? 'Cancel' : 'Update'}
                    </button>
                    {c.comms_status !== 'resolved' && !editing && (
                      <button
                        onClick={() => save(c.id, { status: 'resolved', note: c.comms_note || '' })}
                        disabled={saving}
                        style={{ background: 'transparent', border: '1px solid #333', color: '#86efac', borderRadius: '6px', padding: '5px 10px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                      >
                        ✓ Done
                      </button>
                    )}
                  </div>
                </div>

                {/* Note */}
                {!editing && c.comms_note && (
                  <p style={{ color: '#d3d3d3', fontSize: '13px', margin: '10px 0 0 0', lineHeight: 1.5 }}>
                    {c.comms_note}
                  </p>
                )}

                {/* Editor */}
                {editing && (
                  <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {COMMS_STATUSES.map((s) => (
                        <button
                          key={s}
                          onClick={() => setDraft((d) => ({ ...d, status: s }))}
                          style={{
                            background: draft.status === s ? (COMMS_STATUS_COLORS[s]?.bg || '#333') : 'transparent',
                            border: `1px solid ${draft.status === s ? 'transparent' : '#333'}`,
                            color: draft.status === s ? (COMMS_STATUS_COLORS[s]?.fg || '#f5f5f8') : '#555',
                            borderRadius: '6px', padding: '6px 12px', fontSize: '11px', fontWeight: 700,
                            letterSpacing: '0.05em', textTransform: 'uppercase', cursor: 'pointer',
                          }}
                        >
                          {s === 'escalated' ? '🚩 ' : ''}{COMMS_STATUS_LABELS[s]}
                        </button>
                      ))}
                    </div>

                    {draft.status === 'escalated' && (
                      <select
                        value={draft.reason}
                        onChange={(e) => setDraft((d) => ({ ...d, reason: e.target.value }))}
                        style={{ background: '#111', border: '1px solid #333', borderRadius: '6px', padding: '8px 10px', color: '#f5f5f8', fontSize: '13px' }}
                      >
                        {ESCALATION_REASONS.map((r) => (
                          <option key={r} value={r}>{ESCALATION_REASON_LABELS[r]}</option>
                        ))}
                      </select>
                    )}

                    <textarea
                      value={draft.note}
                      onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
                      rows={2}
                      placeholder={draft.status === 'escalated' ? 'What does Arnold need to know?' : 'Next action…'}
                      style={{ background: '#111', border: '1px solid #333', borderRadius: '6px', padding: '8px 10px', color: '#f5f5f8', fontSize: '13px', fontFamily: 'inherit', resize: 'vertical' }}
                    />

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => save(c.id)}
                        disabled={saving || !draft.status}
                        style={{
                          background: '#a60a08', border: 'none', color: '#f5f5f8', borderRadius: '6px',
                          padding: '8px 18px', fontSize: '12px', fontWeight: 700, letterSpacing: '0.05em',
                          cursor: saving || !draft.status ? 'not-allowed' : 'pointer',
                          opacity: saving || !draft.status ? 0.5 : 1,
                        }}
                      >
                        {saving ? 'Saving…' : 'Save'}
                      </button>
                      <button
                        onClick={() => save(c.id, { status: null })}
                        disabled={saving}
                        style={{ background: 'transparent', border: '1px solid #333', color: '#555', borderRadius: '6px', padding: '8px 14px', fontSize: '12px', cursor: 'pointer' }}
                      >
                        Remove from queue
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
