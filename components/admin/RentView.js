'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULTS, splitRow, statementTotals, amscPercent } from '../../lib/ttf';

/**
 * RentView — the monthly rent statement for the landlord, TTF.
 *
 * Opens on the current month pre-filled from that month's payments, every
 * line editable, and exports the .xlsx in the layout TTF already receives.
 *
 * The lines are editable because the commissionable amount is a judgement,
 * not a calculation: someone who paid three months up front, or trained
 * half the month, does not commission on the raw figure. The draft gets it
 * right most of the time; the point of the table is the times it doesn't.
 *
 * Matches the inline-style visual language of the other admin views rather
 * than the Tailwind classes used on the public pages.
 */

const money = n => `KES ${Math.round(Number(n) || 0).toLocaleString('en-KE')}`;

function monthLabel(monthISO) {
  return new Date(`${monthISO}T00:00:00Z`).toLocaleDateString('en-KE', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function currentMonth() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`;
}

function shiftMonth(monthISO, direction) {
  const d = new Date(`${monthISO}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + direction);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`;
}

/**
 * A datetime-local input speaks the viewer's local clock, so an ISO instant
 * has to be shifted into it and back out again. Rendering UTC straight into
 * the field and reading it back as local would move the timestamp by the
 * offset — three hours, every time it was touched, in Nairobi.
 */
function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const input = (extra = {}) => ({
  background: '#111',
  border: '1px solid #333',
  borderRadius: '4px',
  padding: '5px 8px',
  color: '#f5f5f8',
  fontSize: '13px',
  width: '100%',
  ...extra,
});

const th = {
  textAlign: 'left',
  padding: '8px 8px',
  color: '#555',
  fontFamily: 'Oswald, sans-serif',
  fontWeight: 700,
  fontSize: '11px',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
};

export default function RentView({ adminKey }) {
  const [month, setMonth] = useState(currentMonth);
  const [statement, setStatement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState(null); // { ok, text }
  // The percent fields are held as text while being typed. Round-tripping
  // them through a number on every keystroke eats the decimal point, so
  // "12.5" can never be typed — it collapses to "12" the moment the dot lands.
  const [pctText, setPctText] = useState({ tsg: '', ttf: '' });
  const [clientNames, setClientNames] = useState([]);

  const asPercentText = n => String(Number((n * 100).toFixed(4)));

  function adoptStatement(s) {
    setStatement(s);
    setPctText({ tsg: asPercentText(s.tsgPercent), ttf: asPercentText(s.ttfPercent) });
  }

  // Paging through months quickly can land responses out of order. Only the
  // newest request is allowed to write state — otherwise a slow reply for
  // June could sit under a July heading, and the next Save would write June's
  // figures over July's statement.
  const requestRef = useRef(0);

  const load = useCallback(async () => {
    const token = ++requestRef.current;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/ttf-statement?month=${month.slice(0, 7)}`, {
        headers: { Authorization: `Bearer ${adminKey}` },
      });
      const json = await res.json();
      if (token !== requestRef.current) return; // a later month is already loading
      if (!res.ok) {
        setMessage({ ok: false, text: json.error || 'Failed to load the statement.' });
        setStatement(null);
        return;
      }
      adoptStatement(json.statement);
      setClientNames(json.clientNames || []);
      setDirty(false);
    } catch {
      if (token !== requestRef.current) return;
      setMessage({ ok: false, text: 'Network error loading the statement.' });
      setStatement(null);
    } finally {
      if (token === requestRef.current) setLoading(false);
    }
  }, [adminKey, month]);

  useEffect(() => { load(); }, [load]);

  // Leaving the month throws away whatever has not been saved, so say so
  // rather than discarding a sheet someone has just spent ten minutes on.
  function goToMonth(next) {
    if (dirty && !window.confirm('This statement has unsaved edits. Leave the month and lose them?')) return;
    setMonth(next);
  }

  function patch(changes) {
    setStatement(s => ({ ...s, ...changes }));
    setDirty(true);
    setMessage(null);
  }

  function patchRow(index, changes) {
    patch({ rows: statement.rows.map((r, i) => (i === index ? { ...r, ...changes } : r)) });
  }

  function addRow(name = '') {
    patch({ rows: [...statement.rows, { name, monthsPaid: 1, totalPaid: 0, commissionable: 0 }] });
  }

  function removeRow(index) {
    patch({ rows: statement.rows.filter((_, i) => i !== index) });
  }

  function recalculateFromCap() {
    patch({
      rows: statement.rows.map(r => ({
        ...r,
        commissionable: Math.min(Number(r.totalPaid) || 0, Number(statement.commissionableCap) || 0),
      })),
    });
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/ttf-statement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminKey}` },
        body: JSON.stringify({ ...statement, month }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMessage({ ok: false, text: json.error || 'Failed to save.' });
        return;
      }
      adoptStatement(json.statement);
      setDirty(false);
      setMessage({ ok: true, text: 'Statement saved.' });
    } catch {
      setMessage({ ok: false, text: 'Network error while saving.' });
    } finally {
      setSaving(false);
    }
  }

  async function exportSheet() {
    setExporting(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/ttf-statement/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminKey}` },
        body: JSON.stringify({ ...statement, month }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setMessage({ ok: false, text: json.error || 'Failed to build the spreadsheet.' });
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `AMSC_PAYMENT_TO_TTF_${monthLabel(month).toUpperCase().replace(' ', '_')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setMessage({ ok: false, text: 'Network error during export.' });
    } finally {
      setExporting(false);
    }
  }

  const atPresent = month === currentMonth();
  const rows = statement?.rows || [];
  const tsgPercent = statement?.tsgPercent ?? DEFAULTS.tsgPercent;
  const ttfPercent = statement?.ttfPercent ?? DEFAULTS.ttfPercent;
  const totals = statementTotals(rows, tsgPercent, ttfPercent);

  // Anyone already on the sheet drops out of the picker, so the same person
  // cannot be added twice and billed twice.
  const onSheet = new Set(rows.map(r => (r.name || '').trim().toLowerCase()));
  const unlistedClients = clientNames.filter(n => !onSheet.has(n.trim().toLowerCase()));

  return (
    <div>
      {/* Month navigator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px', flexWrap: 'wrap' }}>
        <button
          onClick={() => goToMonth(shiftMonth(month, -1))}
          aria-label="Previous month"
          style={{ background: '#1a1a1a', border: '1px solid #333', color: '#f5f5f8', borderRadius: '6px', padding: '6px 13px', fontSize: '14px', cursor: 'pointer', lineHeight: 1 }}
        >
          ←
        </button>
        <span style={{ fontFamily: 'Oswald, sans-serif', fontWeight: 700, fontSize: '14px', letterSpacing: '0.06em', textTransform: 'uppercase', color: '#f5f5f8', minWidth: '170px', textAlign: 'center' }}>
          {monthLabel(month)}
        </span>
        <button
          onClick={() => goToMonth(shiftMonth(month, 1))}
          disabled={atPresent}
          aria-label="Next month"
          style={{ background: '#1a1a1a', border: '1px solid #333', color: '#f5f5f8', borderRadius: '6px', padding: '6px 13px', fontSize: '14px', lineHeight: 1, cursor: atPresent ? 'not-allowed' : 'pointer', opacity: atPresent ? 0.3 : 1 }}
        >
          →
        </button>
        {!atPresent && (
          <button
            onClick={() => goToMonth(currentMonth())}
            style={{ background: 'transparent', border: '1px solid #a60a08', color: '#a60a08', borderRadius: '6px', padding: '6px 14px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'Oswald, sans-serif' }}
          >
            Back to now
          </button>
        )}

        <span style={{ flex: 1 }} />

        {statement && (
          <span style={{ fontSize: '11px', color: '#555' }}>
            {statement.saved
              ? `Saved${statement.updatedBy ? ` by ${statement.updatedBy}` : ''}`
              : 'Draft from this month’s payments — not saved yet'}
          </span>
        )}
      </div>

      {message && (
        <p style={{ color: message.ok ? '#22c55e' : '#fca5a5', fontSize: '13px', marginBottom: '12px' }}>
          {message.text}
        </p>
      )}

      {loading ? (
        <p style={{ color: '#555', fontSize: '13px' }}>Loading statement…</p>
      ) : !statement ? (
        <p style={{ color: '#555', fontSize: '13px', fontStyle: 'italic' }}>No statement available.</p>
      ) : (
        <>
          {/* Terms of the split */}
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'flex-end', background: '#1a1a1a', border: '1px solid #222', borderRadius: '8px', padding: '14px', marginBottom: '18px' }}>
            <label style={{ fontSize: '11px', color: '#555', fontFamily: 'Oswald, sans-serif', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Commissionable cap
              <input
                type="number"
                min="0"
                value={statement.commissionableCap}
                onChange={e => patch({ commissionableCap: Number(e.target.value) })}
                style={input({ width: '120px', marginTop: '5px' })}
              />
            </label>
            <label style={{ fontSize: '11px', color: '#555', fontFamily: 'Oswald, sans-serif', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              TSG %
              <input
                type="number" min="0" max="99" step="0.5"
                value={pctText.tsg}
                onChange={e => {
                  setPctText(p => ({ ...p, tsg: e.target.value }));
                  const n = Number(e.target.value);
                  if (Number.isFinite(n) && n >= 0 && n < 100) patch({ tsgPercent: n / 100 });
                }}
                style={input({ width: '80px', marginTop: '5px' })}
              />
            </label>
            <label style={{ fontSize: '11px', color: '#555', fontFamily: 'Oswald, sans-serif', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              TTF %
              <input
                type="number" min="0" max="99" step="0.5"
                value={pctText.ttf}
                onChange={e => {
                  setPctText(p => ({ ...p, ttf: e.target.value }));
                  const n = Number(e.target.value);
                  if (Number.isFinite(n) && n >= 0 && n < 100) patch({ ttfPercent: n / 100 });
                }}
                style={input({ width: '80px', marginTop: '5px' })}
              />
            </label>
            <button
              onClick={recalculateFromCap}
              style={{ background: 'transparent', border: '1px solid #333', color: '#d3d3d3', borderRadius: '6px', padding: '7px 14px', fontSize: '12px', cursor: 'pointer' }}
            >
              Re-apply cap to all lines
            </button>
            <span style={{ fontSize: '11px', color: '#555' }}>
              AMSC keeps {(amscPercent(tsgPercent, ttfPercent) * 100).toFixed(0)}% of the commissionable amount.
            </span>
          </div>

          {/* Lines */}
          <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
            {/* Sized to fit the admin shell without sideways scrolling: the
                three derived columns are read-only, so they get only the
                width their figures need. */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '700px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #222' }}>
                  <th style={{ ...th, padding: '8px 6px' }}>Name</th>
                  <th style={{ ...th, padding: '8px 6px', width: '62px' }}>Mths</th>
                  <th style={{ ...th, padding: '8px 6px', width: '96px' }}>Total paid</th>
                  <th style={{ ...th, padding: '8px 6px', width: '104px' }}>Commissionable</th>
                  <th style={{ ...th, padding: '8px 6px', width: '78px' }}>To TSG</th>
                  <th style={{ ...th, padding: '8px 6px', width: '78px' }}>To TTF</th>
                  <th style={{ ...th, padding: '8px 6px', width: '82px' }}>To AMSC</th>
                  <th style={{ ...th, padding: '8px 6px', width: '34px' }} />
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '18px 8px', color: '#555', fontStyle: 'italic' }}>
                      No payments recorded for {monthLabel(month)}. Add a line manually if something is missing.
                    </td>
                  </tr>
                ) : (
                  rows.map((r, i) => {
                    const s = splitRow(r, tsgPercent, ttfPercent);
                    const overCap = Number(r.commissionable) > Number(statement.commissionableCap);
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid #111' }}>
                        <td style={{ padding: '5px 6px' }}>
                          <input value={r.name} onChange={e => patchRow(i, { name: e.target.value })} style={input()} />
                        </td>
                        <td style={{ padding: '5px 6px' }}>
                          <input type="number" min="0" step="1" value={r.monthsPaid}
                            onChange={e => patchRow(i, { monthsPaid: Number(e.target.value) })} style={input()} />
                        </td>
                        <td style={{ padding: '5px 6px' }}>
                          <input type="number" min="0" value={r.totalPaid}
                            onChange={e => patchRow(i, { totalPaid: Number(e.target.value) })} style={input()} />
                        </td>
                        <td style={{ padding: '5px 6px' }}>
                          <input type="number" min="0" value={r.commissionable}
                            onChange={e => patchRow(i, { commissionable: Number(e.target.value) })}
                            title={overCap ? 'Above the commissionable cap' : undefined}
                            style={input(overCap ? { borderColor: '#a60a08' } : {})} />
                        </td>
                        <td style={{ padding: '5px 6px', color: '#d3d3d3', whiteSpace: 'nowrap' }}>{money(s.tsg)}</td>
                        <td style={{ padding: '5px 6px', color: '#fbbf24', whiteSpace: 'nowrap' }}>{money(s.ttf)}</td>
                        <td style={{ padding: '5px 6px', color: '#22c55e', whiteSpace: 'nowrap' }}>{money(s.amsc)}</td>
                        <td style={{ padding: '5px 6px' }}>
                          <button
                            onClick={() => removeRow(i)}
                            aria-label={`Remove ${r.name || 'line'}`}
                            style={{ background: 'transparent', border: '1px solid #333', color: '#555', borderRadius: '4px', padding: '4px 8px', fontSize: '12px', cursor: 'pointer' }}
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid #333' }}>
                  <td style={{ padding: '9px 6px', color: '#555', fontFamily: 'Oswald, sans-serif', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Total · {rows.length} line{rows.length !== 1 ? 's' : ''}
                  </td>
                  <td />
                  <td style={{ padding: '9px 6px', color: '#f5f5f8', fontWeight: 700, whiteSpace: 'nowrap' }}>{money(totals.totalPaid)}</td>
                  <td style={{ padding: '9px 6px', color: '#f5f5f8', fontWeight: 700, whiteSpace: 'nowrap' }}>{money(totals.commissionable)}</td>
                  <td style={{ padding: '9px 6px', color: '#d3d3d3', fontWeight: 600, whiteSpace: 'nowrap' }}>{money(totals.tsg)}</td>
                  <td style={{ padding: '9px 6px', color: '#fbbf24', fontWeight: 600, whiteSpace: 'nowrap' }}>{money(totals.ttf)}</td>
                  <td style={{ padding: '9px 6px', color: '#22c55e', fontWeight: 700, whiteSpace: 'nowrap' }}>{money(totals.amsc)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Adding a client. Picking from the roster keeps the spelling
              identical month to month — to the landlord, "Derrick Ogechi"
              and "Derick Ogechi" are two different people. The blank line
              stays for anyone not on the books. */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '20px' }}>
            <select
              value=""
              onChange={e => { if (e.target.value) addRow(e.target.value); }}
              aria-label="Add a client to the statement"
              style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '6px', padding: '7px 12px', color: '#f5f5f8', fontSize: '12px', cursor: 'pointer', maxWidth: '100%' }}
            >
              <option value="">+ Add a client…</option>
              {unlistedClients.length === 0 ? (
                <option value="" disabled>Everyone is already on the sheet</option>
              ) : (
                unlistedClients.map(name => <option key={name} value={name}>{name}</option>)
              )}
            </select>
            <button
              onClick={() => addRow()}
              style={{ background: 'transparent', border: '1px dashed #333', color: '#d3d3d3', borderRadius: '6px', padding: '7px 16px', fontSize: '12px', cursor: 'pointer' }}
            >
              + Blank line
            </button>
            <span style={{ fontSize: '11px', color: '#555' }}>
              Added lines start at zero — type what they paid.
            </span>
          </div>

          {/* What goes to TTF */}
          <div style={{ background: '#1a1a1a', border: '1px solid #222', borderLeft: '2px solid #a60a08', borderRadius: '8px', padding: '16px', marginBottom: '18px' }}>
            <p style={{ fontFamily: 'Oswald, sans-serif', fontWeight: 700, fontSize: '10px', letterSpacing: '0.1em', color: '#555', textTransform: 'uppercase', margin: '0 0 6px 0' }}>
              Total amount owed to TTF
            </p>
            <p style={{ fontSize: '26px', fontWeight: 700, color: '#f5f5f8', margin: '0 0 4px 0' }}>{money(totals.owedToTtf)}</p>
            <p style={{ fontSize: '12px', color: '#555', margin: 0 }}>
              TSG {money(totals.tsg)} + TTF {money(totals.ttf)} — {((tsgPercent + ttfPercent) * 100).toFixed(0)}% of {money(totals.commissionable)} commissionable
            </p>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '14px' }}>
              <label style={{ fontSize: '11px', color: '#555', fontFamily: 'Oswald, sans-serif', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Payment reference
                <input
                  value={statement.paymentReference || ''}
                  onChange={e => patch({ paymentReference: e.target.value })}
                  placeholder="e.g. UG6P2A2S2N"
                  style={input({ width: '200px', marginTop: '5px' })}
                />
              </label>
              <label style={{ fontSize: '11px', color: '#555', fontFamily: 'Oswald, sans-serif', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Paid on
                <input
                  type="datetime-local"
                  value={toLocalInput(statement.paidAt)}
                  onChange={e => patch({ paidAt: e.target.value ? new Date(e.target.value).toISOString() : null })}
                  style={input({ width: '220px', marginTop: '5px' })}
                />
              </label>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={save}
              disabled={saving}
              style={{ background: '#a60a08', border: 'none', color: '#f5f5f8', borderRadius: '6px', padding: '9px 20px', fontSize: '12px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'Oswald, sans-serif', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}
            >
              {saving ? 'Saving…' : 'Save statement'}
            </button>
            <button
              onClick={exportSheet}
              disabled={exporting || rows.length === 0}
              style={{ background: 'transparent', border: '1px solid #333', color: '#d3d3d3', borderRadius: '6px', padding: '9px 20px', fontSize: '12px', fontWeight: 600, cursor: exporting || rows.length === 0 ? 'not-allowed' : 'pointer', opacity: exporting || rows.length === 0 ? 0.4 : 1 }}
            >
              {exporting ? 'Building…' : '↓ Export Excel for TTF'}
            </button>
            {dirty && (
              <span style={{ fontSize: '12px', color: '#fbbf24' }}>
                Unsaved edits — the export uses what is on screen.
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
