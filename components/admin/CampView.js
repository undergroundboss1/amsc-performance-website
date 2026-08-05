'use client';

import { useEffect, useState } from 'react';

/**
 * CampView — the admin Camp tab. Fully separate data (camp.* schema) and
 * fully separate UI code from the rest of app/admin/page.js, surfaced
 * through the same shared shell/login rather than a second dashboard —
 * matches the plan's data-separation requirement while staying one portal.
 *
 * Matches the inline-style visual language already used throughout
 * app/admin/page.js (ArrearsView, AttendanceView, etc.), not the
 * Tailwind-class convention used on public-facing pages.
 */

const ACTOR_LABELS = { arnold: 'Arnold', khivali: 'Khivali', jenny: 'Jenny' };

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatRelative(iso) {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  return `${days}d ago`;
}

function ageFromDob(dobStr) {
  if (!dobStr) return '—';
  const dob = new Date(dobStr);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return age;
}

const STATUS_STYLE = {
  paid:      { bg: '#1a2e1a', fg: '#86efac', label: 'Confirmed' },
  waitlist:  { bg: '#2e2a1a', fg: '#fbbf24', label: 'Waitlist' },
  pending:   { bg: '#1a1a1a', fg: '#888',    label: 'Pending Payment' },
  cancelled: { bg: '#2e1a1a', fg: '#fca5a5', label: 'Cancelled' },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.pending;
  return (
    <span style={{ background: s.bg, color: s.fg, borderRadius: '4px', padding: '2px 8px', fontSize: '10px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
      {s.label}
    </span>
  );
}

function RegistrationCard({ r, adminKey, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [accessCodeInput, setAccessCodeInput] = useState('');
  const [showAttach, setShowAttach] = useState(false);

  async function callAction(path, body) {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminKey}` },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Something went wrong.');
        return;
      }
      onChanged();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const markPaid = () => callAction('/api/admin/camp/mark-paid', { registrationId: r.id });
  const promote = () => callAction('/api/admin/camp/promote', { registrationId: r.id });
  const cancel = () => {
    if (!window.confirm(`Cancel ${r.athlete_name}'s registration? This can't be undone from here.`)) return;
    callAction('/api/admin/camp/cancel', { registrationId: r.id });
  };
  const attachReport = () => {
    if (!accessCodeInput.trim()) return;
    callAction('/api/admin/camp/attach-report', { registrationId: r.id, accessCode: accessCodeInput.trim() });
  };

  return (
    <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: '10px', padding: '16px', marginBottom: '10px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px', gap: '10px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
            <span style={{ color: '#f5f5f8', fontWeight: 700, fontSize: '15px' }}>{r.athlete_name}</span>
            {r.status === 'paid' && r.slot_number && (
              <span style={{ color: '#555', fontSize: '12px' }}>· Slot #{r.slot_number}</span>
            )}
            <StatusBadge status={r.status} />
          </div>
          <p style={{ color: '#888', fontSize: '12px', margin: 0 }}>
            {ageFromDob(r.athlete_dob)} yrs · {r.athlete_gender} {r.school ? `· ${r.school}` : ''}
          </p>
        </div>
        {r.lastAudit && (
          <p style={{ color: '#555', fontSize: '11px', margin: 0, whiteSpace: 'nowrap' }}>
            Last updated by {ACTOR_LABELS[r.lastAudit.actor] || r.lastAudit.actor} · {formatRelative(r.lastAudit.createdAt)}
          </p>
        )}
      </div>

      {/* Contact + medical */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginBottom: '10px', fontSize: '12px' }}>
        <div>
          <p style={{ color: '#555', margin: '0 0 2px 0', fontFamily: 'Oswald, sans-serif', fontWeight: 700, fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Guardian</p>
          <p style={{ color: '#d3d3d3', margin: 0 }}>{r.guardian_name}</p>
          <p style={{ color: '#d3d3d3', margin: 0 }}>{r.guardian_phone}</p>
          <p style={{ color: '#d3d3d3', margin: 0 }}>{r.guardian_email}</p>
        </div>
        <div>
          <p style={{ color: '#555', margin: '0 0 2px 0', fontFamily: 'Oswald, sans-serif', fontWeight: 700, fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Emergency Contact</p>
          <p style={{ color: '#d3d3d3', margin: 0 }}>{r.emergency_name}</p>
          <p style={{ color: '#d3d3d3', margin: 0 }}>{r.emergency_phone}</p>
        </div>
        <div>
          <p style={{ color: '#555', margin: '0 0 2px 0', fontFamily: 'Oswald, sans-serif', fontWeight: 700, fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Consent</p>
          <p style={{ color: r.consent_agreed ? '#86efac' : '#fca5a5', margin: 0 }}>
            {r.consent_agreed ? `Agreed (${r.consent_text_version})` : 'Not agreed'}
          </p>
          {r.paid_at && (
            <>
              <p style={{ color: '#555', margin: '6px 0 2px 0', fontFamily: 'Oswald, sans-serif', fontWeight: 700, fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Payment</p>
              <p style={{ color: '#d3d3d3', margin: 0 }}>
                {r.payment_method === 'manual' ? 'Manual' : r.payment_method === 'paystack_mpesa' ? 'M-Pesa' : 'Card'} · KES {Number(r.amount_paid).toLocaleString()} · {formatDate(r.paid_at)}
              </p>
            </>
          )}
        </div>
      </div>

      {r.medical_notes && (
        <div style={{ background: '#2e1a1a', border: '1px solid #3a2020', borderRadius: '6px', padding: '8px 10px', marginBottom: '10px' }}>
          <p style={{ color: '#fca5a5', fontSize: '10px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', margin: '0 0 3px 0' }}>Medical / Allergies</p>
          <p style={{ color: '#fecaca', fontSize: '12px', margin: 0 }}>{r.medical_notes}</p>
        </div>
      )}

      {/* Report card status (only relevant once paid) */}
      {r.status === 'paid' && (
        <div style={{ marginBottom: '10px', fontSize: '12px' }}>
          <p style={{ color: '#555', margin: '0 0 4px 0', fontFamily: 'Oswald, sans-serif', fontWeight: 700, fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Combine Report Card</p>
          {r.athlete_result_id ? (
            <p style={{ color: '#86efac', margin: 0 }}>Attached</p>
          ) : showAttach ? (
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Access code, e.g. AMSC-2026-0001"
                value={accessCodeInput}
                onChange={(e) => setAccessCodeInput(e.target.value)}
                style={{ background: '#111', border: '1px solid #333', borderRadius: '5px', padding: '5px 8px', color: '#f5f5f8', fontSize: '12px', width: '200px' }}
              />
              <button onClick={attachReport} disabled={busy || !accessCodeInput.trim()} style={{ background: '#a60a08', color: '#fff', border: 'none', borderRadius: '5px', padding: '5px 10px', fontSize: '12px', cursor: 'pointer', opacity: busy ? 0.5 : 1 }}>
                Attach
              </button>
              <button onClick={() => setShowAttach(false)} style={{ background: 'transparent', border: 'none', color: '#555', fontSize: '12px', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          ) : (
            <button onClick={() => setShowAttach(true)} style={{ background: 'transparent', border: '1px solid #333', color: '#d3d3d3', borderRadius: '5px', padding: '4px 10px', fontSize: '11px', cursor: 'pointer' }}>
              Not attached yet — attach
            </button>
          )}
        </div>
      )}

      {error && (
        <p style={{ color: '#fca5a5', fontSize: '12px', marginBottom: '8px' }}>{error}</p>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {r.status === 'pending' && (
          <button onClick={markPaid} disabled={busy} style={{ background: '#a60a08', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', opacity: busy ? 0.5 : 1 }}>
            Mark Paid
          </button>
        )}
        {r.status === 'waitlist' && (
          <button onClick={promote} disabled={busy} style={{ background: '#a60a08', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', opacity: busy ? 0.5 : 1 }}>
            Promote to Confirmed
          </button>
        )}
        {(r.status === 'paid' || r.status === 'waitlist' || r.status === 'pending') && (
          <button onClick={cancel} disabled={busy} style={{ background: 'transparent', border: '1px solid #3a2020', color: '#fca5a5', borderRadius: '6px', padding: '6px 14px', fontSize: '12px', cursor: 'pointer', opacity: busy ? 0.5 : 1 }}>
            Cancel Registration
          </button>
        )}
      </div>
    </div>
  );
}

export default function CampView({ adminKey }) {
  const [camps, setCamps] = useState([]);
  const [selectedCampId, setSelectedCampId] = useState('');
  const [registrations, setRegistrations] = useState([]);
  const [loadingCamps, setLoadingCamps] = useState(true);
  const [loadingRegs, setLoadingRegs] = useState(false);

  async function fetchCamps() {
    setLoadingCamps(true);
    try {
      const res = await fetch('/api/admin/camp/camps', { headers: { Authorization: `Bearer ${adminKey}` } });
      const json = await res.json();
      if (res.ok) {
        setCamps(json.camps || []);
        if (!selectedCampId && json.camps?.length > 0) setSelectedCampId(json.camps[0].id);
      }
    } catch (e) {
      console.error('CampView fetch camps error', e);
    } finally {
      setLoadingCamps(false);
    }
  }

  async function fetchRegistrations() {
    if (!selectedCampId) return;
    setLoadingRegs(true);
    try {
      const res = await fetch(`/api/admin/camp/registrations?campId=${selectedCampId}`, {
        headers: { Authorization: `Bearer ${adminKey}` },
      });
      const json = await res.json();
      if (res.ok) setRegistrations(json.registrations || []);
    } catch (e) {
      console.error('CampView fetch registrations error', e);
    } finally {
      setLoadingRegs(false);
    }
  }

  useEffect(() => { fetchCamps(); }, [adminKey]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { fetchRegistrations(); }, [selectedCampId]); // eslint-disable-line react-hooks/exhaustive-deps

  function refreshAll() {
    fetchCamps();
    fetchRegistrations();
  }

  const selectedCamp = camps.find((c) => c.id === selectedCampId);

  const paid = registrations.filter((r) => r.status === 'paid').sort((a, b) => (a.slot_number || 0) - (b.slot_number || 0));
  const waitlist = registrations.filter((r) => r.status === 'waitlist').sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const pending = registrations.filter((r) => r.status === 'pending');
  const cancelled = registrations.filter((r) => r.status === 'cancelled');

  if (loadingCamps) {
    return <p style={{ color: '#555', fontSize: '13px' }}>Loading camps…</p>;
  }

  if (camps.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px', background: '#1a1a1a', border: '1px solid #222', borderRadius: '10px' }}>
        <p style={{ color: '#555', fontSize: '13px', margin: 0 }}>No camps found. Run the camp schema migration to seed one.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Camp selector + refresh */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '10px', flexWrap: 'wrap' }}>
        <select
          value={selectedCampId}
          onChange={(e) => setSelectedCampId(e.target.value)}
          style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '6px', padding: '7px 12px', color: '#f5f5f8', fontSize: '13px', fontWeight: 600 }}
        >
          {camps.map((c) => (
            <option key={c.id} value={c.id}>{c.name} — {formatDate(c.starts_on)}</option>
          ))}
        </select>
        <button
          onClick={refreshAll}
          style={{ background: 'transparent', border: '1px solid #333', color: '#555', borderRadius: '6px', padding: '5px 12px', fontSize: '12px', cursor: 'pointer' }}
        >
          ↻ Refresh
        </button>
      </div>

      {selectedCamp && (
        <>
          {/* Summary strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px', marginBottom: '20px' }}>
            {[
              { label: 'Capacity', value: String(selectedCamp.capacity), color: '#f5f5f8' },
              { label: 'Confirmed', value: String(selectedCamp.paidCount), color: '#86efac' },
              { label: 'Spots Left', value: String(selectedCamp.spotsRemaining), color: selectedCamp.spotsRemaining === 0 ? '#fca5a5' : '#f5f5f8' },
              { label: 'Waitlist', value: String(waitlist.length), color: '#fbbf24' },
              { label: 'Registration', value: selectedCamp.registration_open ? 'Open' : 'Closed', color: selectedCamp.registration_open ? '#86efac' : '#888' },
            ].map((k) => (
              <div key={k.label} style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: '8px', padding: '12px' }}>
                <p style={{ fontFamily: 'Oswald, sans-serif', fontWeight: 700, fontSize: '10px', letterSpacing: '0.1em', color: '#555', textTransform: 'uppercase', margin: '0 0 4px 0' }}>{k.label}</p>
                <p style={{ fontSize: '18px', fontWeight: 700, color: k.color, margin: 0 }}>{k.value}</p>
              </div>
            ))}
          </div>

          {loadingRegs ? (
            <p style={{ color: '#555', fontSize: '13px' }}>Loading registrants…</p>
          ) : (
            <>
              {/* Confirmed */}
              <h3 style={{ fontFamily: 'Oswald, sans-serif', fontWeight: 700, fontSize: '13px', letterSpacing: '0.08em', color: '#86efac', textTransform: 'uppercase', margin: '0 0 10px 0' }}>
                Confirmed ({paid.length})
              </h3>
              {paid.length === 0 ? (
                <p style={{ color: '#555', fontSize: '12px', marginBottom: '20px' }}>No confirmed registrations yet.</p>
              ) : (
                paid.map((r) => <RegistrationCard key={r.id} r={r} adminKey={adminKey} onChanged={refreshAll} />)
              )}

              {/* Waitlist */}
              {waitlist.length > 0 && (
                <>
                  <h3 style={{ fontFamily: 'Oswald, sans-serif', fontWeight: 700, fontSize: '13px', letterSpacing: '0.08em', color: '#fbbf24', textTransform: 'uppercase', margin: '20px 0 10px 0' }}>
                    Waitlist ({waitlist.length})
                  </h3>
                  {waitlist.map((r) => <RegistrationCard key={r.id} r={r} adminKey={adminKey} onChanged={refreshAll} />)}
                </>
              )}

              {/* Pending payment */}
              {pending.length > 0 && (
                <>
                  <h3 style={{ fontFamily: 'Oswald, sans-serif', fontWeight: 700, fontSize: '13px', letterSpacing: '0.08em', color: '#888', textTransform: 'uppercase', margin: '20px 0 10px 0' }}>
                    Pending Payment ({pending.length})
                  </h3>
                  {pending.map((r) => <RegistrationCard key={r.id} r={r} adminKey={adminKey} onChanged={refreshAll} />)}
                </>
              )}

              {/* Cancelled — de-emphasized, collapsed by default via <details> */}
              {cancelled.length > 0 && (
                <details style={{ marginTop: '20px' }}>
                  <summary style={{ fontFamily: 'Oswald, sans-serif', fontWeight: 700, fontSize: '13px', letterSpacing: '0.08em', color: '#555', textTransform: 'uppercase', cursor: 'pointer', marginBottom: '10px' }}>
                    Cancelled ({cancelled.length})
                  </summary>
                  {cancelled.map((r) => <RegistrationCard key={r.id} r={r} adminKey={adminKey} onChanged={refreshAll} />)}
                </details>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
