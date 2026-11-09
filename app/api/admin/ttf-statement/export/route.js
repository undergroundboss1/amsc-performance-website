import { getAdminActor } from '../../../../../lib/admin-auth';
import { logAdminAction } from '../../../../../lib/admin-audit';
import {
  DEFAULTS,
  statementTotals,
  sheetName,
  fileMonth,
  monthStart,
} from '../../../../../lib/ttf';

/**
 * POST /api/admin/ttf-statement/export
 *
 * Builds the .xlsx AMSC sends to TTF, in the layout TTF already receives:
 * one line per client, the commission columns as live formulas so the
 * landlord can audit the arithmetic rather than take our word for it, and
 * the owed/paid block at the bottom.
 *
 * Takes the statement in the body rather than reading it back from the
 * database, so the file always matches what is on screen — including edits
 * that have not been saved yet.
 */

const KSH = '"Ksh"#,##0.00';
const HEADER_FILL = 'FF0000FF';
const TOTAL_FILL = 'FFA61C00';
const OWED_FILL = 'FFFF0000';

const COLUMNS = [
  { header: 'Name', width: 26 },
  { header: 'Months paid ', width: 12.6 },
  { header: 'Total amount paid', width: 21.9 },
  // TTF's own sheets spell it this way. Kept as-is so the column they have
  // always matched against does not suddenly read differently.
  { header: 'Commisionable amount', width: 21 },
  { header: 'Amount to TSG ', width: 25.6 },
  { header: 'Amount to TTF', width: 21.1 },
  { header: 'Amount to AMSC', width: 24.3 },
];

export async function POST(request) {
  const actor = getAdminActor(request);
  if (!actor) {
    return Response.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const month = monthStart(body.month);
    if (!month) {
      return Response.json({ error: 'month is required as YYYY-MM.' }, { status: 400 });
    }

    const rows = Array.isArray(body.rows) ? body.rows : [];
    if (rows.length === 0) {
      return Response.json({ error: 'There are no lines to export.' }, { status: 400 });
    }

    // `|| DEFAULTS` would read a deliberate 0% as 25%, and bill the landlord
    // for a commission the statement on screen says is not owed.
    const pct = (value, fallback) => {
      const n = Number(value);
      return Number.isFinite(n) && n >= 0 && n < 1 ? n : fallback;
    };
    const tsgPercent = pct(body.tsgPercent, DEFAULTS.tsgPercent);
    const ttfPercent = pct(body.ttfPercent, DEFAULTS.ttfPercent);

    // Imported here rather than at module scope: it is a large dependency and
    // only this one route needs it.
    const ExcelJS = (await import('exceljs')).default;
    const wb = new ExcelJS.Workbook();
    wb.creator = 'AMSC Performance';
    wb.created = new Date();
    // The commission columns ship as formulas, with no cached results. Excel
    // and Sheets would recalculate anyway; this makes sure a viewer that
    // doesn't shows the figures rather than a column of blanks.
    wb.calcProperties.fullCalcOnLoad = true;
    const ws = wb.addWorksheet(sheetName(month));

    ws.columns = COLUMNS.map(c => ({ width: c.width }));

    // ── Header ───────────────────────────────────────────────────────────
    const header = ws.addRow(COLUMNS.map(c => c.header));
    header.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    });

    // ── Lines ────────────────────────────────────────────────────────────
    const firstDataRow = 2;
    rows.forEach(r => {
      const i = ws.rowCount + 1;
      const line = ws.addRow([
        r.name,
        Number(r.monthsPaid) || 0,
        Number(r.totalPaid) || 0,
        Number(r.commissionable) || 0,
        { formula: `D${i}*${tsgPercent}` },
        { formula: `D${i}*${ttfPercent}` },
        { formula: `D${i}-E${i}-F${i}` },
      ]);
      ['C', 'D', 'E', 'F', 'G'].forEach(col => {
        line.getCell(col).numFmt = KSH;
      });
    });
    const lastDataRow = ws.rowCount;

    // ── Totals ───────────────────────────────────────────────────────────
    // Summed across every line. TTF's existing sheets stop these ranges short
    // of the last few rows, which understates the total.
    const totalRow = ws.addRow([
      'Total',
      null,
      { formula: `SUM(C${firstDataRow}:C${lastDataRow})` },
      { formula: `SUM(D${firstDataRow}:D${lastDataRow})` },
      { formula: `SUM(E${firstDataRow}:E${lastDataRow})` },
      { formula: `SUM(F${firstDataRow}:F${lastDataRow})` },
      { formula: `SUM(G${firstDataRow}:G${lastDataRow})` },
    ]);
    totalRow.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TOTAL_FILL } };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    });
    ['C', 'D', 'E', 'F', 'G'].forEach(col => {
      totalRow.getCell(col).numFmt = KSH;
    });
    const totalRowNum = totalRow.number;

    ws.addRow([]);

    // ── What TTF is owed, and what was sent ──────────────────────────────
    // TTF receives both commissions: its own 15% and TSG's 25%.
    const owedRow = ws.addRow([
      'Total Amount Owed to TTF',
      { formula: `E${totalRowNum}+F${totalRowNum}` },
    ]);
    owedRow.getCell('A').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: OWED_FILL } };
    owedRow.getCell('A').font = { bold: true, color: { argb: 'FFFFFFFF' } };
    owedRow.getCell('B').numFmt = KSH;

    const paidRow = ws.addRow([
      'TOTAL PAID TO TTF',
      { formula: `B${owedRow.number}` },
      body.paymentReference || null,
      body.paidAt ? new Date(body.paidAt) : null,
    ]);
    paidRow.getCell('A').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: OWED_FILL } };
    paidRow.getCell('A').font = { bold: true, color: { argb: 'FFFFFFFF' } };
    paidRow.getCell('B').numFmt = KSH;
    if (body.paidAt) paidRow.getCell('D').numFmt = 'm/d/yyyy h:mm';

    ws.addRow([null, null, null, null, 'Paid to TTF']);

    if (body.notes) {
      ws.addRow([]);
      ws.addRow(['Notes', body.notes]);
    }

    const buffer = await wb.xlsx.writeBuffer();

    const totals = statementTotals(rows, tsgPercent, ttfPercent);
    await logAdminAction({
      actor,
      action: 'client.export_ttf_statement',
      domain: 'client',
      detail: { month, lines: rows.length, owed_to_ttf: Math.round(totals.owedToTtf) },
    });

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="AMSC_PAYMENT_TO_TTF_${fileMonth(month)}.xlsx"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('ttf-statement export error:', err);
    return Response.json({ error: 'Failed to build the spreadsheet.' }, { status: 500 });
  }
}
