/**
 * Styled Excel (.xlsx) export for each dashboard page.
 * ExcelJS is loaded on demand so the main bundle stays small.
 */

const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
const SECTION_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
const HEADER_FONT = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10, name: 'Calibri' };
const SECTION_FONT = { bold: true, color: { argb: 'FF0F172A' }, size: 10, name: 'Calibri' };
const BODY_FONT = { size: 10, name: 'Calibri' };

const CURRENCY = '"$"#,##0.00';
const QTY = '#,##0.0';
const INT = '#,##0';
const PCT = '0.0"%"';

const thinBorder = { style: 'thin', color: { argb: 'FFE2E8F0' } };
const BORDER = { top: thinBorder, left: thinBorder, bottom: thinBorder, right: thinBorder };

function styleHeaderRow(row, length) {
  row.height = 28;
  for (let i = 1; i <= length; i += 1) {
    const cell = row.getCell(i);
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = BORDER;
  }
}

function styleBodyRow(row, columns) {
  row.height = 16;
  row.eachCell((cell, colNumber) => {
    const col = columns[colNumber - 1] || {};
    cell.font = BODY_FONT;
    cell.border = BORDER;
    if (col.numFmt) cell.numFmt = col.numFmt;
    cell.alignment = { vertical: 'middle', horizontal: col.align || 'left' };
  });
}

function addTableSheet(wb, sheetName, columns, rows) {
  const ws = wb.addWorksheet(sheetName, {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  ws.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width || 16 }));
  styleHeaderRow(ws.getRow(1), columns.length);

  rows.forEach((r) => styleBodyRow(ws.addRow(r), columns));

  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
  return ws;
}

function addTitle(ws, text, columns, subtitle) {
  const row = ws.addRow([text]);
  ws.mergeCells(row.number, 1, row.number, columns);
  row.height = 22;
  const cell = row.getCell(1);
  cell.font = { bold: true, size: 13, name: 'Calibri', color: { argb: 'FF0F172A' } };
  cell.alignment = { vertical: 'middle' };
  if (subtitle) {
    const sub = ws.addRow([subtitle]);
    ws.mergeCells(sub.number, 1, sub.number, columns);
    const subCell = sub.getCell(1);
    subCell.font = { size: 9, name: 'Calibri', color: { argb: 'FF64748B' } };
    subCell.alignment = { vertical: 'middle' };
  }
  ws.addRow([]);
}

function addSection(ws, text, columns) {
  ws.addRow([]);
  const row = ws.addRow([text]);
  ws.mergeCells(row.number, 1, row.number, columns);
  row.height = 20;
  const cell = row.getCell(1);
  cell.fill = SECTION_FILL;
  cell.font = SECTION_FONT;
  cell.alignment = { vertical: 'middle' };
}

