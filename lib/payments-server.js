/**
 * lib/payments-server.js — server-side payment helpers.
 *
 * Server-only (uses a Supabase service-role client). Do not import from client
 * components.
 */

/**
 * Re-sync a client's last_paid_at to the most recent remaining payment.
 *
 * Call this after editing or deleting a payment so the billing clock stays
 * accurate. Sets clients.last_paid_at to MAX(payment_date) of the client's
 * remaining payments, or null if none remain. Whenever last_paid_at changes,
 * reminders_sent is reset so the next billing cycle gets fresh reminders.
 *
 * @param {object} supabase - service-role Supabase client
 * @param {string} clientId
 * @returns {Promise<{ lastPaidAt: string|null }>}
 */
export async function resyncLastPaidAt(supabase, clientId) {
  const { data: rows, error } = await supabase
    .from('payments')
    .select('payment_date')
    .eq('client_id', clientId)
    .order('payment_date', { ascending: false })
    .limit(1);

  if (error) throw new Error(`resyncLastPaidAt: ${error.message}`);

  const lastPaidAt = rows && rows.length > 0 ? rows[0].payment_date : null;

  await supabase
    .from('clients')
    .update({ last_paid_at: lastPaidAt, reminders_sent: {} })
    .eq('id', clientId);

  return { lastPaidAt };
}
