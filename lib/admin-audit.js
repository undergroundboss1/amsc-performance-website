import { getAuditSupabase } from './supabase';

/**
 * Human-readable labels for machine action codes — so the admin audit log
 * (components/admin/AuditLogView.js) and the per-record "Last updated by…"
 * line read in plain English instead of a raw action string. Add a new
 * action here whenever a route starts calling logAdminAction() with a new
 * code — an unmapped code still displays (falls back to the raw string),
 * it just won't read as nicely until labeled.
 */
export const ACTION_LABELS = {
  'camp.mark_paid': 'Marked paid',
  'camp.promote_waitlist': 'Promoted from waitlist',
  'camp.cancel_registration': 'Cancelled registration',
  'camp.attach_report_card': 'Attached combine report card',
  'client.approve': 'Approved application',
  'client.decline': 'Declined application',
  'client.update_client': 'Updated client details',
  'client.change_plan': 'Changed plan',
  'client.transition_online': 'Moved to online payments',
  'client.add_payment': 'Added payment',
  'client.update_payment': 'Updated payment',
  'client.delete_payment': 'Deleted payment',
  'client.create_client': 'Created client',
  'client.import_payments': 'Imported payments',
  'client.mark_attendance': 'Marked attendance',
  'client.clear_attendance': 'Cleared attendance',
  'client.upload_results': 'Uploaded combine results',
};

export function actionLabel(action) {
  return ACTION_LABELS[action] || action;
}

/**
 * Record an admin write action.
 *
 * Best-effort — never blocks or fails the calling route if the log insert
 * itself fails. Matches the existing non-fatal pattern already used for
 * receipt/onboarding emails in the Paystack webhook
 * (app/api/webhooks/paystack/route.js) — logging failing is not a reason
 * to fail the admin action the user is actually waiting on.
 *
 * @param {object} opts
 * @param {'arnold'|'khivali'|'jenny'} opts.actor
 * @param {string} opts.action - e.g. 'camp.mark_paid'
 * @param {'camp'|'client'} opts.domain
 * @param {string} [opts.resourceId] - the row this action affected
 * @param {object} [opts.detail] - free-form context, e.g. { from_status, to_status }
 */
export async function logAdminAction({ actor, action, domain, resourceId, detail }) {
  try {
    const auditSupabase = getAuditSupabase();
    const { error } = await auditSupabase.from('admin_actions').insert({
      actor,
      action,
      domain,
      resource_id: resourceId || null,
      detail: detail || null,
    });
    if (error) console.error('logAdminAction: insert error (non-fatal):', error);
  } catch (err) {
    console.error('logAdminAction: error (non-fatal):', err);
  }
}