async function download(wb, filename) {
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function stamp() {
  return new Date().toISOString().slice(0, 10);
}

function buildOverviewWorkbook(ExcelJS, { data, kpis, agingTierData, customerRiskData }) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Rochdale Spears Company';
  wb.created = new Date();

  const ws = wb.addWorksheet('Overview', { views: [{ state: 'frozen', ySplit: 0 }] });
  ws.columns = [
    { width: 34 },
    { width: 16 },
    { width: 14 },
    { width: 14 },
    { width: 16 },
    { width: 16 },
    { width: 14 },
    { width: 16 },
    { width: 14 },
  ];

  addTitle(ws, 'Fabric & Leather Inventory Aging Report', 9,
    `Rochdale Spears Company  |  Generated ${data.metadata.generated_at.slice(0, 10)}  |  ${data.metadata.total_batches.toLocaleString()} batches in scope`);

  addSection(ws, 'Valuation Summary', 9);
  const summaryRows = [
    ['Total On-Hand Value (Standard Cost)', kpis.totalCost, CURRENCY],
    ['Physical Volume (Units)', kpis.totalQty, QTY],
    ['Import Duty (12%)', kpis.totalDuty, CURRENCY],
    ['VAT (8%)', kpis.totalVat, CURRENCY],
    ['Total Financial Liability (Post-Tax)', kpis.totalTax, CURRENCY],
    ['Aged Stock Standard Cost (>180 Days)', kpis.agedCostOver180, CURRENCY],
    ['Aged Liability Post-Tax (>180 Days)', kpis.agedTaxOver180, CURRENCY],
    ['Aged Share of Stock', kpis.agedCostPct, PCT],
  ];
  summaryRows.forEach(([label, value, fmt]) => {
    const row = ws.addRow([label, value]);
    row.height = 16;
    row.getCell(1).font = BODY_FONT;
    row.getCell(1).border = BORDER;
    row.getCell(2).font = { ...BODY_FONT, bold: true };
    row.getCell(2).border = BORDER;
    row.getCell(2).numFmt = fmt;
    row.getCell(2).alignment = { horizontal: 'right', vertical: 'middle' };
  });

  addSection(ws, 'Aging Tier Valuation & Statutory Tax Liability', 9);
  const agingCols = [
    { header: 'Aging Bracket', key: 'tier', width: 34, align: 'left' },
    { header: 'Batches', key: 'count', width: 16, numFmt: INT, align: 'right' },
    { header: 'Physical Qty', key: 'qty', width: 14, numFmt: QTY, align: 'right' },
    { header: 'Qty Share', key: 'qtyPct', width: 14, numFmt: PCT, align: 'right' },
    { header: 'Standard Cost', key: 'cost', width: 16, numFmt: CURRENCY, align: 'right' },
    { header: 'Import Duty', key: 'duty', width: 16, numFmt: CURRENCY, align: 'right' },
    { header: 'VAT', key: 'vat', width: 14, numFmt: CURRENCY, align: 'right' },
    { header: 'Total After Tax', key: 'tax', width: 16, numFmt: CURRENCY, align: 'right' },
    { header: 'Cost Share', key: 'costPct', width: 14, numFmt: PCT, align: 'right' },
  ];
  const agingHeader = ws.addRow(agingCols.map((c) => c.header));
  styleHeaderRow(agingHeader, agingCols.length);
  agingTierData.forEach((t) => {
    styleBodyRow(ws.addRow([t.tier, t.count, t.qty, t.qtyPct, t.cost, t.duty, t.vat, t.tax, t.costPct]), agingCols);
  });
  const agingTotal = ws.addRow([
    'Total',
    kpis.count,
    kpis.totalQty,
    100,
    kpis.totalCost,
    kpis.totalDuty,
    kpis.totalVat,
    kpis.totalTax,
    100,
  ]);
  styleBodyRow(agingTotal, agingCols);
  agingTotal.eachCell((cell) => {
    cell.font = { ...BODY_FONT, bold: true };
    cell.fill = SECTION_FILL;
  });

  addSection(ws, 'Customer Exposure & Aged Liability', 9);
  const custCols = [
    { header: 'Customer Account', key: 'customer', width: 34, align: 'left' },
    { header: 'Batches', key: 'count', width: 16, numFmt: INT, align: 'right' },
    { header: 'Total Qty', key: 'totalQty', width: 14, numFmt: QTY, align: 'right' },
    { header: 'Standard Cost', key: 'totalCost', width: 16, numFmt: CURRENCY, align: 'right' },
    { header: 'Total After Tax', key: 'totalTax', width: 16, numFmt: CURRENCY, align: 'right' },
    { header: 'Aged Liability (>180d)', key: 'agedTaxOver180', width: 18, numFmt: CURRENCY, align: 'right' },
    { header: 'Aged Share', key: 'agedPct', width: 14, numFmt: PCT, align: 'right' },
  ];
  const custHeader = ws.addRow(custCols.map((c) => c.header));
  styleHeaderRow(custHeader, custCols.length);
  customerRiskData.forEach((c) => {
    const agedPct = c.totalTax > 0 ? (c.agedTaxOver180 / c.totalTax) * 100 : 0;
    styleBodyRow(ws.addRow([c.customer, c.count, c.totalQty, c.totalCost, c.totalTax, c.agedTaxOver180, agedPct]), custCols);
  });

  return wb;
}

