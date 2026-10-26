import { getKochaSupabase } from '../supabase';

/**
 * Record a Kocha admin write action in kocha.admin_actions.
 *
 * The same best-effort pattern as logAdminAction() in lib/admin-audit.js —
 * a failed log line never fails the admin action it describes. Kocha keeps
 * its own table so the existing audit.admin_actions (and its domain CHECK)
 * did not need to change.
 *
 * @param {object} opts
 * @param {'arnold'|'khivali'|'jenny'} opts.actor
 * @param {string} opts.action - e.g. 'kocha.scholar_create'
 * @param {string} [opts.resourceId]
 * @param {object} [opts.detail] - never include access tokens or links
 */
export async function logKochaAction({ actor, action, resourceId, detail }) {
  try {
    const { error } = await getKochaSupabase().from('admin_actions').insert({
      actor,
      action,
      resource_id: resourceId || null,
      detail: detail || null,
    });
    if (error) console.error('logKochaAction: insert error (non-fatal):', error);
  } catch (err) {
    console.error('logKochaAction: error (non-fatal):', err);
  }
}
