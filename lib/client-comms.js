/**
 * The shared vocabulary for client communication tracking.
 *
 * These five statuses are the same five labels the conversations carry in
 * WhatsApp Business, deliberately — Khivali works the chat and the admin
 * queue side by side, and a conversation should not be called two different
 * things depending on which screen she is looking at.
 *
 * A client with no status is not in the queue at all. Only a conversation
 * someone is actually working gets one.
 */

export const COMMS_STATUSES = [
  'new_lead',
  'payment_follow_up',
  'feedback',
  'escalated',
  'resolved',
];

export const COMMS_STATUS_LABELS = {
  new_lead: 'New Lead',
  payment_follow_up: 'Payment Follow-up',
  feedback: 'Feedback',
  escalated: 'Escalate — Arnold',
  resolved: 'Resolved',
};

/**
 * The two situations Khivali hands a conversation to Arnold on — a training
 * question she should not be answering, and anything contested about money —
 * plus a catch-all for the judgement calls that fit neither.
 */
export const ESCALATION_REASONS = ['technical_question', 'payment_dispute', 'other'];

export const ESCALATION_REASON_LABELS = {
  technical_question: 'Technical question',
  payment_dispute: 'Payment dispute',
  other: 'Other',
};

export const ACTOR_LABELS = { arnold: 'Arnold', khivali: 'Khivali', jenny: 'Jenny' };

/** Badge colours per status — one dominant red, reserved for escalations. */
export const COMMS_STATUS_COLORS = {
  new_lead: { bg: '#1a1a2e', fg: '#93c5fd' },
  payment_follow_up: { bg: '#2e2410', fg: '#fbbf24' },
  feedback: { bg: '#1a2e1a', fg: '#86efac' },
  escalated: { bg: '#450a0a', fg: '#fca5a5' },
  resolved: { bg: '#1a1a1a', fg: '#555555' },
};

/**
 * Queue order: escalations first (they are blocking someone), then whichever
 * conversation has gone longest without being touched. A conversation nobody
 * has answered in four days outranks one answered this morning.
 */
export function sortFollowUps(clients) {
  return [...clients].sort((a, b) => {
    const aEsc = a.comms_status === 'escalated';
    const bEsc = b.comms_status === 'escalated';
    if (aEsc !== bEsc) return aEsc ? -1 : 1;

    const aResolved = a.comms_status === 'resolved';
    const bResolved = b.comms_status === 'resolved';
    if (aResolved !== bResolved) return aResolved ? 1 : -1;

    const aTime = a.comms_updated_at ? new Date(a.comms_updated_at).getTime() : 0;
    const bTime = b.comms_updated_at ? new Date(b.comms_updated_at).getTime() : 0;
    return aTime - bTime;
  });
}

/** "3 days ago" / "Today" — how long a conversation has been sitting. */
export function timeAgo(iso) {
  if (!iso) return 'Never';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

/**
 * A wa.me link for the client's phone, so the queue is one tap from the
 * conversation it is tracking. Kenyan numbers get stored in a few shapes
 * (0712…, +254712…, 254712…, and sometimes bare 712…) — normalise to the
 * full international digits wa.me expects.
 *
 * Anything that doesn't resolve to a plausible international number returns
 * null and the button is simply not shown. A missing button is recoverable;
 * a button that opens a chat with a stranger is not.
 */
export function whatsappLink(phone) {
  if (!phone) return null;
  let digits = String(phone).replace(/[^\d]/g, '');

  if (digits.startsWith('0')) {
    // Local Kenyan form: 0712345678
    digits = `254${digits.slice(1)}`;
  } else if (digits.length === 9 && /^(7|11)/.test(digits)) {
    // National form with the trunk 0 already stripped: 712345678 / 110123456.
    // Kenyan mobile prefixes are 07xx and 011x, so those are the only two
    // shapes a bare 9-digit number can safely be assumed to be.
    digits = `254${digits}`;
  }

  // Shortest real international numbers are ~10 digits including country code.
  // Not all AMSC clients are in Kenya, so anything already long enough is
  // taken as-is rather than forced onto +254.
  if (digits.length < 10 || digits.length > 15) return null;
  return `https://wa.me/${digits}`;
}