function buildActiveCoversWorkbook(ExcelJS, { data, covers, kpis }) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Rochdale Spears Company';
  wb.created = new Date();

  const columns = [
    { header: 'Cover / Part #', key: 'item', width: 20, align: 'left' },
    { header: 'Description', key: 'description', width: 44, align: 'left' },
    { header: 'Customer', key: 'customer', width: 16, align: 'left' },
    { header: 'Material Group', key: 'product_group', width: 16, align: 'left' },
    { header: 'UOM', key: 'uom', width: 8, align: 'left' },
    { header: 'Standard Cost', key: 'standard_cost', width: 14, numFmt: CURRENCY, align: 'right' },
    { header: 'On-Hand Qty', key: 'on_hand_qty', width: 14, numFmt: QTY, align: 'right' },
    { header: 'Batches', key: 'batches_count', width: 10, numFmt: INT, align: 'right' },
    { header: 'Stock Value', key: 'total_cost', width: 15, numFmt: CURRENCY, align: 'right' },
    { header: 'Post-Tax Value', key: 'total_after_tax', width: 15, numFmt: CURRENCY, align: 'right' },
    { header: '2026 Consumed Qty', key: 'consumed_qty_2026', width: 17, numFmt: QTY, align: 'right' },
    { header: 'Production Orders', key: 'prod_orders_count', width: 16, numFmt: INT, align: 'right' },
    { header: 'Last Production Pick', key: 'last_consumed_date', width: 19, align: 'left' },
    { header: 'Avg Weekly Consumption', key: 'avg_weekly_demand', width: 20, numFmt: QTY, align: 'right' },
    { header: 'Runway (Weeks)', key: 'weeks_of_supply', width: 14, align: 'right' },
    { header: 'Status', key: 'status', width: 13, align: 'left' },
  ];

  const ws = addTableSheet(wb, 'Active Covers', columns, covers);

  const notes = wb.addWorksheet('Scope Notes');
  notes.columns = [{ width: 100 }];
  addTitle(notes, 'Active Covers Scope Definition', 1);
  [
    'Active cover: inventory age 180 days or less AND recorded production consumption or customer orders in 2026.',
    'Consumption source: Dynamics 365 inventory transactions, reference "Production line", issue status Sold or Deducted.',
    'Runway (weeks of supply) = on-hand quantity divided by average weekly consumption across Feb to Oct 2026 (39 weeks).',
    'Status bands: under 13 weeks is Low Buffer, 13 to 26 weeks is Balanced, above 26 weeks is High Buffer.',
    '',
    `Materials in this export: ${covers.length.toLocaleString()}`,
    `Stock value: $${kpis.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    `Post-tax liability: $${kpis.totalTax.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  ].forEach((line) => {
    const row = notes.addRow([line]);
    row.getCell(1).font = line.includes(':') ? BODY_FONT : { ...BODY_FONT, size: 10 };
    row.getCell(1).alignment = { wrapText: true, vertical: 'top' };
  });

  return wb;
}

