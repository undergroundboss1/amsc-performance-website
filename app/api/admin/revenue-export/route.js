import { getSupabase } from '../../../../lib/supabase';
import { getAdminActor } from '../../../../lib/admin-auth';
import { logAdminAction } from '../../../../lib/admin-audit';
import {
  GRANULARITIES,
  GRANULARITY_LABELS,
  bucketPayments,
  sumBuckets,
  nairobiDayStart,
} from '../../../../lib/revenue-buckets';

/**
 * POST /api/admin/revenue-export
 *
 * AMSC's own income for a date range: gross, the facility's rent split, and
 * what is left. Two sheets — a summary bucketed by day, month, quarter or
 * year, and the transactions behind it, so a figure can always be traced to
 * the payments that make it up.
 *
 * Body:
 *   from         ISO datetime, inclusive   required
 *   to           ISO datetime, exclusive   required
 *   granularity  daily | monthly | quarterly | yearly
 *   label        what the range is called on screen, e.g. "October 2026"
 *
 * The range is queried here rather than posted in, so the export stays small
 * and correct however many payments it covers.
 */

const KSH = '"Ksh"#,##0.00';
const HEADER_FILL = 'FF1A1A1A';
const TOTAL_FILL = 'FFA61C00';

export async function POST(request) {
  const actor = getAdminActor(request);
  if (!actor) return Response.json({ error: 'Unauthorized.' }, { status: 401 });

  try {
    const body = await request.json();

    const granularity = GRANULARITIES.includes(body.granularity) ? body.granularity : 'monthly';

    // from/to arrive as calendar dates and are resolved to Nairobi midnights
    // here, so the range and the buckets inside it are cut on one clock.
    const isYmd = v => /^\d{4}-\d{2}-\d{2}$/.test(String(v || ''));
    if (!isYmd(body.from) || !isYmd(body.to)) {
      return Response.json({ error: 'from and to are required as YYYY-MM-DD.' }, { status: 400 });
    }
    const from = nairobiDayStart(body.from);
    const to = nairobiDayStart(body.to);
    if (isNaN(from.getTime()) || isNaN(to.getTime()) || from >= to) {
      return Response.json({ error: 'A valid from/to range is required.' }, { status: 400 });
    }

    const supabase = getSupabase();
    const { data: payments, error } = await supabase
      .from('payments')
      .select('payment_date, amount, rent_split, net_revenue, payment_method, plan_id, source, notes, clients(full_name)')
      .gte('payment_date', from.toISOString())
      .lt('payment_date', to.toISOString())
      .order('payment_date', { ascending: true });

    if (error) {
      console.error('revenue-export query error:', error);
      return Response.json({ error: 'Failed to load payments.' }, { status: 500 });
    }

    if (!payments || payments.length === 0) {
      return Response.json({ error: 'There are no payments in that range to export.' }, { status: 400 });
    }

    const buckets = bucketPayments(payments, granularity);
    const totals = sumBuckets(buckets);
    const rangeLabel = body.label || `${body.from} to ${body.to}`;

    const ExcelJS = (await import('exceljs')).default;
    const wb = new ExcelJS.Workbook();
    wb.creator = 'AMSC Performance';
    wb.created = new Date();
    wb.calcProperties.fullCalcOnLoad = true;

    // ── Summary ──────────────────────────────────────────────────────────
    const sum = wb.addWorksheet('Summary');
    sum.columns = [{ width: 22 }, { width: 12 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 14 }];

    const title = sum.addRow([`AMSC Performance — Income, ${rangeLabel}`]);
    title.font = { bold: true, size: 14 };
    sum.addRow([`${GRANULARITY_LABELS[granularity]} breakdown · generated ${new Date().toLocaleDateString('en-KE')}`])
      .font = { color: { argb: 'FF888888' }, size: 10 };
    sum.addRow([]);

    const head = sum.addRow(['Period', 'Payments', 'Gross income', 'Rent split', 'Net income', 'Net margin']);
    head.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    });

    const firstRow = sum.rowCount + 1;
    buckets.forEach(bk => {
      const i = sum.rowCount + 1;
      const row = sum.addRow([
        bk.label,
        bk.count,
        bk.gross,
        bk.rent,
        bk.net,
        // Shown as a formula so the ratio follows any edit made to the sheet.
        { formula: `IF(C${i}=0,0,E${i}/C${i})` },
      ]);
      ['C', 'D', 'E'].forEach(c => { row.getCell(c).numFmt = KSH; });
      row.getCell('F').numFmt = '0.0%';
    });
    const lastRow = sum.rowCount;

    const totalRow = sum.addRow([
      'Total',
      totals.count,
      { formula: `SUM(C${firstRow}:C${lastRow})` },
      { formula: `SUM(D${firstRow}:D${lastRow})` },
      { formula: `SUM(E${firstRow}:E${lastRow})` },
      { formula: `IF(C${lastRow + 1}=0,0,E${lastRow + 1}/C${lastRow + 1})` },
    ]);
    totalRow.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TOTAL_FILL } };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    });
    ['C', 'D', 'E'].forEach(c => { totalRow.getCell(c).numFmt = KSH; });
    totalRow.getCell('F').numFmt = '0.0%';

    // ── Transactions ─────────────────────────────────────────────────────
    const tx = wb.addWorksheet('Transactions');
    tx.columns = [
      { width: 13 }, { width: 24 }, { width: 16 }, { width: 14 },
      { width: 18 }, { width: 14 }, { width: 14 }, { width: 10 }, { width: 30 },
    ];
    const txHead = tx.addRow(['Date', 'Client', 'Plan', 'Gross', 'Method', 'Rent split', 'Net', 'Source', 'Notes']);
    txHead.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    });

    payments.forEach(p => {
      const row = tx.addRow([
        new Date(p.payment_date),
        p.clients?.full_name || '—',
        p.plan_id || '—',
        Number(p.amount) || 0,
        p.payment_method || '—',
        Number(p.rent_split) || 0,
        Number(p.net_revenue) || 0,
        p.source || '—',
        p.notes || '',
      ]);
      row.getCell('A').numFmt = 'd mmm yyyy';
      ['D', 'F', 'G'].forEach(c => { row.getCell(c).numFmt = KSH; });
    });
    tx.views = [{ state: 'frozen', ySplit: 1 }];

    const buffer = await wb.xlsx.writeBuffer();

    await logAdminAction({
      actor,
      action: 'client.export_revenue',
      domain: 'client',
      detail: {
        range: rangeLabel,
        granularity,
        payments: payments.length,
        gross: Math.round(totals.gross),
        net: Math.round(totals.net),
      },
    });

    const slug = `${rangeLabel}_${granularity}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="AMSC_income_${slug}.xlsx"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('revenue-export error:', err);
    return Response.json({ error: 'Failed to build the spreadsheet.' }, { status: 500 });
  }
}
