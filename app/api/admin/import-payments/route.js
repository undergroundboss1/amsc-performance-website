import { NextResponse } from 'next/server';
import { getSupabase } from '../../../../lib/supabase';
import { trainingPlans } from '../../../../lib/plans';

/**
 * POST /api/admin/import-payments
 *
 * Bulk-imports historical payment records from a parsed CSV.
 * Each row can match an existing client (by name) or trigger auto-creation
 * of a new minimal client record.
 *
 * Body: { rows: Array<ImportRow> }  (max 500 rows)
 *
 * ImportRow:
 *   clientName   {string}  — required, matched case-insensitively to clients.full_name
 *   paymentDate  {string}  — required, ISO (YYYY-MM-DD) or DD/MM/YYYY
 *   amount       {number}  — required, positive KES amount
 *   plan         {string}  — optional, mapped to plan ID; fallback to 'group'
 *   notes        {string}  — optional
 *
 * Plan name mapping:
 *   "Tier 1" / "one-on-one" / "1-on-1"  → one-on-one (30,000)
 *   "Tier 2" / "group" / "performance"  → group (15,000)
 *   "Tier 3" / "youth"                  → youth (10,000)
 *   "Online"                            → online (12,000)
 *   anything else / missing             → group (default)
 *
 * Returns: { imported, clientsCreated, errors: [{ row, reason }] }
 */

const PLAN_MAP = {
  'tier 1': 'one-on-one',
  'tier1': 'one-on-one',
  'one-on-one': 'one-on-one',
  '1-on-1': 'one-on-one',
  'one on one': 'one-on-one',
  'tier 2': 'group',
  'tier2': 'group',
  'group': 'group',
  'performance group': 'group',
  'performance': 'group',
  'tier 3': 'youth',
  'tier3': 'youth',
  'youth': 'youth',
  'youth athletic': 'youth',
  'online': 'online',
  'online performance': 'online',
  'online training': 'online',
};

function mapPlan(rawPlan) {
  if (!rawPlan) return 'group';
  const key = String(rawPlan).trim().toLowerCase();
  return PLAN_MAP[key] || 'group';
}

function parseDate(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  // Try YYYY-MM-DD first
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }
  // Try DD/MM/YYYY
  const dmyMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dmyMatch) {
    const d = new Date(`${dmyMatch[3]}-${dmyMatch[2].padStart(2, '0')}-${dmyMatch[1].padStart(2, '0')}`);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }
  // Try MM/DD/YYYY
  const mdyMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (mdyMatch) {
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }
  // Fallback — let JS try
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

