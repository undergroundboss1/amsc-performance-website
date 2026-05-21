'use client';

import { useState, useEffect } from 'react';
import { trainingPlans } from '../../lib/plans';

/**
 * /admin — Internal dashboard for reviewing applications.
 *
 * Protected by a simple password prompt (ADMIN_SECRET_KEY).
 * You and your assistant can use this on any device — phone, laptop, tablet.
 */

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function formatDate(date) {
  return date.toLocaleDateString('en-KE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatKES(amount) {
  return `KES ${Number(amount).toLocaleString('en-KE')}`;
}

function paymentMethodLabel(method) {
  const labels = {
    paystack_card: 'Card (Paystack)',
    paystack_mpesa: 'M-Pesa',
    manual_cash: 'Cash',
    manual_bank_transfer: 'Bank Transfer',
    other: 'Other',
  };
  return labels[method] || method || '—';
}

function getPaymentTiming(client) {
  if (!client.last_paid_at && !client.training_start_date) return null;

  const now = new Date();
  const lastPaid = client.last_paid_at ? new Date(client.last_paid_at) : null;
  const isAutoRenew = client.payment_provider === 'paystack'; // card — Paystack handles renewals

  // If training_start_date is set, use it as the billing cycle anchor.
  // This factors in days trained before payment — the cycle counts from when
  // training actually started, not when payment was received.
  // If not set, fall back to last_paid_at (standard behaviour).
  const cycleAnchor = client.training_start_date
    ? new Date(client.training_start_date)
    : lastPaid;

  // Find the next 30-day boundary from cycleAnchor that is still in the future.
  const MS_PER_CYCLE = 30 * 24 * 60 * 60 * 1000;
  const msElapsed = now - cycleAnchor;
  const cyclesCompleted = Math.max(0, Math.floor(msElapsed / MS_PER_CYCLE));
  const nextDue = new Date(cycleAnchor.getTime() + (cyclesCompleted + 1) * MS_PER_CYCLE);

  const daysUntilDue = Math.ceil((nextDue - now) / (1000 * 60 * 60 * 24));
  const daysOverdue = daysUntilDue < 0 ? Math.abs(daysUntilDue) : 0;
  const usingStartDate = !!client.training_start_date;

  return { lastPaid, nextDue, daysUntilDue, daysOverdue, isAutoRenew, cycleAnchor, usingStartDate };
}

function effectiveRate(client) {
  if (client.custom_monthly_rate) return Number(client.custom_monthly_rate);
  if (Number(client.discount_percent) > 0)
    return Math.round(client.plan_price * (1 - Number(client.discount_percent) / 100));
  return client.plan_price;
}

function providerLabel(provider) {
  if (provider === 'paystack') return 'Card (auto-renews)';
  if (provider === 'paystack_mpesa') return 'M-Pesa (manual)';
  if (provider === 'intasend') return 'IntaSend';
  return '—';
}

// ─────────────────────────────────────────────────────────────
// PaymentTimingBar — shown on card and in detail view
// ─────────────────────────────────────────────────────────────

function PaymentTimingBar({ client, detailed = false }) {
  const timing = getPaymentTiming(client);
  const isOverdue = client.payment_status === 'overdue';

  if (!timing && !isOverdue) return null;
  if (client.payment_status === 'pending' || client.payment_status === 'cancelled') return null;

  let dueLabelColor = 'text-white/40';
  let dueValue = null;
  let dueLabel = null;

  if (timing) {
    if (timing.isAutoRenew) {
      dueValue = formatDate(timing.nextDue);
      dueLabel = 'Auto-renews';
      dueLabelColor = 'text-white/40';
    } else if (timing.daysOverdue > 0 || isOverdue) {
      const days = timing ? timing.daysOverdue : '—';
      dueValue = `${days} day${days !== 1 ? 's' : ''} overdue`;
      dueLabel = 'Status';
      dueLabelColor = 'text-[#a60a08]';
    } else if (timing.daysUntilDue <= 7) {
      dueValue = `Due in ${timing.daysUntilDue} day${timing.daysUntilDue !== 1 ? 's' : ''}`;
      dueLabel = 'Next Due';
      dueLabelColor = 'text-yellow-400';
    } else {
      dueValue = formatDate(timing.nextDue);
      dueLabel = 'Next Due';
      dueLabelColor = 'text-white/40';
    }
  }

  return (
    <div className={`grid grid-cols-${dueValue ? '3' : '2'} gap-3 rounded-lg p-3 mb-4 ${
      isOverdue || (timing && timing.daysOverdue > 0)
        ? 'bg-red-900/10 border border-red-500/15'
        : timing && timing.daysUntilDue <= 7 && !timing.isAutoRenew
        ? 'bg-yellow-500/5 border border-yellow-500/15'
        : 'bg-surface-light border border-white/5'
    }`}>
      {/* Last Paid */}
      <div>
        <span className="text-[10px] font-display font-bold tracking-widest uppercase text-white/40 block mb-1">
          Last Paid
        </span>
        <span className="text-white text-sm font-body">
          {timing ? formatDate(timing.lastPaid) : '—'}
        </span>
      </div>

      {/* Next Due / Auto-renews */}
      {dueValue && (
        <div>
          <span className={`text-[10px] font-display font-bold tracking-widest uppercase block mb-1 ${dueLabelColor}`}>
            {dueLabel}
          </span>
          <span className={`text-sm font-body font-semibold ${
            isOverdue || (timing && timing.daysOverdue > 0)
              ? 'text-[#a60a08]'
              : timing && timing.daysUntilDue <= 7 && !timing.isAutoRenew
              ? 'text-yellow-400'
              : 'text-white'
          }`}>
            {dueValue}
          </span>
        </div>
      )}

      {/* Provider or Cycle Anchor indicator */}
      {detailed && (
        <div>
          <span className="text-[10px] font-display font-bold tracking-widest uppercase text-white/40 block mb-1">
            {timing?.usingStartDate ? 'Cycle Anchor' : 'Method'}
          </span>
          <span className="text-white text-sm font-body">
            {timing?.usingStartDate
              ? <span className="text-accent/80 text-xs">From start date</span>
              : providerLabel(client.payment_provider)
            }
          </span>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PaymentLinkBox — reused in card, detail view, plan change
// ─────────────────────────────────────────────────────────────

function PaymentLinkBox({ paymentLink, client, label = 'Payment Link Generated — Send to Client' }) {
  const [copied, setCopied] = useState(false);

  function copyLink() {
    navigator.clipboard.writeText(paymentLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const firstName = client.full_name?.split(' ')[0] || '';
  const phone = client.phone?.replace(/[\s\-()+]/g, '') || '';

  return (
    <div className="bg-green-900/20 border border-green-500/20 rounded-lg p-4 mb-4">
      <p className="text-green-400 text-xs font-display font-bold tracking-widest uppercase mb-3">
        {label}
      </p>
      <div className="flex flex-wrap gap-2 mb-3">
        <a
          href={`https://wa.me/${phone}?text=${encodeURIComponent(
            `Hi ${firstName},\n\nClick the link below to complete your AMSC payment and get started:\n${paymentLink}\n\n— AMSC Performance`
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 min-w-[140px] bg-green-600 text-white px-4 py-2.5 rounded-lg font-display text-xs font-bold tracking-wider uppercase hover:bg-green-700 transition-colors cursor-pointer text-center"
        >
          Send via WhatsApp
        </a>
        <a
          href={`mailto:${client.email}?subject=${encodeURIComponent('AMSC Performance — Payment Link')}&body=${encodeURIComponent(
            `Hi ${firstName},\n\nClick the link below to complete your AMSC payment:\n${paymentLink}\n\n— AMSC Performance`
          )}`}
          className="flex-1 min-w-[140px] bg-blue-600 text-white px-4 py-2.5 rounded-lg font-display text-xs font-bold tracking-wider uppercase hover:bg-blue-700 transition-colors cursor-pointer text-center"
        >
          Send via Email
        </a>
        <button
          onClick={copyLink}
          className="px-4 py-2.5 bg-surface border border-white/10 text-white rounded-lg font-display text-xs font-bold tracking-wider uppercase hover:border-white/30 transition-colors cursor-pointer"
        >
          {copied ? 'Copied!' : 'Copy Link'}
        </button>
      </div>
      <input
        type="text"
        value={paymentLink}
        readOnly
        className="w-full bg-surface border border-white/10 rounded-lg px-3 py-2 text-white/50 font-body text-xs focus:outline-none"
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Status badge helpers
// ─────────────────────────────────────────────────────────────

const appStatusColors = {
  pending_review: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  approved: 'bg-green-500/20 text-green-400 border-green-500/30',
  declined: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const paymentStatusColors = {
  paid: 'bg-green-500/20 text-green-400 border-green-500/30',
  overdue: 'bg-red-500/20 text-[#a60a08] border-red-500/30',
  cancelled: 'bg-white/5 text-white/40 border-white/10',
  failed: 'bg-red-500/20 text-red-400 border-red-500/30',
  pending: null, // don't show
};

function StatusBadges({ client }) {
  const payColor = paymentStatusColors[client.payment_status];
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className={`text-[10px] font-display font-bold tracking-widest uppercase px-3 py-1 rounded-full border ${appStatusColors[client.application_status] || appStatusColors.pending_review}`}>
        {client.application_status?.replace('_', ' ')}
      </span>
      {payColor && (
        <span className={`text-[10px] font-display font-bold tracking-widest uppercase px-3 py-1 rounded-full border ${payColor}`}>
          {client.payment_status}
        </span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// LoginScreen
// ─────────────────────────────────────────────────────────────

function LoginScreen({ onLogin, error }) {
  const [password, setPassword] = useState('');

  return (
    <section className="py-12 px-6 bg-background min-h-screen flex items-center justify-center">
      <div className="max-w-sm w-full">
        <div className="text-center mb-8">
          <h1 className="font-display font-black text-2xl tracking-widest mb-2">AMSC ADMIN</h1>
          <p className="text-secondary font-body text-sm">Enter your admin password to continue.</p>
        </div>
        <div className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onLogin(password)}
            placeholder="Admin password"
            className="w-full bg-surface border border-white/10 rounded-lg px-4 py-3 text-white font-body text-sm placeholder:text-white/20 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
            autoFocus
          />
          {error && <p className="text-red-400 text-sm font-body">{error}</p>}
          <button
            onClick={() => onLogin(password)}
            className="w-full bg-accent text-white font-display font-bold text-sm tracking-wider uppercase py-3 rounded-full hover:bg-accent-dark transition-all cursor-pointer"
          >
            Log In
          </button>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// ApplicationCard — compact list card, clickable
// ─────────────────────────────────────────────────────────────

function ApplicationCard({ client, adminKey, onUpdate, onClick }) {
  const [loading, setLoading] = useState(false);
  const [paymentLink, setPaymentLink] = useState(null);

  async function handleAction(e, action) {
    e.stopPropagation(); // don't open detail view when clicking an action button
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminKey}` },
        body: JSON.stringify({ clientId: client.id }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error || 'Action failed.'); return; }
      if (action === 'approve' && data.paymentUrl) {
        setPaymentLink(data.paymentUrl);
      } else {
        onUpdate();
      }
    } catch {
      alert('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const planName = trainingPlans.find(p => p.id === client.selected_plan)?.name || client.selected_plan;

  return (
    <div
      className="bg-surface border border-white/5 rounded-xl p-6 mb-4 cursor-pointer hover:border-white/15 transition-colors group"
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-display font-bold text-lg text-white group-hover:text-accent transition-colors">
            {client.full_name}
          </h3>
          <p className="text-secondary text-sm font-body">{client.email} &middot; {client.phone}</p>
        </div>
        <StatusBadges client={client} />
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div className="bg-surface-light rounded-lg p-3">
          <span className="text-[10px] font-display font-bold tracking-widest uppercase text-white/40 block mb-1">Plan</span>
          <span className="text-white text-sm font-body">{planName} &middot; KES {client.plan_price?.toLocaleString()}</span>
        </div>
        <div className="bg-surface-light rounded-lg p-3">
          <span className="text-[10px] font-display font-bold tracking-widest uppercase text-white/40 block mb-1">Sport</span>
          <span className="text-white text-sm font-body">{client.sport || '—'}</span>
        </div>
      </div>

      {/* Payment timing */}
      <PaymentTimingBar client={client} />

      <div className="text-white/20 text-xs font-body mb-4">
        Applied {new Date(client.created_at).toLocaleDateString('en-KE', {
          day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
        })}
      </div>

      {/* Payment link (shown after approve) */}
      {paymentLink && (
        <div onClick={e => e.stopPropagation()}>
          <PaymentLinkBox paymentLink={paymentLink} client={client} />
        </div>
      )}

      {/* Actions */}
      {client.application_status === 'pending_review' && (
        <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
          <button
            onClick={(e) => handleAction(e, 'approve')}
            disabled={loading}
            className="flex-1 bg-green-600 text-white font-display font-bold text-sm tracking-wider uppercase py-3 rounded-full hover:bg-green-700 transition-all cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Approve & Get Payment Link'}
          </button>
          <button
            onClick={(e) => handleAction(e, 'decline')}
            disabled={loading}
            className="px-6 py-3 border border-white/10 text-secondary font-display font-bold text-sm tracking-wider uppercase rounded-full hover:border-red-500/50 hover:text-red-400 transition-all cursor-pointer disabled:opacity-50"
          >
            Decline
          </button>
        </div>
      )}

      {client.application_status === 'approved' && client.payment_status !== 'paid' && !paymentLink && (
        <button
          onClick={(e) => handleAction(e, 'approve')}
          disabled={loading}
          className="w-full bg-surface-light border border-white/10 text-white font-display font-bold text-sm tracking-wider uppercase py-3 rounded-full hover:border-green-500/30 transition-all cursor-pointer disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Get Payment Link Again'}
        </button>
      )}

      {/* Tap hint */}
      <p className="text-white/15 text-xs font-body text-right mt-3">Tap to view details →</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ClientDetailView — full detail panel
// ─────────────────────────────────────────────────────────────

function ClientDetailView({ client: initialClient, adminKey, onBack, onUpdate }) {
  const [client, setClient] = useState(initialClient);
  const [actionLoading, setActionLoading] = useState(false);
  const [paymentLink, setPaymentLink] = useState(null);

  const [showPricingEditor, setShowPricingEditor] = useState(false);
  const [pricingForm, setPricingForm] = useState({
    discountPercent: String(client.discount_percent || '0'),
    customMonthlyRate: client.custom_monthly_rate ? String(client.custom_monthly_rate) : '',
    partnershipNote: client.partnership_note || '',
  });
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingResult, setPricingResult] = useState(null); // { ok, message }

  // Plan change state
  const [selectedPlan, setSelectedPlan] = useState(client.selected_plan);
  const [planChanging, setPlanChanging] = useState(false);
  const [planChangeResult, setPlanChangeResult] = useState(null); // { success, message, paymentUrl, subscriptionCancelled }

  // Training start date state
  const [startDate, setStartDate] = useState(
    client.training_start_date
      ? new Date(client.training_start_date).toISOString().split('T')[0]
      : ''
  );
  const [startDateSaving, setStartDateSaving] = useState(false);
  const [startDateResult, setStartDateResult] = useState(null); // { success, message }

  async function handleSavePricing(e) {
    e.preventDefault();
    setPricingLoading(true);
    setPricingResult(null);
    try {
      const body = { clientId: client.id };
      const pct = parseFloat(pricingForm.discountPercent);
      body.discountPercent = isNaN(pct) ? 0 : pct;
      body.customMonthlyRate = pricingForm.customMonthlyRate
        ? Number(pricingForm.customMonthlyRate)
        : null;
      body.partnershipNote = pricingForm.partnershipNote || null;

      const res = await fetch('/api/admin/update-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminKey}` },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (res.ok) {
        // Update local client state so display refreshes immediately
        setClient(prev => ({
          ...prev,
          discount_percent: body.discountPercent,
          custom_monthly_rate: body.customMonthlyRate,
          partnership_note: body.partnershipNote,
        }));
        setPricingResult({ ok: true, message: 'Pricing updated.' });
        setShowPricingEditor(false);
        if (onUpdate) onUpdate();
      } else {
        setPricingResult({ ok: false, message: json.error || 'Failed to update pricing.' });
      }
    } catch (err) {
      setPricingResult({ ok: false, message: 'Something went wrong.' });
    } finally {
      setPricingLoading(false);
    }
  }

  async function handleClearPricing() {
    setPricingLoading(true);
    setPricingResult(null);
    try {
      const res = await fetch('/api/admin/update-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminKey}` },
        body: JSON.stringify({
          clientId: client.id,
          discountPercent: null,
          customMonthlyRate: null,
          partnershipNote: null,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setClient(prev => ({
          ...prev,
          discount_percent: 0,
          custom_monthly_rate: null,
          partnership_note: null,
        }));
        setPricingForm({ discountPercent: '0', customMonthlyRate: '', partnershipNote: '' });
        setPricingResult({ ok: true, message: 'Pricing reset to standard rate.' });
        setShowPricingEditor(false);
        if (onUpdate) onUpdate();
      } else {
        setPricingResult({ ok: false, message: json.error || 'Failed to clear pricing.' });
      }
    } catch (err) {
      setPricingResult({ ok: false, message: 'Something went wrong.' });
    } finally {
      setPricingLoading(false);
    }
  }

  // Payment history state
  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [addPaymentForm, setAddPaymentForm] = useState({
    amount: String(effectiveRate(client)),
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'manual_cash',
    monthsCovered: '1',
    notes: '',
  });
  const [addPaymentLoading, setAddPaymentLoading] = useState(false);
  const [addPaymentResult, setAddPaymentResult] = useState(null); // { ok: bool, message: string }

  const isCardClient = client.payment_provider === 'paystack';
  const planChanged = selectedPlan !== client.selected_plan;
  const selectedPlanObj = trainingPlans.find(p => p.id === selectedPlan);

  async function handleAction(action) {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminKey}` },
        body: JSON.stringify({ clientId: client.id }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error || 'Action failed.'); return; }
      if (action === 'approve' && data.paymentUrl) {
        setPaymentLink(data.paymentUrl);
        setClient(c => ({ ...c, application_status: 'approved' }));
      } else {
        onUpdate();
        onBack();
      }
    } catch {
      alert('Network error. Please try again.');
    } finally {
      setActionLoading(false);
    }
  }

  async function saveStartDate() {
    setStartDateSaving(true);
    setStartDateResult(null);
    try {
      const res = await fetch('/api/admin/update-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminKey}` },
        body: JSON.stringify({
          clientId: client.id,
          trainingStartDate: startDate || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStartDateResult({ success: false, message: data.error || 'Failed to save.' });
        return;
      }
      // Update local client so timing recalculates immediately
      setClient(c => ({ ...c, training_start_date: startDate || null }));
      setStartDateResult({ success: true, message: startDate ? 'Training start date saved.' : 'Start date cleared.' });
      onUpdate();
    } catch {
      setStartDateResult({ success: false, message: 'Network error. Please try again.' });
    } finally {
      setStartDateSaving(false);
    }
  }

  async function handlePlanChange() {
    if (!planChanged || !selectedPlanObj) return;
    setPlanChanging(true);
    setPlanChangeResult(null);
    try {
      const res = await fetch('/api/admin/change-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminKey}` },
        body: JSON.stringify({ clientId: client.id, newPlanId: selectedPlan }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPlanChangeResult({ success: false, message: data.error || 'Plan change failed.' });
        return;
      }
      // Update local client state with new plan
      setClient(c => ({
        ...c,
        selected_plan: selectedPlanObj.id,
        plan_price: selectedPlanObj.price,
        ...(data.paymentUrl ? { payment_status: 'pending', paystack_subscription_code: null } : {}),
      }));
      setPlanChangeResult({
        success: true,
        message: data.message,
        paymentUrl: data.paymentUrl || null,
        subscriptionCancelled: data.subscriptionCancelled,
      });
      onUpdate(); // refresh background list
    } catch {
      setPlanChangeResult({ success: false, message: 'Network error. Please try again.' });
    } finally {
      setPlanChanging(false);
    }
  }

  async function fetchPayments() {
    setPaymentsLoading(true);
    try {
      const res = await fetch(`/api/admin/payments?clientId=${client.id}`, {
        headers: { Authorization: `Bearer ${adminKey}` },
      });
      const json = await res.json();
      if (res.ok) setPayments(json.payments || []);
    } catch (e) {
      console.error('fetchPayments error', e);
    } finally {
      setPaymentsLoading(false);
    }
  }

  async function handleAddPayment(e) {
    e.preventDefault();
    setAddPaymentLoading(true);
    setAddPaymentResult(null);
    try {
      const res = await fetch('/api/admin/add-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminKey}`,
        },
        body: JSON.stringify({
          clientId: client.id,
          amount: Number(addPaymentForm.amount),
          paymentDate: addPaymentForm.paymentDate,
          paymentMethod: addPaymentForm.paymentMethod,
          monthsCovered: Number(addPaymentForm.monthsCovered),
          notes: addPaymentForm.notes || undefined,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setAddPaymentResult({ ok: true, message: json.message });
        setAddPaymentForm({ amount: String(effectiveRate(client)), paymentDate: new Date().toISOString().split('T')[0], paymentMethod: 'manual_cash', monthsCovered: '1', notes: '' });
        setShowAddPayment(false);
        fetchPayments(); // refresh list
        // Also refresh the parent client list
        if (onUpdate) onUpdate();
      } else {
        setAddPaymentResult({ ok: false, message: json.error || 'Failed to record payment.' });
      }
    } catch (err) {
      setAddPaymentResult({ ok: false, message: 'Something went wrong.' });
    } finally {
      setAddPaymentLoading(false);
    }
  }

  useEffect(() => {
    fetchPayments();
  }, [client.id]);

  const planName = trainingPlans.find(p => p.id === client.selected_plan)?.name || client.selected_plan;
  const timing = getPaymentTiming(client);

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back button + header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-secondary hover:text-white font-display font-bold text-xs tracking-widest uppercase transition-colors cursor-pointer"
        >
          ← Back
        </button>
        <div className="h-4 w-px bg-white/10" />
        <h1 className="font-display font-black text-2xl tracking-widest text-white flex-1">
          {client.full_name}
        </h1>
        <StatusBadges client={client} />
      </div>

      {/* ── CONTACT ──────────────────────────────────────────── */}
      <div className="bg-surface border border-white/5 rounded-xl p-6 mb-4">
        <p className="text-[10px] font-display font-bold tracking-widest uppercase text-accent mb-4">Contact</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-surface-light rounded-lg p-3">
            <span className="text-[10px] font-display font-bold tracking-widest uppercase text-white/40 block mb-1">Email</span>
            <span className="text-white text-sm font-body">{client.email}</span>
          </div>
          <div className="bg-surface-light rounded-lg p-3">
            <span className="text-[10px] font-display font-bold tracking-widest uppercase text-white/40 block mb-1">Phone</span>
            <span className="text-white text-sm font-body">{client.phone}</span>
          </div>
          <div className="bg-surface-light rounded-lg p-3">
            <span className="text-[10px] font-display font-bold tracking-widest uppercase text-white/40 block mb-1">Applied</span>
            <span className="text-white text-sm font-body">
              {new Date(client.created_at).toLocaleDateString('en-KE', {
                day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
              })}
            </span>
          </div>
          <div className="bg-surface-light rounded-lg p-3">
            <span className="text-[10px] font-display font-bold tracking-widest uppercase text-white/40 block mb-1">Sport</span>
            <span className="text-white text-sm font-body">{client.sport || '—'}</span>
          </div>
        </div>
      </div>

      {/* ── TRAINING PROFILE ─────────────────────────────────── */}
      <div className="bg-surface border border-white/5 rounded-xl p-6 mb-4">
        <p className="text-[10px] font-display font-bold tracking-widest uppercase text-accent mb-4">Training Profile</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-surface-light rounded-lg p-3 sm:col-span-2">
            <span className="text-[10px] font-display font-bold tracking-widest uppercase text-white/40 block mb-1">Training Goals</span>
            <span className="text-white text-sm font-body">{client.training_goals || '—'}</span>
          </div>
          <div className="bg-surface-light rounded-lg p-3">
            <span className="text-[10px] font-display font-bold tracking-widest uppercase text-white/40 block mb-1">Availability</span>
            <span className="text-white text-sm font-body">{client.availability || '—'}</span>
          </div>
          <div className="bg-surface-light rounded-lg p-3">
            <span className="text-[10px] font-display font-bold tracking-widest uppercase text-white/40 block mb-1">Health Info</span>
            <span className="text-white text-sm font-body">{client.health_info || 'None declared'}</span>
          </div>
        </div>
      </div>

      {/* ── PLAN & FINANCIALS ────────────────────────────────── */}
      <div className="bg-surface border border-white/5 rounded-xl p-6 mb-4">
        <p className="text-[10px] font-display font-bold tracking-widest uppercase text-accent mb-4">Plan & Financials</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div className="bg-surface-light rounded-lg p-3">
            <span className="text-[10px] font-display font-bold tracking-widest uppercase text-white/40 block mb-1">Current Plan</span>
            <span className="text-white text-sm font-body font-semibold">{planName}</span>
          </div>
          <div className="bg-surface-light rounded-lg p-3">
            <span className="text-[10px] font-display font-bold tracking-widest uppercase text-white/40 block mb-1">Monthly Fee</span>
            <span className="text-white text-sm font-body font-semibold">KES {client.plan_price?.toLocaleString()}</span>
          </div>
          <div className="bg-surface-light rounded-lg p-3">
            <span className="text-[10px] font-display font-bold tracking-widest uppercase text-white/40 block mb-1">Payment Method</span>
            <span className="text-white text-sm font-body">{providerLabel(client.payment_provider)}</span>
          </div>
        </div>

        {/* Payment timing — detailed mode shows provider */}
        <PaymentTimingBar client={client} detailed />

        {/* ── Missing training start date warning ───────────────────────────── */}
        {client.application_status === 'approved' && !client.training_start_date && (
          <div style={{ background: '#422006', border: '1px solid #854d0e', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
            <div>
              <p style={{ fontFamily: 'Oswald, sans-serif', fontWeight: 700, fontSize: '12px', letterSpacing: '0.08em', color: '#fbbf24', textTransform: 'uppercase', margin: '0 0 3px 0' }}>
                ⚠ Billing cycle not anchored
              </p>
              <p style={{ color: '#d97706', fontSize: '12px', margin: 0 }}>
                Training start date is not set. Billing defaults to first payment date. Set it if the client started training before they paid.
              </p>
            </div>
            <button
              onClick={() => {
                // Scroll to training start date field in the Pricing Override section
                const el = document.getElementById('training-start-date-field');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el?.focus();
              }}
              style={{ background: '#854d0e', border: 'none', color: '#fef3c7', borderRadius: '6px', padding: '6px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              Set Date →
            </button>
          </div>
        )}

        {/* ── Pricing Override ───────────────────────────────── */}
        <div style={{ borderTop: '1px solid #1a1a1a', paddingTop: '16px', marginTop: '4px' }}>
          {/* Effective rate display */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <div>
              <p style={{ fontFamily: 'Oswald, sans-serif', fontWeight: 700, fontSize: '11px', letterSpacing: '0.1em', color: '#555', textTransform: 'uppercase', margin: '0 0 4px 0' }}>
                Effective Monthly Rate
              </p>
              <p style={{ fontSize: '20px', fontWeight: 700, color: '#f5f5f8', margin: 0 }}>
                {formatKES(effectiveRate(client))}
                <span style={{ fontSize: '12px', color: '#555', fontWeight: 400, marginLeft: '6px' }}>/ month</span>
              </p>
              {/* Explain the rate */}
              {client.custom_monthly_rate ? (
                <p style={{ fontSize: '12px', color: '#fbbf24', margin: '4px 0 0 0' }}>
                  Custom rate · standard {formatKES(client.plan_price)}
                  {client.partnership_note && <span style={{ color: '#d3d3d3' }}> · {client.partnership_note}</span>}
                </p>
              ) : Number(client.discount_percent) > 0 ? (
                <p style={{ fontSize: '12px', color: '#fbbf24', margin: '4px 0 0 0' }}>
                  {client.discount_percent}% discount off {formatKES(client.plan_price)}
                  {client.partnership_note && <span style={{ color: '#d3d3d3' }}> · {client.partnership_note}</span>}
                </p>
              ) : (
                <p style={{ fontSize: '12px', color: '#555', margin: '4px 0 0 0' }}>Standard rate — no discount</p>
              )}
            </div>
            <button
              onClick={() => setShowPricingEditor(v => !v)}
              style={{ background: 'transparent', border: '1px solid #333', color: '#d3d3d3', borderRadius: '6px', padding: '5px 12px', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              {showPricingEditor ? 'Cancel' : 'Edit Pricing'}
            </button>
          </div>

          {/* Result message */}
          {pricingResult && (
            <div style={{ padding: '8px 12px', borderRadius: '6px', marginBottom: '10px', background: pricingResult.ok ? '#14532d' : '#450a0a', color: pricingResult.ok ? '#86efac' : '#fca5a5', fontSize: '13px' }}>
              {pricingResult.message}
            </div>
          )}

          {/* Edit form */}
          {showPricingEditor && (
            <form onSubmit={handleSavePricing} style={{ background: '#111', border: '1px solid #333', borderRadius: '8px', padding: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#555', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Discount %
                  <span style={{ color: '#333', marginLeft: '4px', textTransform: 'none' }}>(0 = no discount)</span>
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="number" min="0" max="99.99" step="0.01"
                    value={pricingForm.discountPercent}
                    onChange={e => setPricingForm(f => ({ ...f, discountPercent: e.target.value }))}
                    style={{ flex: 1, background: '#1a1a1a', border: '1px solid #333', borderRadius: '6px', padding: '8px 10px', color: '#f5f5f8', fontSize: '14px' }}
                  />
                  <span style={{ color: '#555', fontSize: '14px' }}>%</span>
                </div>
                {Number(pricingForm.discountPercent) > 0 && !pricingForm.customMonthlyRate && (
                  <p style={{ fontSize: '11px', color: '#fbbf24', margin: '4px 0 0 0' }}>
                    → {formatKES(Math.round(client.plan_price * (1 - Number(pricingForm.discountPercent) / 100)))} / month
                  </p>
                )}
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#555', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Custom Rate (KES)
                  <span style={{ color: '#333', marginLeft: '4px', textTransform: 'none' }}>(overrides discount)</span>
                </label>
                <input
                  type="number" min="1"
                  value={pricingForm.customMonthlyRate}
                  onChange={e => setPricingForm(f => ({ ...f, customMonthlyRate: e.target.value }))}
                  placeholder="e.g. 8000"
                  style={{ width: '100%', background: '#1a1a1a', border: '1px solid #333', borderRadius: '6px', padding: '8px 10px', color: '#f5f5f8', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#555', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Partnership Note</label>
                <input
                  type="text"
                  value={pricingForm.partnershipNote}
                  onChange={e => setPricingForm(f => ({ ...f, partnershipNote: e.target.value }))}
                  placeholder="e.g. NPH athlete — complimentary pilot"
                  style={{ width: '100%', background: '#1a1a1a', border: '1px solid #333', borderRadius: '6px', padding: '8px 10px', color: '#f5f5f8', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={handleClearPricing}
                  disabled={pricingLoading}
                  style={{ background: 'transparent', border: '1px solid #333', color: '#d3d3d3', borderRadius: '6px', padding: '8px 14px', fontSize: '13px', cursor: pricingLoading ? 'not-allowed' : 'pointer', opacity: pricingLoading ? 0.6 : 1 }}
                >
                  Clear All
                </button>
                <button
                  type="submit"
                  disabled={pricingLoading}
                  style={{ background: '#a60a08', color: '#f5f5f8', border: 'none', borderRadius: '6px', padding: '8px 20px', fontSize: '13px', fontWeight: 600, cursor: pricingLoading ? 'not-allowed' : 'pointer', opacity: pricingLoading ? 0.6 : 1 }}
                >
                  {pricingLoading ? 'Saving…' : 'Save Pricing'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Explicit overdue callout */}
        {client.payment_status === 'overdue' && timing && (
          <div className="bg-red-900/15 border border-red-500/20 rounded-lg px-4 py-3 mb-4">
            <p className="text-[#a60a08] text-sm font-display font-bold tracking-wider uppercase">
              {timing.daysOverdue} day{timing.daysOverdue !== 1 ? 's' : ''} overdue
            </p>
            <p className="text-white/50 text-xs font-body mt-1">
              Was due {formatDate(timing.nextDue)}. Send a payment reminder.
            </p>
          </div>
        )}

        {/* Training Start Date editor */}
        <div id="training-start-date-field" className="border-t border-white/5 pt-4">
          <p className="text-[10px] font-display font-bold tracking-widest uppercase text-white/40 mb-1">
            Training Start Date
          </p>
          <p className="text-white/30 text-xs font-body mb-3">
            Set this if the client began training before paying. The billing cycle
            will anchor to this date so pre-payment days are counted.
            {client.training_start_date && (
              <span className="text-accent/70 ml-1">
                Currently set — next due calculated from {formatDate(new Date(client.training_start_date))}.
              </span>
            )}
          </p>
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={startDate}
              onChange={e => { setStartDate(e.target.value); setStartDateResult(null); }}
              className="flex-1 bg-background border border-white/10 rounded-lg px-4 py-2.5 text-white font-body text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
            />
            {startDate && (
              <button
                onClick={() => { setStartDate(''); setStartDateResult(null); }}
                className="px-3 py-2.5 text-white/30 hover:text-white/60 font-body text-xs transition-colors cursor-pointer"
                title="Clear start date"
              >
                ✕ Clear
              </button>
            )}
            <button
              onClick={saveStartDate}
              disabled={startDateSaving}
              className="px-5 py-2.5 bg-accent text-white font-display font-bold text-xs tracking-wider uppercase rounded-lg hover:bg-accent-dark transition-all cursor-pointer disabled:opacity-50"
            >
              {startDateSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
          {startDateResult && (
            <p className={`text-xs font-body mt-2 ${startDateResult.success ? 'text-green-400' : 'text-red-400'}`}>
              {startDateResult.message}
            </p>
          )}
        </div>

        {/* Raw notes (payment confirmation string from Paystack) */}
        {client.notes && (
          <div className="bg-surface-light rounded-lg p-3 mt-4">
            <span className="text-[10px] font-display font-bold tracking-widest uppercase text-white/40 block mb-1">Payment Record</span>
            <span className="text-white/50 text-xs font-body">{client.notes}</span>
          </div>
        )}
      </div>

      {/* ── CHANGE PLAN ──────────────────────────────────────── */}
      {client.application_status === 'approved' && (
        <div className="bg-surface border border-white/5 rounded-xl p-6 mb-4">
          <p className="text-[10px] font-display font-bold tracking-widest uppercase text-accent mb-4">Change Plan</p>

          <div className="mb-4">
            <label className="block text-xs font-display font-semibold tracking-wider text-secondary mb-2">
              Training Plan
            </label>
            <select
              value={selectedPlan}
              onChange={e => { setSelectedPlan(e.target.value); setPlanChangeResult(null); }}
              className="w-full bg-background border border-white/10 rounded-lg px-4 py-3 text-white font-body text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all cursor-pointer"
            >
              {trainingPlans.map(plan => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} — KES {plan.price.toLocaleString()}/month
                  {plan.id === client.selected_plan ? ' (current)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Card subscription warning */}
          {planChanged && isCardClient && client.paystack_subscription_code && (
            <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg px-4 py-3 mb-4">
              <p className="text-yellow-400 text-xs font-display font-bold tracking-widest uppercase mb-1">
                Card Subscription — Action Required
              </p>
              <p className="text-white/50 text-xs font-body">
                This will attempt to cancel their current Paystack subscription and generate
                a new payment link for the new plan. Send them the new link after saving.
              </p>
            </div>
          )}

          {/* Price change preview */}
          {planChanged && selectedPlanObj && (
            <div className="flex items-center gap-3 mb-4 text-sm font-body">
              <span className="text-white/40">KES {client.plan_price?.toLocaleString()}</span>
              <span className="text-white/20">→</span>
              <span className="text-white font-semibold">KES {selectedPlanObj.price.toLocaleString()}</span>
              <span className="text-secondary">/ month</span>
            </div>
          )}

          {/* Plan change result */}
          {planChangeResult && (
            <div className={`rounded-lg px-4 py-3 mb-4 ${planChangeResult.success ? 'bg-green-900/20 border border-green-500/20' : 'bg-red-900/20 border border-red-500/20'}`}>
              <p className={`text-xs font-display font-bold tracking-widest uppercase mb-1 ${planChangeResult.success ? 'text-green-400' : 'text-red-400'}`}>
                {planChangeResult.success ? 'Plan Updated' : 'Error'}
              </p>
              <p className="text-white/60 text-xs font-body">{planChangeResult.message}</p>
              {planChangeResult.success && isCardClient && !planChangeResult.subscriptionCancelled && (
                <p className="text-yellow-400 text-xs font-body mt-2">
                  ⚠ Could not auto-cancel the old subscription. Cancel it manually in the Paystack dashboard.
                </p>
              )}
            </div>
          )}

          {/* New payment link from plan change */}
          {planChangeResult?.success && planChangeResult.paymentUrl && (
            <PaymentLinkBox
              paymentLink={planChangeResult.paymentUrl}
              client={client}
              label="New Payment Link — Send to Client"
            />
          )}

          <button
            onClick={handlePlanChange}
            disabled={!planChanged || planChanging}
            className="w-full bg-accent text-white font-display font-bold text-sm tracking-wider uppercase py-3 rounded-full hover:bg-accent-dark transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {planChanging ? 'Saving...' : planChanged ? `Save — Switch to ${selectedPlanObj?.name}` : 'No Changes'}
          </button>
        </div>
      )}

      {/* ── ACTIONS ──────────────────────────────────────────── */}
      <div className="bg-surface border border-white/5 rounded-xl p-6 mb-4">
        <p className="text-[10px] font-display font-bold tracking-widest uppercase text-accent mb-4">Actions</p>

        {/* Payment link from approve action */}
        {paymentLink && (
          <PaymentLinkBox paymentLink={paymentLink} client={client} />
        )}

        {client.application_status === 'pending_review' && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleAction('approve')}
              disabled={actionLoading}
              className="flex-1 bg-green-600 text-white font-display font-bold text-sm tracking-wider uppercase py-3 rounded-full hover:bg-green-700 transition-all cursor-pointer disabled:opacity-50"
            >
              {actionLoading ? 'Processing...' : 'Approve & Get Payment Link'}
            </button>
            <button
              onClick={() => handleAction('decline')}
              disabled={actionLoading}
              className="px-6 py-3 border border-white/10 text-secondary font-display font-bold text-sm tracking-wider uppercase rounded-full hover:border-red-500/50 hover:text-red-400 transition-all cursor-pointer disabled:opacity-50"
            >
              Decline
            </button>
          </div>
        )}

        {client.application_status === 'approved' && client.payment_status !== 'paid' && !paymentLink && (
          <button
            onClick={() => handleAction('approve')}
            disabled={actionLoading}
            className="w-full bg-surface-light border border-white/10 text-white font-display font-bold text-sm tracking-wider uppercase py-3 rounded-full hover:border-green-500/30 transition-all cursor-pointer disabled:opacity-50"
          >
            {actionLoading ? 'Loading...' : 'Get Payment Link Again'}
          </button>
        )}

        {client.application_status === 'approved' && client.payment_status === 'paid' && (
          <p className="text-white/30 text-sm font-body text-center py-2">
            Client is active and paid. No actions required.
          </p>
        )}

        {client.application_status === 'declined' && (
          <p className="text-white/30 text-sm font-body text-center py-2">
            Application was declined.
          </p>
        )}
      </div>

      {/* ── PAYMENT HISTORY ──────────────────────────────────── */}
      <div className="bg-surface border border-white/5 rounded-xl p-6 mb-8">
        <div style={{ borderTop: '0', paddingTop: '0', marginTop: '0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <p style={{ fontFamily: 'Oswald, sans-serif', fontWeight: 700, fontSize: '13px', letterSpacing: '0.1em', color: '#d3d3d3', textTransform: 'uppercase', margin: 0 }}>
              Payment History
            </p>
            <button
              onClick={() => setShowAddPayment(v => !v)}
              style={{ background: '#a60a08', color: '#f5f5f8', border: 'none', borderRadius: '6px', padding: '6px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', letterSpacing: '0.05em' }}
            >
              + Add Payment
            </button>
          </div>

          {/* Add payment result message */}
          {addPaymentResult && (
            <div style={{ padding: '10px 14px', borderRadius: '6px', marginBottom: '12px', background: addPaymentResult.ok ? '#14532d' : '#450a0a', color: addPaymentResult.ok ? '#86efac' : '#fca5a5', fontSize: '13px' }}>
              {addPaymentResult.message}
            </div>
          )}

          {/* Add payment inline form */}
          {showAddPayment && (
            <form onSubmit={handleAddPayment} style={{ background: '#111', border: '1px solid #333', borderRadius: '8px', padding: '16px', marginBottom: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <p style={{ fontFamily: 'Oswald, sans-serif', fontWeight: 700, fontSize: '11px', letterSpacing: '0.1em', color: '#555', textTransform: 'uppercase', marginBottom: '12px', margin: '0 0 12px 0' }}>Record Manual Payment</p>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#555', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Amount (KES) *</label>
                <input
                  type="number" required min="1"
                  value={addPaymentForm.amount}
                  onChange={e => setAddPaymentForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="e.g. 15000"
                  style={{ width: '100%', background: '#1a1a1a', border: '1px solid #333', borderRadius: '6px', padding: '8px 10px', color: '#f5f5f8', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#555', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Payment Date *</label>
                <input
                  type="date" required
                  value={addPaymentForm.paymentDate}
                  onChange={e => setAddPaymentForm(f => ({ ...f, paymentDate: e.target.value }))}
                  style={{ width: '100%', background: '#1a1a1a', border: '1px solid #333', borderRadius: '6px', padding: '8px 10px', color: '#f5f5f8', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#555', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Method</label>
                <select
                  value={addPaymentForm.paymentMethod}
                  onChange={e => setAddPaymentForm(f => ({ ...f, paymentMethod: e.target.value }))}
                  style={{ width: '100%', background: '#1a1a1a', border: '1px solid #333', borderRadius: '6px', padding: '8px 10px', color: '#f5f5f8', fontSize: '14px', boxSizing: 'border-box' }}
                >
                  <option value="manual_cash">Cash</option>
                  <option value="manual_bank_transfer">Bank Transfer</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#555', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Months Covered</label>
                <input
                  type="number" min="1" max="24"
                  value={addPaymentForm.monthsCovered}
                  onChange={e => setAddPaymentForm(f => ({ ...f, monthsCovered: e.target.value }))}
                  style={{ width: '100%', background: '#1a1a1a', border: '1px solid #333', borderRadius: '6px', padding: '8px 10px', color: '#f5f5f8', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#555', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Notes</label>
                <input
                  type="text"
                  value={addPaymentForm.notes}
                  onChange={e => setAddPaymentForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Optional note"
                  style={{ width: '100%', background: '#1a1a1a', border: '1px solid #333', borderRadius: '6px', padding: '8px 10px', color: '#f5f5f8', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowAddPayment(false)} style={{ background: 'transparent', border: '1px solid #333', color: '#d3d3d3', borderRadius: '6px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" disabled={addPaymentLoading} style={{ background: '#a60a08', color: '#f5f5f8', border: 'none', borderRadius: '6px', padding: '8px 20px', fontSize: '13px', fontWeight: 600, cursor: addPaymentLoading ? 'not-allowed' : 'pointer', opacity: addPaymentLoading ? 0.6 : 1 }}>
                  {addPaymentLoading ? 'Saving…' : 'Save Payment'}
                </button>
              </div>
            </form>
          )}

          {/* Payment list */}
          {paymentsLoading ? (
            <p style={{ color: '#555', fontSize: '13px' }}>Loading payments…</p>
          ) : payments.length === 0 ? (
            <p style={{ color: '#555', fontSize: '13px', fontStyle: 'italic' }}>No payments recorded yet.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #222' }}>
                    {['Date', 'Amount', 'Method', 'Rent Split', 'Net Revenue', 'Months', 'Notes'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '6px 10px', color: '#555', fontFamily: 'Oswald, sans-serif', fontWeight: 700, fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {payments.map(p => (
                    <tr key={p.id} style={{ borderBottom: '1px solid #111' }}>
                      <td style={{ padding: '8px 10px', color: '#f5f5f8', whiteSpace: 'nowrap' }}>{formatDate(new Date(p.payment_date))}</td>
                      <td style={{ padding: '8px 10px', color: '#f5f5f8', fontWeight: 600 }}>{formatKES(p.amount)}</td>
                      <td style={{ padding: '8px 10px', color: '#d3d3d3' }}>{paymentMethodLabel(p.payment_method)}</td>
                      <td style={{ padding: '8px 10px', color: p.rent_split > 0 ? '#fbbf24' : '#555' }}>{p.rent_split > 0 ? formatKES(p.rent_split) : '—'}</td>
                      <td style={{ padding: '8px 10px', color: '#22c55e' }}>{formatKES(p.net_revenue)}</td>
                      <td style={{ padding: '8px 10px', color: '#d3d3d3', textAlign: 'center' }}>{p.months_covered}</td>
                      <td style={{ padding: '8px 10px', color: '#555', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
                {/* Totals row */}
                {payments.length > 1 && (() => {
                  const totals = payments.reduce((acc, p) => ({
                    amount: acc.amount + Number(p.amount),
                    rent: acc.rent + Number(p.rent_split),
                    net: acc.net + Number(p.net_revenue),
                  }), { amount: 0, rent: 0, net: 0 });
                  return (
                    <tfoot>
                      <tr style={{ borderTop: '2px solid #333' }}>
                        <td style={{ padding: '8px 10px', color: '#555', fontFamily: 'Oswald, sans-serif', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total</td>
                        <td style={{ padding: '8px 10px', color: '#f5f5f8', fontWeight: 700 }}>{formatKES(totals.amount)}</td>
                        <td></td>
                        <td style={{ padding: '8px 10px', color: '#fbbf24', fontWeight: 600 }}>{totals.rent > 0 ? formatKES(totals.rent) : '—'}</td>
                        <td style={{ padding: '8px 10px', color: '#22c55e', fontWeight: 600 }}>{formatKES(totals.net)}</td>
                        <td></td>
                        <td></td>
                      </tr>
                    </tfoot>
                  );
                })()}
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// AddClientModal — manual client creation overlay
// ─────────────────────────────────────────────────────────────

function AddClientModal({ adminKey, onClose, onCreated }) {
  const emptyForm = {
    fullName: '',
    phone: '',
    email: '',
    selectedPlan: 'group',
    sport: '',
    trainingStartDate: '',
    discountPercent: '',
    customMonthlyRate: '',
    partnershipNote: '',
    notes: '',
  };
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // { ok, message }

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const body = {
        fullName: form.fullName,
        phone: form.phone || undefined,
        email: form.email || undefined,
        selectedPlan: form.selectedPlan,
        sport: form.sport || undefined,
        trainingStartDate: form.trainingStartDate || undefined,
        discountPercent: form.discountPercent !== '' ? Number(form.discountPercent) : undefined,
        customMonthlyRate: form.customMonthlyRate !== '' ? Number(form.customMonthlyRate) : undefined,
        partnershipNote: form.partnershipNote || undefined,
        notes: form.notes || undefined,
      };
      const res = await fetch('/api/admin/create-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminKey}` },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (res.ok) {
        setResult({ ok: true, message: `${json.client.full_name} added successfully.` });
        setForm(emptyForm);
        onCreated(); // refresh client list
        setTimeout(() => onClose(), 1200);
      } else {
        setResult({ ok: false, message: json.error || 'Failed to create client.' });
      }
    } catch (err) {
      setResult({ ok: false, message: 'Something went wrong.' });
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    width: '100%', background: '#111', border: '1px solid #333', borderRadius: '6px',
    padding: '8px 10px', color: '#f5f5f8', fontSize: '14px', boxSizing: 'border-box',
  };
  const labelStyle = {
    display: 'block', fontSize: '11px', color: '#555', marginBottom: '4px',
    textTransform: 'uppercase', letterSpacing: '0.05em',
  };
  const fieldStyle = { display: 'flex', flexDirection: 'column' };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000,
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      padding: '40px 20px', overflowY: 'auto',
    }}>
      <div style={{
        background: '#0d0d0d', border: '1px solid #222', borderRadius: '12px',
        width: '100%', maxWidth: '640px', padding: '28px',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <p style={{
            fontFamily: 'Oswald, sans-serif', fontWeight: 700, fontSize: '20px',
            letterSpacing: '0.08em', color: '#f5f5f8', textTransform: 'uppercase', margin: 0,
          }}>Add Client</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#555', fontSize: '20px', cursor: 'pointer', lineHeight: 1 }}>✕</button>
        </div>

        {/* Result banner */}
        {result && (
          <div style={{
            padding: '10px 14px', borderRadius: '6px', marginBottom: '16px',
            background: result.ok ? '#14532d' : '#450a0a',
            color: result.ok ? '#86efac' : '#fca5a5', fontSize: '13px',
          }}>
            {result.message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>

            {/* Full Name */}
            <div style={{ ...fieldStyle, gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Full Name *</label>
              <input required type="text" value={form.fullName} onChange={e => set('fullName', e.target.value)} placeholder="e.g. John Kamau" style={inputStyle} />
            </div>

            {/* Phone */}
            <div style={fieldStyle}>
              <label style={labelStyle}>Phone</label>
              <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="07xx xxx xxx" style={inputStyle} />
            </div>

            {/* Email */}
            <div style={fieldStyle}>
              <label style={labelStyle}>Email</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="client@email.com" style={inputStyle} />
            </div>

            {/* Training Plan */}
            <div style={fieldStyle}>
              <label style={labelStyle}>Training Plan *</label>
              <select required value={form.selectedPlan} onChange={e => set('selectedPlan', e.target.value)} style={inputStyle}>
                {trainingPlans.map(p => (
                  <option key={p.id} value={p.id}>{p.name} — {p.displayPrice}</option>
                ))}
              </select>
            </div>

            {/* Sport */}
            <div style={fieldStyle}>
              <label style={labelStyle}>Sport</label>
              <input type="text" value={form.sport} onChange={e => set('sport', e.target.value)} placeholder="e.g. Football" style={inputStyle} />
            </div>

            {/* Training Start Date */}
            <div style={fieldStyle}>
              <label style={labelStyle}>Training Start Date</label>
              <input type="date" value={form.trainingStartDate} onChange={e => set('trainingStartDate', e.target.value)} style={inputStyle} />
            </div>

            {/* Discount % */}
            <div style={fieldStyle}>
              <label style={labelStyle}>
                Discount %
                <span style={{ color: '#333', marginLeft: '4px', textTransform: 'none' }}>(0 = none)</span>
              </label>
              <input type="number" min="0" max="99.99" step="0.01" value={form.discountPercent} onChange={e => set('discountPercent', e.target.value)} placeholder="e.g. 30" style={inputStyle} />
            </div>

            {/* Custom Rate */}
            <div style={fieldStyle}>
              <label style={labelStyle}>
                Custom Rate (KES)
                <span style={{ color: '#333', marginLeft: '4px', textTransform: 'none' }}>(overrides %)</span>
              </label>
              <input type="number" min="1" value={form.customMonthlyRate} onChange={e => set('customMonthlyRate', e.target.value)} placeholder="e.g. 8000" style={inputStyle} />
            </div>

            {/* Effective rate preview */}
            {(form.customMonthlyRate || form.discountPercent) && (() => {
              const plan = trainingPlans.find(p => p.id === form.selectedPlan);
              if (!plan) return null;
              let rate = plan.price;
              if (form.customMonthlyRate) rate = Number(form.customMonthlyRate);
              else if (form.discountPercent) rate = Math.round(plan.price * (1 - Number(form.discountPercent) / 100));
              return (
                <div style={{ gridColumn: '1 / -1', background: '#111', border: '1px solid #222', borderRadius: '6px', padding: '10px 14px' }}>
                  <p style={{ margin: 0, fontSize: '13px', color: '#fbbf24' }}>
                    Effective rate: <strong>{formatKES(rate)} / month</strong>
                    {form.customMonthlyRate
                      ? <span style={{ color: '#555' }}> (custom override)</span>
                      : <span style={{ color: '#555' }}> ({form.discountPercent}% off {formatKES(plan.price)})</span>
                    }
                  </p>
                </div>
              );
            })()}

            {/* Partnership Note */}
            <div style={{ ...fieldStyle, gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Partnership Note</label>
              <input type="text" value={form.partnershipNote} onChange={e => set('partnershipNote', e.target.value)} placeholder="e.g. NPH athlete — complimentary pilot" style={inputStyle} />
            </div>

            {/* Admin Notes */}
            <div style={{ ...fieldStyle, gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Admin Notes</label>
              <input type="text" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional internal notes" style={inputStyle} />
            </div>

          </div>

          {/* Footer */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #1a1a1a' }}>
            <button type="button" onClick={onClose} style={{ background: 'transparent', border: '1px solid #333', color: '#d3d3d3', borderRadius: '6px', padding: '9px 20px', fontSize: '13px', cursor: 'pointer' }}>
              Cancel
            </button>
            <button type="submit" disabled={loading} style={{ background: '#a60a08', color: '#f5f5f8', border: 'none', borderRadius: '6px', padding: '9px 24px', fontSize: '13px', fontWeight: 700, letterSpacing: '0.05em', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}>
              {loading ? 'Creating…' : 'Create Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ImportPaymentsModal — CSV upload / paste → preview → import
// ─────────────────────────────────────────────────────────────

function ImportPaymentsModal({ adminKey, onClose, onImported }) {
  const [stage, setStage] = useState('upload'); // 'upload' | 'preview' | 'result'
  const [csvText, setCsvText] = useState('');
  const [parsedRows, setParsedRows] = useState([]);
  const [parseError, setParseError] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  function parseCSV(text) {
    const lines = text.trim().split('\n').filter(l => l.trim());
    if (lines.length < 2) return { rows: [], error: 'CSV must have a header row and at least one data row.' };

    // Detect delimiter: comma or semicolon
    const delim = lines[0].includes(';') ? ';' : ',';
    const headers = lines[0].split(delim).map(h => h.trim().toLowerCase().replace(/[^a-z_]/g, '_'));

    // Find column indices (flexible — any order)
    const col = (names) => { for (const n of names) { const i = headers.indexOf(n); if (i >= 0) return i; } return -1; };
    const iName = col(['client_name', 'name', 'member_name', 'member']);
    const iDate = col(['payment_date', 'date', 'paid_at', 'paid_on']);
    const iAmount = col(['amount', 'amt', 'payment_amount', 'fee']);
    const iPlan = col(['plan', 'tier', 'plan_id']);
    const iNotes = col(['notes', 'note', 'description', 'remarks']);

    if (iName < 0) return { rows: [], error: 'Could not find a "client_name" column.' };
    if (iDate < 0) return { rows: [], error: 'Could not find a "payment_date" column.' };
    if (iAmount < 0) return { rows: [], error: 'Could not find an "amount" column.' };

    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const cells = lines[i].split(delim).map(c => c.trim().replace(/^"|"$/g, ''));
      const clientName = iName >= 0 ? cells[iName] : '';
      const paymentDate = iDate >= 0 ? cells[iDate] : '';
      const amountRaw = iAmount >= 0 ? cells[iAmount] : '';
      const plan = iPlan >= 0 ? cells[iPlan] : '';
      const notes = iNotes >= 0 ? cells[iNotes] : '';

      // Validate
      let error = null;
      if (!clientName) error = 'Missing client name';
      else if (!paymentDate) error = 'Missing payment date';
      else if (!amountRaw || isNaN(Number(amountRaw.replace(/,/g,''))) || Number(amountRaw.replace(/,/g,'')) <= 0)
        error = `Invalid amount: ${amountRaw}`;

      rows.push({
        rowNum: i,
        clientName,
        paymentDate,
        amount: amountRaw.replace(/,/g,''),
        plan,
        notes,
        error,
      });
    }
    return { rows, error: null };
  }

  function handleParse() {
    setParseError('');
    const { rows, error } = parseCSV(csvText);
    if (error) { setParseError(error); return; }
    setParsedRows(rows);
    setStage('preview');
  }

  function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setCsvText(ev.target.result);
    reader.readAsText(file);
  }

  async function handleImport() {
    setImporting(true);
    const validRows = parsedRows.filter(r => !r.error).map(r => ({
      clientName: r.clientName,
      paymentDate: r.paymentDate,
      amount: Number(r.amount),
      plan: r.plan || undefined,
      notes: r.notes || undefined,
    }));
    try {
      const res = await fetch('/api/admin/import-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminKey}` },
        body: JSON.stringify({ rows: validRows }),
      });
      const json = await res.json();
      if (res.ok) {
        setImportResult(json);
        setStage('result');
      } else {
        setImportResult({ error: json.error || 'Import failed.' });
        setStage('result');
      }
    } catch (err) {
      setImportResult({ error: 'Something went wrong.' });
      setStage('result');
    } finally {
      setImporting(false);
    }
  }

  const validCount = parsedRows.filter(r => !r.error).length;
  const errorCount = parsedRows.filter(r => !!r.error).length;

  const overlayStyle = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 1000,
    display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
    padding: '40px 20px', overflowY: 'auto',
  };
  const modalStyle = {
    background: '#0d0d0d', border: '1px solid #222', borderRadius: '12px',
    width: '100%', maxWidth: '760px', padding: '28px',
  };
  const inputStyle = {
    width: '100%', background: '#111', border: '1px solid #333', borderRadius: '6px',
    padding: '8px 12px', color: '#f5f5f8', fontSize: '13px', boxSizing: 'border-box',
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <p style={{ fontFamily: 'Oswald, sans-serif', fontWeight: 700, fontSize: '18px', letterSpacing: '0.08em', color: '#f5f5f8', textTransform: 'uppercase', margin: 0 }}>
              Import Payment Records
            </p>
            <p style={{ color: '#555', fontSize: '12px', margin: '4px 0 0 0' }}>
              Stage: {stage === 'upload' ? '1 — Upload CSV' : stage === 'preview' ? '2 — Review & Confirm' : '3 — Complete'}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#555', fontSize: '20px', cursor: 'pointer' }}>✕</button>
        </div>

        {/* Stage 1 — Upload */}
        {stage === 'upload' && (
          <div>
            <div style={{ background: '#111', border: '1px solid #222', borderRadius: '8px', padding: '14px', marginBottom: '16px' }}>
              <p style={{ fontFamily: 'Oswald, sans-serif', fontWeight: 700, fontSize: '11px', letterSpacing: '0.1em', color: '#555', textTransform: 'uppercase', margin: '0 0 6px 0' }}>Expected CSV columns</p>
              <p style={{ color: '#d3d3d3', fontSize: '13px', fontFamily: 'monospace', margin: '0 0 4px 0' }}>client_name, payment_date, amount, plan (optional), notes (optional)</p>
              <p style={{ color: '#555', fontSize: '12px', margin: 0 }}>
                Dates: YYYY-MM-DD or DD/MM/YYYY · Plan values: Tier 1, Tier 2, Tier 3, Online (or leave blank → defaults to Group)
              </p>
            </div>

            {parseError && (
              <div style={{ background: '#450a0a', color: '#fca5a5', borderRadius: '6px', padding: '10px 14px', marginBottom: '12px', fontSize: '13px' }}>
                {parseError}
              </div>
            )}

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: '#555', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Upload .csv file</label>
              <input type="file" accept=".csv,.txt" onChange={handleFileUpload}
                style={{ color: '#d3d3d3', fontSize: '13px' }} />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: '#555', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Or paste CSV text</label>
              <textarea
                value={csvText}
                onChange={e => setCsvText(e.target.value)}
                rows={8}
                placeholder={'client_name,payment_date,amount,plan,notes\nDerrick Ogechi,2026-04-28,39000,Tier 1,April payment\nRyan Karimi,2026-04-10,60000,Tier 2,'}
                style={{ ...inputStyle, resize: 'vertical', fontFamily: 'monospace', fontSize: '12px' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={onClose} style={{ background: 'transparent', border: '1px solid #333', color: '#d3d3d3', borderRadius: '6px', padding: '8px 18px', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleParse} disabled={!csvText.trim()} style={{ background: '#a60a08', color: '#f5f5f8', border: 'none', borderRadius: '6px', padding: '8px 22px', fontSize: '13px', fontWeight: 700, cursor: !csvText.trim() ? 'not-allowed' : 'pointer', opacity: !csvText.trim() ? 0.5 : 1 }}>
                Parse →
              </button>
            </div>
          </div>
        )}

        {/* Stage 2 — Preview */}
        {stage === 'preview' && (
          <div>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <span style={{ background: '#14532d', color: '#86efac', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', fontWeight: 600 }}>✓ {validCount} valid rows</span>
              {errorCount > 0 && <span style={{ background: '#450a0a', color: '#fca5a5', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', fontWeight: 600 }}>✗ {errorCount} rows will be skipped</span>}
            </div>

            <div style={{ overflowX: 'auto', maxHeight: '360px', overflowY: 'auto', marginBottom: '16px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead style={{ position: 'sticky', top: 0, background: '#0d0d0d' }}>
                  <tr style={{ borderBottom: '1px solid #222' }}>
                    {['#', 'Client Name', 'Date', 'Amount', 'Plan', 'Notes', 'Status'].map(h => (
                      <th key={h} style={{ padding: '6px 8px', color: '#555', fontFamily: 'Oswald, sans-serif', fontWeight: 700, fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #111', opacity: row.error ? 0.5 : 1 }}>
                      <td style={{ padding: '6px 8px', color: '#555' }}>{row.rowNum}</td>
                      <td style={{ padding: '6px 8px', color: '#f5f5f8' }}>{row.clientName || '—'}</td>
                      <td style={{ padding: '6px 8px', color: '#d3d3d3', whiteSpace: 'nowrap' }}>{row.paymentDate || '—'}</td>
                      <td style={{ padding: '6px 8px', color: '#f5f5f8', fontWeight: 600, whiteSpace: 'nowrap' }}>{row.amount ? formatKES(row.amount) : '—'}</td>
                      <td style={{ padding: '6px 8px', color: '#d3d3d3' }}>{row.plan || '—'}</td>
                      <td style={{ padding: '6px 8px', color: '#555', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.notes || '—'}</td>
                      <td style={{ padding: '6px 8px' }}>
                        {row.error
                          ? <span style={{ color: '#fca5a5', fontSize: '11px' }}>✗ {row.error}</span>
                          : <span style={{ color: '#86efac', fontSize: '11px' }}>✓</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setStage('upload')} style={{ background: 'transparent', border: '1px solid #333', color: '#d3d3d3', borderRadius: '6px', padding: '8px 18px', fontSize: '13px', cursor: 'pointer' }}>← Back</button>
              <button onClick={handleImport} disabled={importing || validCount === 0} style={{ background: '#a60a08', color: '#f5f5f8', border: 'none', borderRadius: '6px', padding: '8px 22px', fontSize: '13px', fontWeight: 700, cursor: (importing || validCount === 0) ? 'not-allowed' : 'pointer', opacity: (importing || validCount === 0) ? 0.6 : 1 }}>
                {importing ? 'Importing…' : `Import ${validCount} Payment${validCount !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        )}

        {/* Stage 3 — Result */}
        {stage === 'result' && importResult && (
          <div>
            {importResult.error ? (
              <div style={{ background: '#450a0a', color: '#fca5a5', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>{importResult.error}</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                <div style={{ background: '#14532d', color: '#86efac', borderRadius: '8px', padding: '14px', fontSize: '14px', fontWeight: 600 }}>
                  ✓ {importResult.imported} payment{importResult.imported !== 1 ? 's' : ''} imported
                </div>
                {importResult.clientsCreated > 0 && (
                  <div style={{ background: '#1e3a5f', color: '#93c5fd', borderRadius: '8px', padding: '14px', fontSize: '14px', fontWeight: 600 }}>
                    ★ {importResult.clientsCreated} new client record{importResult.clientsCreated !== 1 ? 's' : ''} created
                  </div>
                )}
                {importResult.errors?.length > 0 && (
                  <div style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', padding: '14px' }}>
                    <p style={{ color: '#fbbf24', fontSize: '13px', fontWeight: 600, margin: '0 0 8px 0' }}>⚠ {importResult.errors.length} row{importResult.errors.length !== 1 ? 's' : ''} skipped</p>
                    {importResult.errors.slice(0, 5).map((e, i) => (
                      <p key={i} style={{ color: '#555', fontSize: '12px', margin: '2px 0' }}>Row {e.row}: {e.reason}</p>
                    ))}
                    {importResult.errors.length > 5 && <p style={{ color: '#555', fontSize: '12px', margin: '4px 0 0 0' }}>…and {importResult.errors.length - 5} more</p>}
                  </div>
                )}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => { onImported(); }}
                style={{ background: '#a60a08', color: '#f5f5f8', border: 'none', borderRadius: '6px', padding: '9px 24px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ArrearsView — clients with outstanding balances
// ─────────────────────────────────────────────────────────────

function ArrearsView({ adminKey }) {
  const [clients, setClients] = useState([]);
  const [totals, setTotals] = useState({ count: 0, totalOwed: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  async function fetchArrears() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/arrears', {
        headers: { Authorization: `Bearer ${adminKey}` },
      });
      const json = await res.json();
      if (res.ok) {
        setClients(json.clients || []);
        setTotals(json.totals || { count: 0, totalOwed: 0 });
      }
    } catch (e) {
      console.error('ArrearsView fetch error', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchArrears(); }, [adminKey]);

  function exportArrearsCSV() {
    const rows = [
      ['Client', 'Plan', 'Effective Rate (KES)', 'Months Enrolled', 'Months Paid', 'Months Owed', 'Amount Owed (KES)', 'Last Paid', 'Payment Status'],
      ...filtered.map(c => [
        c.full_name,
        c.selected_plan,
        Number(c.effective_price || c.plan_price),
        c.months_enrolled,
        c.months_paid,
        c.months_owed,
        Number(c.amount_owed),
        c.last_paid_at ? new Date(c.last_paid_at).toLocaleDateString('en-KE') : 'Never',
        c.payment_status,
      ]),
    ];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AMSC_arrears_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const filtered = clients.filter(c =>
    !filter || (c.full_name || '').toLowerCase().includes(filter.toLowerCase())
  );

  const planLabel = { 'one-on-one': '1-on-1', group: 'Group', youth: 'Youth', online: 'Online' };

  return (
    <div>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={fetchArrears}
            style={{ background: 'transparent', border: '1px solid #333', color: '#555', borderRadius: '6px', padding: '5px 12px', fontSize: '12px', cursor: 'pointer' }}
          >
            ↻ Refresh
          </button>
          <button
            onClick={exportArrearsCSV}
            disabled={filtered.length === 0}
            style={{ background: 'transparent', border: '1px solid #333', color: '#d3d3d3', borderRadius: '6px', padding: '5px 14px', fontSize: '12px', fontWeight: 600, cursor: filtered.length === 0 ? 'not-allowed' : 'pointer', opacity: filtered.length === 0 ? 0.4 : 1 }}
          >
            ↓ Export CSV
          </button>
        </div>
        <input
          type="text"
          placeholder="Filter by name…"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '6px', padding: '6px 12px', color: '#f5f5f8', fontSize: '13px', width: '200px' }}
        />
      </div>

      {/* Summary strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '24px' }}>
        {[
          { label: 'Clients in Arrears', value: String(totals.count), color: '#f5f5f8' },
          { label: 'Total Amount Owed', value: formatKES(totals.totalOwed), color: '#a60a08' },
          { label: 'Avg per Client', value: totals.count > 0 ? formatKES(Math.round(totals.totalOwed / totals.count)) : '—', color: '#fbbf24' },
        ].map(k => (
          <div key={k.label} style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: '8px', padding: '14px' }}>
            <p style={{ fontFamily: 'Oswald, sans-serif', fontWeight: 700, fontSize: '10px', letterSpacing: '0.1em', color: '#555', textTransform: 'uppercase', margin: '0 0 5px 0' }}>{k.label}</p>
            <p style={{ fontSize: '20px', fontWeight: 700, color: k.color, margin: 0 }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Arrears table */}
      {loading ? (
        <p style={{ color: '#555', fontSize: '13px' }}>Loading arrears…</p>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', background: '#1a1a1a', border: '1px solid #222', borderRadius: '10px' }}>
          <p style={{ color: '#22c55e', fontSize: '14px', fontWeight: 600, margin: '0 0 4px 0' }}>✓ No outstanding balances</p>
          <p style={{ color: '#555', fontSize: '13px', margin: 0 }}>All active clients are up to date.</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #222' }}>
                {['Client', 'Plan', 'Rate / mo', 'Enrolled', 'Paid', 'Owed', 'Amount Owed', 'Last Paid', 'Status'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 10px', color: '#555', fontFamily: 'Oswald, sans-serif', fontWeight: 700, fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => {
                const rate = Number(c.effective_price || c.plan_price);
                const isDiscounted = rate < Number(c.plan_price);
                const amtOwed = Number(c.amount_owed);
                const lastPaid = c.last_paid_at ? formatDate(new Date(c.last_paid_at)) : 'Never';
                const neverPaid = !c.last_paid_at;

                return (
                  <tr key={c.id || i} style={{ borderBottom: '1px solid #111', background: amtOwed > 30000 ? 'rgba(166,10,8,0.05)' : 'transparent' }}>
                    <td style={{ padding: '9px 10px', color: '#f5f5f8', fontWeight: 600, whiteSpace: 'nowrap' }}>{c.full_name}</td>
                    <td style={{ padding: '9px 10px', color: '#d3d3d3' }}>{planLabel[c.selected_plan] || c.selected_plan}</td>
                    <td style={{ padding: '9px 10px', whiteSpace: 'nowrap' }}>
                      <span style={{ color: '#f5f5f8' }}>{formatKES(rate)}</span>
                      {isDiscounted && (
                        <span style={{ color: '#555', fontSize: '11px', marginLeft: '4px' }}>
                          {c.custom_monthly_rate ? '(custom)' : `(${Number(c.discount_percent)}% off)`}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '9px 10px', color: '#d3d3d3', textAlign: 'center' }}>{c.months_enrolled ?? '—'}</td>
                    <td style={{ padding: '9px 10px', color: '#d3d3d3', textAlign: 'center' }}>{c.months_paid ?? 0}</td>
                    <td style={{ padding: '9px 10px', textAlign: 'center' }}>
                      <span style={{ background: '#450a0a', color: '#fca5a5', borderRadius: '4px', padding: '2px 7px', fontSize: '12px', fontWeight: 700 }}>
                        {c.months_owed}
                      </span>
                    </td>
                    <td style={{ padding: '9px 10px', color: '#a60a08', fontWeight: 700, whiteSpace: 'nowrap' }}>{formatKES(amtOwed)}</td>
                    <td style={{ padding: '9px 10px', color: neverPaid ? '#a60a08' : '#d3d3d3', whiteSpace: 'nowrap', fontSize: '12px' }}>{lastPaid}</td>
                    <td style={{ padding: '9px 10px' }}>
                      <span style={{
                        background: c.payment_status === 'overdue' ? '#450a0a' : c.payment_status === 'pending' ? '#1a2e1a' : '#1a1a1a',
                        color: c.payment_status === 'overdue' ? '#fca5a5' : c.payment_status === 'pending' ? '#86efac' : '#d3d3d3',
                        borderRadius: '4px', padding: '2px 7px', fontSize: '10px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
                      }}>
                        {c.payment_status || 'unknown'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* Totals */}
            <tfoot>
              <tr style={{ borderTop: '2px solid #333' }}>
                <td colSpan={6} style={{ padding: '9px 10px', color: '#555', fontFamily: 'Oswald, sans-serif', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Total ({filtered.length} client{filtered.length !== 1 ? 's' : ''})
                </td>
                <td style={{ padding: '9px 10px', color: '#a60a08', fontWeight: 700, whiteSpace: 'nowrap' }}>
                  {formatKES(filtered.reduce((s, c) => s + Number(c.amount_owed || 0), 0))}
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// RevenueView — all-payments ledger with KPI summary
// ─────────────────────────────────────────────────────────────

function RevenueView({ adminKey }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [period, setPeriod] = useState('month'); // 'week' | 'month' | 'year' | 'all'
  const [showImport, setShowImport] = useState(false);

  function exportLedgerCSV() {
    const rows = [
      ['Date', 'Client', 'Plan', 'Amount (KES)', 'Method', 'Rent Split (KES)', 'Net Revenue (KES)', 'Source', 'Notes'],
      ...filtered.map(p => [
        new Date(p.payment_date).toLocaleDateString('en-KE'),
        p.clients?.full_name || '',
        p.plan_id || '',
        Number(p.amount),
        paymentMethodLabel(p.payment_method),
        Number(p.rent_split),
        Number(p.net_revenue),
        p.source || '',
        p.notes || '',
      ]),
    ];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AMSC_payments_${period}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function fetchAll() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/payments', {
        headers: { Authorization: `Bearer ${adminKey}` },
      });
      const json = await res.json();
      if (res.ok) setPayments(json.payments || []);
    } catch (e) {
      console.error('RevenueView fetch error', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchAll(); }, [adminKey]);

  // ── Date helpers ─────────────────────────────────────────────────────────
  const now = new Date();

  function getWeekStart(d) {
    const day = d.getDay(); // 0=Sun
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Mon as start
    const s = new Date(d); s.setDate(diff); s.setHours(0,0,0,0); return s;
  }
  const weekStart = getWeekStart(now);
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 7);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const yearStart = new Date(now.getFullYear(), 0, 1);
  const yearEnd = new Date(now.getFullYear() + 1, 0, 1);

  function inRange(p, start, end) {
    const d = new Date(p.payment_date);
    return d >= start && d < end;
  }

  // ── Filter payments for current period ────────────────────────────────────
  const periodPayments = payments.filter(p => {
    if (period === 'week') return inRange(p, weekStart, weekEnd);
    if (period === 'month') return inRange(p, monthStart, monthEnd);
    if (period === 'year') return inRange(p, yearStart, yearEnd);
    return true; // all
  });

  // ── Totals for selected period ─────────────────────────────────────────────
  function sumPayments(arr) {
    return arr.reduce((a, p) => ({
      revenue: a.revenue + +p.amount,
      rent: a.rent + +p.rent_split,
      net: a.net + +p.net_revenue,
    }), { revenue: 0, rent: 0, net: 0 });
  }
  const periodTotals = sumPayments(periodPayments);

  // ── Breakdown table data ───────────────────────────────────────────────────
  function buildBreakdown() {
    if (period === 'week') {
      // Mon–Sun
      const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
      return days.map((label, i) => {
        const dayStart = new Date(weekStart); dayStart.setDate(weekStart.getDate() + i);
        const dayEnd = new Date(dayStart); dayEnd.setDate(dayStart.getDate() + 1);
        const rows = payments.filter(p => inRange(p, dayStart, dayEnd));
        const isToday = dayStart.toDateString() === now.toDateString();
        return { label: `${label} ${dayStart.getDate()}/${dayStart.getMonth()+1}`, ...sumPayments(rows), count: rows.length, current: isToday };
      });
    }
    if (period === 'month') {
      // Weeks of the current month
      const weeks = [];
      let weekNum = 1;
      let wStart = new Date(monthStart);
      // Align to Monday
      const dow = wStart.getDay();
      if (dow !== 1) wStart.setDate(wStart.getDate() - (dow === 0 ? 6 : dow - 1));
      while (wStart < monthEnd) {
        const wEnd = new Date(wStart); wEnd.setDate(wStart.getDate() + 7);
        const rows = payments.filter(p => {
          const d = new Date(p.payment_date);
          return d >= wStart && d < wEnd && d >= monthStart && d < monthEnd;
        });
        const isCurrent = now >= wStart && now < wEnd;
        weeks.push({ label: `Week ${weekNum}`, ...sumPayments(rows), count: rows.length, current: isCurrent });
        wStart = new Date(wEnd);
        weekNum++;
        if (weekNum > 6) break;
      }
      return weeks;
    }
    if (period === 'year') {
      // Jan–Dec of current year
      const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return monthNames.map((name, m) => {
        const mStart = new Date(now.getFullYear(), m, 1);
        const mEnd = new Date(now.getFullYear(), m + 1, 1);
        const rows = payments.filter(p => inRange(p, mStart, mEnd));
        const isCurrent = m === now.getMonth();
        return { label: name, ...sumPayments(rows), count: rows.length, current: isCurrent };
      });
    }
    if (period === 'all') {
      // Group by year — find min/max years in data
      if (payments.length === 0) return [];
      const years = [...new Set(payments.map(p => new Date(p.payment_date).getFullYear()))].sort();
      return years.map(yr => {
        const yStart = new Date(yr, 0, 1);
        const yEnd = new Date(yr + 1, 0, 1);
        const rows = payments.filter(p => inRange(p, yStart, yEnd));
        const isCurrent = yr === now.getFullYear();
        return { label: String(yr), ...sumPayments(rows), count: rows.length, current: isCurrent };
      });
    }
    return [];
  }
  const breakdown = buildBreakdown();

  // ── Filtered ledger ────────────────────────────────────────────────────────
  const filtered = periodPayments.filter(p =>
    !filter ||
    (p.clients?.full_name || '').toLowerCase().includes(filter.toLowerCase()) ||
    (p.payment_method || '').toLowerCase().includes(filter.toLowerCase())
  );

  // ── Period label for header ────────────────────────────────────────────────
  const periodLabel = { week: 'This Week', month: 'This Month', year: 'This Year', all: 'All Time' }[period];

  const tabStyle = (active) => ({
    background: 'transparent', border: 'none',
    color: active ? '#f5f5f8' : '#555',
    fontFamily: 'Oswald, sans-serif', fontWeight: 700, fontSize: '13px',
    letterSpacing: '0.08em', textTransform: 'uppercase',
    padding: '7px 14px 9px', cursor: 'pointer',
    borderBottom: active ? '2px solid #a60a08' : '2px solid transparent',
    marginBottom: '-1px', transition: 'color 0.15s',
  });

  return (
    <div>
      {/* Import modal */}
      {showImport && (
        <ImportPaymentsModal
          adminKey={adminKey}
          onClose={() => setShowImport(false)}
          onImported={() => { setShowImport(false); fetchAll(); }}
        />
      )}

      {/* Header row: period tabs + Import button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid #222', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '2px' }}>
          {[['week','Week'],['month','Month'],['year','Year'],['all','All Time']].map(([key, label]) => (
            <button key={key} onClick={() => setPeriod(key)} style={tabStyle(period === key)}>{label}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
          <button
            onClick={exportLedgerCSV}
            disabled={filtered.length === 0}
            style={{ background: 'transparent', border: '1px solid #333', color: '#d3d3d3', borderRadius: '6px', padding: '5px 14px', fontSize: '12px', fontWeight: 600, cursor: filtered.length === 0 ? 'not-allowed' : 'pointer', opacity: filtered.length === 0 ? 0.4 : 1, letterSpacing: '0.05em' }}
          >
            ↓ Export CSV
          </button>
          <button
            onClick={() => setShowImport(true)}
            style={{ background: 'transparent', border: '1px solid #333', color: '#d3d3d3', borderRadius: '6px', padding: '5px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', letterSpacing: '0.05em' }}
          >
            ↑ Import Records
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px' }}>
        {[
          { label: `${periodLabel} — Revenue`, value: formatKES(periodTotals.revenue), sub: `${periodPayments.length} payment${periodPayments.length !== 1 ? 's' : ''}` },
          { label: `${periodLabel} — Rent`, value: formatKES(periodTotals.rent), sub: 'Facility split (40%)' },
          { label: `${periodLabel} — Net`, value: formatKES(periodTotals.net), sub: 'After rent split', green: true },
          { label: 'All Time — Net', value: formatKES(sumPayments(payments).net), sub: `${payments.length} total payments`, dim: true },
        ].map(k => (
          <div key={k.label} style={{ background: k.dim ? '#111' : '#1a1a1a', border: '1px solid #222', borderRadius: '8px', padding: '14px' }}>
            <p style={{ fontFamily: 'Oswald, sans-serif', fontWeight: 700, fontSize: '10px', letterSpacing: '0.1em', color: '#555', textTransform: 'uppercase', margin: '0 0 5px 0' }}>{k.label}</p>
            <p style={{ fontSize: k.dim ? '16px' : '20px', fontWeight: 700, color: k.green ? '#22c55e' : '#f5f5f8', margin: '0 0 2px 0' }}>{k.value}</p>
            <p style={{ fontSize: '11px', color: '#555', margin: 0 }}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Period breakdown table */}
      {breakdown.length > 0 && (
        <div style={{ marginBottom: '24px', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #222' }}>
                {['Period', 'Revenue', 'Rent Split', 'Net Revenue', 'Payments'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '6px 10px', color: '#555', fontFamily: 'Oswald, sans-serif', fontWeight: 700, fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {breakdown.map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #111', background: row.current ? 'rgba(166,10,8,0.07)' : 'transparent' }}>
                  <td style={{ padding: '7px 10px', color: row.current ? '#f5f5f8' : (row.count === 0 ? '#333' : '#d3d3d3'), fontWeight: row.current ? 700 : 400, whiteSpace: 'nowrap' }}>
                    {row.label}
                    {row.current && <span style={{ color: '#a60a08', fontSize: '10px', marginLeft: '6px', fontFamily: 'Oswald, sans-serif', letterSpacing: '0.08em' }}>NOW</span>}
                  </td>
                  <td style={{ padding: '7px 10px', color: row.count === 0 ? '#333' : '#f5f5f8', fontWeight: row.count > 0 ? 600 : 400 }}>{row.revenue > 0 ? formatKES(row.revenue) : '—'}</td>
                  <td style={{ padding: '7px 10px', color: row.rent > 0 ? '#fbbf24' : '#333' }}>{row.rent > 0 ? formatKES(row.rent) : '—'}</td>
                  <td style={{ padding: '7px 10px', color: row.net > 0 ? '#22c55e' : '#333', fontWeight: row.count > 0 ? 600 : 400 }}>{row.net > 0 ? formatKES(row.net) : '—'}</td>
                  <td style={{ padding: '7px 10px', color: row.count === 0 ? '#333' : '#d3d3d3', textAlign: 'center' }}>{row.count || '—'}</td>
                </tr>
              ))}
            </tbody>
            {/* Totals row */}
            <tfoot>
              <tr style={{ borderTop: '2px solid #333' }}>
                <td style={{ padding: '8px 10px', color: '#555', fontFamily: 'Oswald, sans-serif', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total</td>
                <td style={{ padding: '8px 10px', color: '#f5f5f8', fontWeight: 700 }}>{formatKES(periodTotals.revenue)}</td>
                <td style={{ padding: '8px 10px', color: '#fbbf24', fontWeight: 600 }}>{periodTotals.rent > 0 ? formatKES(periodTotals.rent) : '—'}</td>
                <td style={{ padding: '8px 10px', color: '#22c55e', fontWeight: 700 }}>{formatKES(periodTotals.net)}</td>
                <td style={{ padding: '8px 10px', color: '#d3d3d3', textAlign: 'center' }}>{periodPayments.length}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Ledger section header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <p style={{ fontFamily: 'Oswald, sans-serif', fontWeight: 700, fontSize: '12px', letterSpacing: '0.1em', color: '#555', textTransform: 'uppercase', margin: 0 }}>
          {periodLabel} Transactions
        </p>
        <input
          type="text"
          placeholder="Filter by client or method…"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '6px', padding: '6px 12px', color: '#f5f5f8', fontSize: '13px', width: '220px' }}
        />
      </div>

      {/* Transaction ledger */}
      {loading ? (
        <p style={{ color: '#555', fontSize: '13px' }}>Loading transactions…</p>
      ) : filtered.length === 0 ? (
        <p style={{ color: '#555', fontSize: '13px', fontStyle: 'italic' }}>No transactions for this period.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #222' }}>
                {['Date', 'Client', 'Plan', 'Amount', 'Method', 'Rent Split', 'Net Revenue', 'Source', 'Notes'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 10px', color: '#555', fontFamily: 'Oswald, sans-serif', fontWeight: 700, fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid #111' }}>
                  <td style={{ padding: '8px 10px', color: '#f5f5f8', whiteSpace: 'nowrap' }}>{formatDate(new Date(p.payment_date))}</td>
                  <td style={{ padding: '8px 10px', color: '#f5f5f8', whiteSpace: 'nowrap' }}>{p.clients?.full_name || '—'}</td>
                  <td style={{ padding: '8px 10px', color: '#d3d3d3' }}>{p.plan_id || '—'}</td>
                  <td style={{ padding: '8px 10px', color: '#f5f5f8', fontWeight: 600, whiteSpace: 'nowrap' }}>{formatKES(p.amount)}</td>
                  <td style={{ padding: '8px 10px', color: '#d3d3d3', whiteSpace: 'nowrap' }}>{paymentMethodLabel(p.payment_method)}</td>
                  <td style={{ padding: '8px 10px', color: p.rent_split > 0 ? '#fbbf24' : '#555', whiteSpace: 'nowrap' }}>{p.rent_split > 0 ? formatKES(p.rent_split) : '—'}</td>
                  <td style={{ padding: '8px 10px', color: '#22c55e', fontWeight: 600, whiteSpace: 'nowrap' }}>{formatKES(p.net_revenue)}</td>
                  <td style={{ padding: '8px 10px' }}>
                    <span style={{
                      background: p.source === 'webhook' ? '#1e3a5f' : p.source === 'import' ? '#2d1f4e' : '#1a2e1a',
                      color: p.source === 'webhook' ? '#93c5fd' : p.source === 'import' ? '#c4b5fd' : '#86efac',
                      borderRadius: '4px', padding: '2px 6px', fontSize: '10px', fontWeight: 600, letterSpacing: '0.05em',
                    }}>
                      {p.source === 'webhook' ? 'AUTO' : p.source === 'import' ? 'IMPORT' : 'MANUAL'}
                    </span>
                  </td>
                  <td style={{ padding: '8px 10px', color: '#555', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// AdminPage — root component
// ─────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('pending_review');
  const [activeSection, setActiveSection] = useState('applications');
  const [activeTab, setActiveTab] = useState('applications');
  const [selectedClient, setSelectedClient] = useState(null);
  const [showAddClient, setShowAddClient] = useState(false);

  // Upload state
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadDate, setUploadDate] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [uploadAthleteErrors, setUploadAthleteErrors] = useState([]);

  function handleLogin(password) {
    if (!password.trim()) { setLoginError('Please enter a password.'); return; }
    setAdminKey(password);
    setAuthenticated(true);
    setLoginError('');
  }

  async function fetchClients() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/clients?status=${filter}`, {
        headers: { Authorization: `Bearer ${adminKey}` },
      });
      if (res.status === 401) {
        setAuthenticated(false);
        setLoginError('Invalid password. Please try again.');
        return;
      }
      const data = await res.json();
      if (res.ok) setClients(data.clients || []);
    } catch {
      console.error('Failed to fetch clients');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(e) {
    e.preventDefault();
    if (!uploadFile || !uploadDate) return;
    setUploading(true);
    setUploadResult(null);
    setUploadError('');
    setUploadAthleteErrors([]);
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(uploadFile);
      });
      const res = await fetch('/api/admin/upload-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminKey}` },
        body: JSON.stringify({ file: base64, filename: uploadFile.name, eventDate: uploadDate }),
      });
      const data = await res.json();
      if (!res.ok) {
        setUploadError(data.error || 'Upload failed.');
        setUploadAthleteErrors(data.errors || []);
        return;
      }
      setUploadResult(data);
      setUploadFile(null);
      const fileInput = document.getElementById('excel-upload');
      if (fileInput) fileInput.value = '';
    } catch {
      setUploadError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  function downloadAccessCodes(results) {
    const csv = [
      'Athlete Name,Access Code,Sport,Acceleration,Max Velocity,Power',
      ...results.map(r =>
        `"${r.athlete_name}",${r.access_code},"${r.sport || ''}","${r.acceleration_category || ''}","${r.max_velocity_category || ''}","${r.power_category || ''}"`
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `AMSC_access_codes_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  useEffect(() => {
    if (authenticated) fetchClients();
  }, [authenticated, filter]);

  if (!authenticated) {
    return <LoginScreen onLogin={handleLogin} error={loginError} />;
  }

  const filterOptions = [
    { value: 'pending_review', label: 'Pending Review' },
    { value: 'approved', label: 'Approved' },
    { value: 'declined', label: 'Declined' },
    { value: 'all', label: 'All' },
  ];

  return (
    <section className="py-8 px-4 sm:px-6 bg-background min-h-screen pt-20">
      <div className="max-w-3xl mx-auto">

        {/* ── Detail view ── */}
        {selectedClient && (
          <ClientDetailView
            client={selectedClient}
            adminKey={adminKey}
            onBack={() => setSelectedClient(null)}
            onUpdate={fetchClients}
          />
        )}

        {/* ── List view ── */}
        {!selectedClient && (
          <>
            {/* Modal */}
            {showAddClient && (
              <AddClientModal
                adminKey={adminKey}
                onClose={() => setShowAddClient(false)}
                onCreated={() => fetchClients()}
              />
            )}

            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="font-display font-black text-2xl tracking-widest">AMSC ADMIN</h1>
                <p className="text-secondary font-body text-sm mt-1">Manage clients, applications and revenue.</p>
              </div>
              <button
                onClick={fetchClients}
                className="bg-surface-light border border-white/10 text-white px-4 py-2 rounded-lg font-display text-xs font-bold tracking-wider uppercase hover:border-white/20 transition-colors cursor-pointer"
              >
                Refresh
              </button>
            </div>

            {/* Top-level tab switcher: Applications | Revenue */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px', borderBottom: '1px solid #222', paddingBottom: '0' }}>
              <div style={{ display: 'flex', gap: '4px' }}>
                {[['applications', 'Applications'], ['revenue', 'Revenue'], ['arrears', 'Arrears']].map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: activeTab === key ? '#f5f5f8' : '#555',
                      fontFamily: 'Oswald, sans-serif',
                      fontWeight: 700,
                      fontSize: '14px',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      padding: '8px 16px 10px',
                      cursor: 'pointer',
                      borderBottom: activeTab === key ? '2px solid #a60a08' : '2px solid transparent',
                      marginBottom: '-1px',
                      transition: 'color 0.15s',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowAddClient(true)}
                style={{ background: '#a60a08', color: '#f5f5f8', border: 'none', borderRadius: '6px', padding: '7px 16px', fontSize: '12px', fontWeight: 700, letterSpacing: '0.06em', cursor: 'pointer', marginBottom: '4px' }}
              >
                + Add Client
              </button>
            </div>

            {/* Revenue tab */}
            {activeTab === 'revenue' && (
              <RevenueView adminKey={adminKey} />
            )}

            {/* Arrears tab */}
            {activeTab === 'arrears' && (
              <ArrearsView adminKey={adminKey} />
            )}

            {/* Applications tab */}
            {activeTab === 'applications' && (
              <>
            {/* Section tabs */}
            <div className="flex gap-1 mb-8 bg-surface border border-white/5 rounded-full p-1 w-fit">
              <button
                onClick={() => setActiveSection('applications')}
                className={`px-5 py-2 rounded-full text-sm font-display font-semibold tracking-wider transition-all duration-200 ${
                  activeSection === 'applications' ? 'bg-accent text-white' : 'text-secondary hover:text-white'
                }`}
              >
                Applications
              </button>
              <button
                onClick={() => setActiveSection('upload')}
                className={`px-5 py-2 rounded-full text-sm font-display font-semibold tracking-wider transition-all duration-200 ${
                  activeSection === 'upload' ? 'bg-accent text-white' : 'text-secondary hover:text-white'
                }`}
              >
                Upload Results
              </button>
            </div>

            {/* ── Applications section ── */}
            {activeSection === 'applications' && (
              <div>
                <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                  {filterOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setFilter(opt.value)}
                      className={`px-4 py-2 rounded-full font-display text-xs font-bold tracking-wider uppercase transition-all cursor-pointer whitespace-nowrap ${
                        filter === opt.value
                          ? 'bg-accent text-white'
                          : 'bg-surface-light text-secondary border border-white/5 hover:border-white/20'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {loading ? (
                  <div className="text-center py-12">
                    <span className="inline-block w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="text-secondary font-body text-sm">Loading applications...</p>
                  </div>
                ) : clients.length === 0 ? (
                  <div className="text-center py-12 bg-surface border border-white/5 rounded-xl">
                    <p className="text-secondary font-body text-sm">
                      No {filter === 'all' ? '' : filter.replace('_', ' ')} applications found.
                    </p>
                  </div>
                ) : (
                  clients.map((client) => (
                    <ApplicationCard
                      key={client.id}
                      client={client}
                      adminKey={adminKey}
                      onUpdate={fetchClients}
                      onClick={() => setSelectedClient(client)}
                    />
                  ))
                )}
              </div>
            )}

            {/* ── Upload section ── */}
            {activeSection === 'upload' && (
              <div>
                <div className="flex items-center justify-between bg-surface border border-white/5 rounded-lg px-5 py-4 mb-4">
                  <div>
                    <p className="font-display font-semibold text-sm tracking-wider text-white">AMSC Combine Data Template</p>
                    <p className="text-secondary font-body text-xs mt-0.5">Fill this in after every session, then upload below.</p>
                  </div>
                  <a
                    href="/AMSC_Combine_Data_Template.xlsx"
                    download
                    className="flex items-center gap-2 bg-accent text-white font-display font-bold text-xs tracking-wider uppercase px-4 py-2 rounded-full hover:bg-accent-dark transition-all whitespace-nowrap"
                  >
                    ↓ Download Template
                  </a>
                </div>

                <form onSubmit={handleUpload} className="bg-surface border border-white/5 rounded-lg p-6 mb-6">
                  <h2 className="font-display font-bold text-lg tracking-wider mb-6">UPLOAD COMBINE RESULTS</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-display font-semibold tracking-wider text-secondary mb-2">SESSION DATE</label>
                      <input
                        type="date"
                        value={uploadDate}
                        onChange={e => setUploadDate(e.target.value)}
                        required
                        className="w-full bg-background border border-white/10 rounded-lg px-4 py-3 text-text font-body text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-display font-semibold tracking-wider text-secondary mb-2">EXCEL FILE (.xlsx)</label>
                      <input
                        id="excel-upload"
                        type="file"
                        accept=".xlsx"
                        onChange={e => setUploadFile(e.target.files[0] || null)}
                        required
                        className="w-full bg-background border border-white/10 rounded-lg px-4 py-3 text-text font-body text-sm focus:outline-none focus:border-accent transition-all file:mr-3 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-accent/20 file:text-accent hover:file:bg-accent/30"
                      />
                    </div>
                  </div>
                  {uploadFile && (
                    <p className="text-secondary text-xs font-body mb-4">{uploadFile.name} — {(uploadFile.size / 1024).toFixed(0)} KB</p>
                  )}
                  <button
                    type="submit"
                    disabled={uploading || !uploadFile || !uploadDate}
                    className="w-full bg-accent text-white py-3 rounded-full font-display font-bold text-sm tracking-wider uppercase hover:bg-accent-dark transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploading ? 'Processing…' : 'Process & Upload'}
                  </button>
                  {uploading && (
                    <p className="text-secondary text-xs font-body text-center mt-3">
                      Running engine — this may take 10–30 seconds on first run…
                    </p>
                  )}
                </form>

                {uploadError && (
                  <div className="bg-red-900/20 border border-red-500/20 rounded-lg px-4 py-3 mb-6">
                    <p className="text-red-400 text-sm font-body font-semibold">{uploadError}</p>
                    {uploadAthleteErrors.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {uploadAthleteErrors.map((e, i) => (
                          <li key={i} className="text-red-300 text-xs font-body">
                            <span className="font-semibold">{e.name}:</span> {e.error}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {uploadResult && (
                  <div className="bg-surface border border-white/5 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-display font-bold text-lg tracking-wider">
                          {uploadResult.inserted} athlete{uploadResult.inserted !== 1 ? 's' : ''} uploaded
                        </h3>
                        {uploadResult.errors?.length > 0 && (
                          <p className="text-yellow-400 text-xs font-body mt-1">
                            {uploadResult.errors.length} athlete(s) had errors and were skipped
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => downloadAccessCodes(uploadResult.results)}
                        className="bg-accent/10 border border-accent/30 text-accent px-4 py-2 rounded-lg font-display font-bold text-xs tracking-wider uppercase hover:bg-accent hover:text-white transition-all duration-200"
                      >
                        Download Access Codes CSV
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm font-body">
                        <thead>
                          <tr className="border-b border-white/10">
                            <th className="text-left text-xs font-display tracking-wider text-secondary py-2 pr-4">ATHLETE</th>
                            <th className="text-left text-xs font-display tracking-wider text-secondary py-2 pr-4">ACCESS CODE</th>
                            <th className="text-left text-xs font-display tracking-wider text-secondary py-2 pr-4">ACCEL</th>
                            <th className="text-left text-xs font-display tracking-wider text-secondary py-2 pr-4">MAX V</th>
                            <th className="text-left text-xs font-display tracking-wider text-secondary py-2">POWER</th>
                          </tr>
                        </thead>
                        <tbody>
                          {uploadResult.results.map((r) => (
                            <tr key={r.id} className="border-b border-white/5">
                              <td className="py-2 pr-4 text-text">{r.athlete_name}</td>
                              <td className="py-2 pr-4">
                                <span className="font-mono text-accent text-xs bg-accent/10 px-2 py-1 rounded">{r.access_code}</span>
                              </td>
                              <td className={`py-2 pr-4 text-xs ${r.acceleration_category === 'Advanced' ? 'text-green-400' : r.acceleration_category === 'Competitive' ? 'text-yellow-400' : 'text-red-400'}`}>
                                {r.acceleration_category || '—'}
                              </td>
                              <td className={`py-2 pr-4 text-xs ${r.max_velocity_category === 'Advanced' ? 'text-green-400' : r.max_velocity_category === 'Competitive' ? 'text-yellow-400' : 'text-red-400'}`}>
                                {r.max_velocity_category || '—'}
                              </td>
                              <td className={`py-2 text-xs ${r.power_category === 'Advanced' ? 'text-green-400' : r.power_category === 'Competitive' ? 'text-yellow-400' : 'text-red-400'}`}>
                                {r.power_category || '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {uploadResult.warnings?.length > 0 && (
                      <details className="mt-4">
                        <summary className="text-yellow-400/70 text-xs font-body cursor-pointer hover:text-yellow-400">
                          {uploadResult.warnings.length} data warning(s)
                        </summary>
                        <ul className="mt-2 space-y-1">
                          {uploadResult.warnings.map((w, i) => (
                            <li key={i} className="text-yellow-400/60 text-xs font-body">• {w}</li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                )}
              </div>
            )}
            </>
            )}
          </>
        )}
      </div>
    </section>
  );
}