function buildProjectionWorkbook(ExcelJS, { projections }) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Rochdale Spears Company';
  wb.created = new Date();

  const columns = [
    { header: 'Material / Part #', key: 'item', width: 20, align: 'left' },
    { header: 'Description', key: 'description', width: 44, align: 'left' },
    { header: 'Customer', key: 'customer', width: 16, align: 'left' },
    { header: 'Supplier', key: 'supplier', width: 16, align: 'left' },
    { header: 'UOM', key: 'uom', width: 8, align: 'left' },
    { header: 'Standard Cost', key: 'standard_cost', width: 14, numFmt: CURRENCY, align: 'right' },
    { header: 'On Hand', key: 'on_hand', width: 14, numFmt: QTY, align: 'right' },
    { header: 'Total Incoming', key: 'incoming', width: 15, numFmt: QTY, align: 'right' },
    { header: 'Total Demand', key: 'demand', width: 14, numFmt: QTY, align: 'right' },
    { header: 'Balance', key: 'balance', width: 14, numFmt: QTY, align: 'right' },
    { header: 'Free Stock', key: 'free_stock', width: 14, numFmt: QTY, align: 'right' },
    { header: 'Free Stock Value', key: 'free_stock_cost', width: 16, numFmt: CURRENCY, align: 'right' },
    { header: 'Free Stock Post-Tax', key: 'free_stock_tax', width: 18, numFmt: CURRENCY, align: 'right' },
    { header: 'AWS (Weeks)', key: 'aws', width: 12, align: 'right' },
    { header: 'Status', key: 'status', width: 13, align: 'left' },
  ];

  return addTableSheet(wb, 'Stock Projection', columns, projections) && wb;
}

function buildExplorerWorkbook(ExcelJS, { records }) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Rochdale Spears Company';
  wb.created = new Date();

  const columns = [
    { header: 'Batch Number', key: 'batch', width: 20, align: 'left' },
    { header: 'Item Number', key: 'item', width: 20, align: 'left' },
    { header: 'Description', key: 'description', width: 44, align: 'left' },
    { header: 'Customer', key: 'customer', width: 16, align: 'left' },
    { header: 'Material Group', key: 'product_group', width: 16, align: 'left' },
    { header: 'Warehouse', key: 'warehouse', width: 14, align: 'left' },
    { header: 'Location', key: 'location', width: 16, align: 'left' },
    { header: 'Physical Qty', key: 'qty', width: 14, numFmt: QTY, align: 'right' },
    { header: 'UOM', key: 'uom', width: 8, align: 'left' },
    { header: 'Standard Cost', key: 'standard_cost', width: 14, numFmt: CURRENCY, align: 'right' },
    { header: 'Total Cost', key: 'total_cost', width: 15, numFmt: CURRENCY, align: 'right' },
    { header: 'Import Duty (12%)', key: 'import_duty', width: 16, numFmt: CURRENCY, align: 'right' },
    { header: 'VAT (8%)', key: 'vat', width: 14, numFmt: CURRENCY, align: 'right' },
    { header: 'Total After Tax', key: 'total_after_tax', width: 16, numFmt: CURRENCY, align: 'right' },
    { header: 'Aging Days', key: 'aging_days', width: 12, numFmt: INT, align: 'right' },
    { header: 'Aging Bracket', key: 'aging_bucket', width: 15, align: 'left' },
    { header: 'PO Number', key: 'po', width: 16, align: 'left' },
    { header: 'Supplier Code', key: 'supplier', width: 15, align: 'left' },
    { header: 'Receive Date', key: 'receive_date', width: 14, align: 'left' },
    { header: 'Manufacturing Date', key: 'mfg_date', width: 18, align: 'left' },
  ];

  return addTableSheet(wb, 'Batch Explorer', columns, records) && wb;
}

/**
 * Export the current page's dataset as a formatted .xlsx file.
 * @param {'overview'|'active_covers'|'projection'|'explorer'} tab
 * @param {object} payload data needed by the matching sheet builder
 */
export async function exportToExcel(tab, payload) {
  const ExcelJS = (await import('exceljs')).default;
  const date = stamp();

  let wb;
  let filename;

  switch (tab) {
    case 'active_covers':
      wb = buildActiveCoversWorkbook(ExcelJS, payload);
      filename = `active_covers_${date}.xlsx`;
      break;
    case 'projection':
      wb = buildProjectionWorkbook(ExcelJS, payload);
      filename = `stock_projection_${date}.xlsx`;
      break;
    case 'explorer':
      wb = buildExplorerWorkbook(ExcelJS, payload);
      filename = `batch_explorer_${date}.xlsx`;
      break;
    default:
      wb = buildOverviewWorkbook(ExcelJS, payload);
      filename = `inventory_aging_overview_${date}.xlsx`;
  }

  await download(wb, filename);
}