export async function POST(request) {
  // ── Auth ───────────────────────────────────────────────────────────────────
  const authHeader = request.headers.get('authorization');
  if (!authHeader || authHeader !== `Bearer ${process.env.ADMIN_SECRET_KEY}`) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { rows } = body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'rows array is required and must not be empty.' }, { status: 400 });
    }
    if (rows.length > 500) {
      return NextResponse.json({ error: 'Maximum 500 rows per import.' }, { status: 400 });
    }

    const supabase = getSupabase();

    // ── Load all existing clients once ─────────────────────────────────────
    // Build a name → client map (lowercase key for case-insensitive matching)
    const { data: existingClients } = await supabase
      .from('clients')
      .select('id, full_name, selected_plan, plan_price, last_paid_at, approval_token');

    const clientMap = new Map();
    for (const c of existingClients || []) {
      clientMap.set(c.full_name.toLowerCase().trim(), c);
    }

    // ── Process rows ────────────────────────────────────────────────────────
    let imported = 0;
    let clientsCreated = 0;
    const errors = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;

      // Validate required fields
      if (!row.clientName || !String(row.clientName).trim()) {
        errors.push({ row: rowNum, reason: 'Missing client_name' });
        continue;
      }
      if (!row.amount || isNaN(Number(row.amount)) || Number(row.amount) <= 0) {
        errors.push({ row: rowNum, reason: `Invalid amount: ${row.amount}` });
        continue;
      }
      const parsedDate = parseDate(row.paymentDate);
      if (!parsedDate) {
        errors.push({ row: rowNum, reason: `Invalid payment_date: ${row.paymentDate}` });
        continue;
      }

      const nameKey = String(row.clientName).trim().toLowerCase();
      let client = clientMap.get(nameKey);

      // Auto-create client if not found
      if (!client) {
        const planId = mapPlan(row.plan);
        const plan = trainingPlans.find(p => p.id === planId) || trainingPlans.find(p => p.id === 'group');

        try {
          // Generate a placeholder email for historical members who don't have
          // one on record. Uses a deterministic slug so re-runs don't create duplicates.
          const emailSlug = String(row.clientName).trim().toLowerCase()
            .replace(/[^a-z0-9]+/g, '.')
            .replace(/^\.+|\.+$/g, '');
          const placeholderEmail = `${emailSlug}.import@amscperformance.placeholder`;

          const { data: newClient, error: createError } = await supabase
            .from('clients')
            .insert({
              full_name: String(row.clientName).trim(),
              email: placeholderEmail,
              selected_plan: plan.id,
              plan_price: plan.price,
              application_status: 'approved',
              payment_status: 'pending',
              notes: 'Auto-created during historical payment import',
            })
            .select('id, full_name, selected_plan, plan_price')
            .single();

          if (createError || !newClient) {
            errors.push({ row: rowNum, reason: `Failed to create client: ${createError?.message}` });
            continue;
          }

          client = newClient;
          // Add to map so subsequent rows with the same name reuse this client
          clientMap.set(nameKey, newClient);
          clientsCreated++;
        } catch (createErr) {
          errors.push({ row: rowNum, reason: `Client creation error: ${createErr.message}` });
          continue;
        }
      }

      // Insert payment — use a deterministic reference so re-running the same
      // CSV is idempotent. If the exact same record already exists we skip it.
      const importRef = `import_${client.id}_${parsedDate}_${Number(row.amount)}`;

      // Check for existing record with the same reference (safe re-import)
      const { data: existing } = await supabase
        .from('payments')
        .select('id')
        .eq('payment_reference', importRef)
        .maybeSingle();

      if (existing) {
        // Already imported — skip silently (count as imported to avoid confusion)
        imported++;
        continue;
      }

      try {
        const { error: paymentError } = await supabase
          .from('payments')
          .insert({
            client_id: client.id,
            amount: Number(row.amount),
            currency: 'KES',
            payment_date: parsedDate,
            payment_method: 'manual_cash',
            payment_reference: importRef,
            plan_id: client.selected_plan,
            plan_price: client.plan_price,
            months_covered: 1,
            notes: row.notes ? String(row.notes).trim() : null,
            source: 'import',
          });

        if (paymentError) {
          errors.push({ row: rowNum, reason: `Payment insert error: ${paymentError.message}` });
          continue;
        }

        // Update client's last_paid_at if this payment is more recent.
        // IMPORTANT: never overwrite payment_status for clients who have an
        // approval_token set — those are pending Paystack payers who must pay
        // through the website. Marking them 'paid' via import would block their
        // payment link. Only set 'paid' for historical/walk-in members.
        if (!client.last_paid_at || new Date(parsedDate) > new Date(client.last_paid_at)) {
          const updatePayload = { last_paid_at: parsedDate, reminders_sent: {} };
          if (!client.approval_token) {
            updatePayload.payment_status = 'paid';
          }
          await supabase
            .from('clients')
            .update(updatePayload)
            .eq('id', client.id);
          client.last_paid_at = parsedDate;
        }

        imported++;
      } catch (payErr) {
        errors.push({ row: rowNum, reason: `Payment error: ${payErr.message}` });
      }
    }

    console.log(`Import complete: ${imported} payments, ${clientsCreated} new clients, ${errors.length} errors`);

    return NextResponse.json({ imported, clientsCreated, errors });
  } catch (err) {
    console.error('import-payments error:', err);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
