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

  // Payment history state
  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [addPaymentForm, setAddPaymentForm] = useState({
    amount: '',
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
        setAddPaymentForm({ amount: '', paymentDate: new Date().toISOString().split('T')[0], paymentMethod: 'manual_cash', monthsCovered: '1', notes: '' });
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
        <div className="border-t border-white/5 pt-4">
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
// RevenueView — all-payments ledger with KPI summary
// ─────────────────────────────────────────────────────────────

function RevenueView({ adminKey }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
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
    fetchAll();
  }, [adminKey]);

  const filtered = filter
    ? payments.filter(p =>
        (p.clients?.full_name || '').toLowerCase().includes(filter.toLowerCase()) ||
        (p.payment_method || '').toLowerCase().includes(filter.toLowerCase())
      )
    : payments;

  // Summary KPIs
  const now = new Date();
  const thisMonthPayments = payments.filter(p => {
    const d = new Date(p.payment_date);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });

  const totalsAll = payments.reduce((a, p) => ({ revenue: a.revenue + +p.amount, rent: a.rent + +p.rent_split, net: a.net + +p.net_revenue }), { revenue: 0, rent: 0, net: 0 });
  const totalsMonth = thisMonthPayments.reduce((a, p) => ({ revenue: a.revenue + +p.amount, rent: a.rent + +p.rent_split, net: a.net + +p.net_revenue }), { revenue: 0, rent: 0, net: 0 });

  return (
    <div>
      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'This Month — Revenue', value: formatKES(totalsMonth.revenue), sub: `${thisMonthPayments.length} payment${thisMonthPayments.length !== 1 ? 's' : ''}` },
          { label: 'This Month — Rent', value: formatKES(totalsMonth.rent), sub: 'Facility split (40%)' },
          { label: 'This Month — Net', value: formatKES(totalsMonth.net), sub: 'After rent split', green: true },
        ].map(k => (
          <div key={k.label} style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: '8px', padding: '16px' }}>
            <p style={{ fontFamily: 'Oswald, sans-serif', fontWeight: 700, fontSize: '10px', letterSpacing: '0.12em', color: '#555', textTransform: 'uppercase', marginBottom: '6px', margin: '0 0 6px 0' }}>{k.label}</p>
            <p style={{ fontSize: '22px', fontWeight: 700, color: k.green ? '#22c55e' : '#f5f5f8', margin: '0 0 2px 0' }}>{k.value}</p>
            <p style={{ fontSize: '11px', color: '#555', margin: 0 }}>{k.sub}</p>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'All Time — Revenue', value: formatKES(totalsAll.revenue) },
          { label: 'All Time — Rent', value: formatKES(totalsAll.rent) },
          { label: 'All Time — Net', value: formatKES(totalsAll.net), green: true },
        ].map(k => (
          <div key={k.label} style={{ background: '#111', border: '1px solid #222', borderRadius: '8px', padding: '12px 16px' }}>
            <p style={{ fontFamily: 'Oswald, sans-serif', fontWeight: 700, fontSize: '10px', letterSpacing: '0.12em', color: '#555', textTransform: 'uppercase', marginBottom: '4px', margin: '0 0 4px 0' }}>{k.label}</p>
            <p style={{ fontSize: '18px', fontWeight: 700, color: k.green ? '#22c55e' : '#f5f5f8', margin: 0 }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Search / filter */}
      <div style={{ marginBottom: '16px' }}>
        <input
          type="text"
          placeholder="Filter by client or method…"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '6px', padding: '8px 14px', color: '#f5f5f8', fontSize: '14px', width: '100%', boxSizing: 'border-box' }}
        />
      </div>

      {/* Transaction ledger */}
      {loading ? (
        <p style={{ color: '#555', fontSize: '13px' }}>Loading transactions…</p>
      ) : filtered.length === 0 ? (
        <p style={{ color: '#555', fontSize: '13px', fontStyle: 'italic' }}>No transactions found.</p>
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
                    <span style={{ background: p.source === 'webhook' ? '#1e3a5f' : '#1a2e1a', color: p.source === 'webhook' ? '#93c5fd' : '#86efac', borderRadius: '4px', padding: '2px 6px', fontSize: '10px', fontWeight: 600, letterSpacing: '0.05em' }}>
                      {p.source === 'webhook' ? 'AUTO' : 'MANUAL'}
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
            <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', borderBottom: '1px solid #222', paddingBottom: '0' }}>
              {[['applications', 'Applications'], ['revenue', 'Revenue']].map(([key, label]) => (
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

            {/* Revenue tab */}
            {activeTab === 'revenue' && (
              <RevenueView adminKey={adminKey} />
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
