/**
 * Invoice UI helpers shared by the invoice pages and components.
 * Pure display/validation helpers — business rules stay in invoiceService.
 */
import { calculateLineAmount, computeInvoiceStatus, isLineAdjusted, ISSUED_INVOICE_STATUSES } from '../../utils/calculations';
import { formatMoney, toMajor, toMinor } from '../../utils/currency';

/** Status re-evaluated against today (stored status can lag behind the due date). */
export function displayStatus(invoice) {
  return computeInvoiceStatus(invoice);
}

export function isOutstanding(invoice) {
  return ISSUED_INVOICE_STATUSES.includes(displayStatus(invoice)) && invoice.balanceDue > 0;
}

export function canRecordPayment(invoice) {
  return Boolean(invoice.finalizedAt && !invoice.voidedAt && invoice.balanceDue > 0);
}

export function canVoid(invoice) {
  return Boolean(invoice.finalizedAt && !invoice.voidedAt);
}

export const VOID_BLOCKED_REASON =
  'Invoices with recorded payments cannot be voided. A credit note or refund process (backend accounting) is required.';

/** Customer name for an invoice: frozen snapshot for finalized invoices, live record for drafts. */
export function invoiceCustomerName(invoice, customersById) {
  return invoice.customerSnapshot?.companyName ?? customersById[invoice.customerId]?.companyName ?? 'Unknown customer';
}

/** Sums a minor-unit field per currency and formats it ("1.200,00 € · $300.00"). */
export function sumByCurrency(rows, getValue, fallbackCurrency = 'EUR') {
  const totals = new Map();
  rows.forEach((row) => {
    const currency = row.currency || fallbackCurrency;
    totals.set(currency, (totals.get(currency) ?? 0) + (Number(getValue(row)) || 0));
  });
  if (totals.size === 0) return formatMoney(0, fallbackCurrency);
  return [...totals.entries()].map(([currency, value]) => formatMoney(value, currency)).join(' · ');
}

/** Parses a typed decimal ("7,5" or "7.5"); returns NaN when not a number. */
export function parseDecimal(value) {
  if (value === null || value === undefined) return NaN;
  if (typeof value === 'number') return value;
  const text = String(value).trim().replace(',', '.');
  if (text === '') return NaN;
  return Number(text);
}

export function roundHours(value) {
  const n = parseDecimal(value);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

/** Adds the UI-only input strings (prefixed with "_") used while editing. */
export function toEditableLine(line, currency) {
  return {
    ...line,
    _qtyInput: String(line.quantityHours ?? 0),
    _rateInput: toMajor(line.hourlyRate ?? 0, currency).toFixed(2),
    _amountInput: line.amountOverridden ? toMajor(line.amount ?? 0, currency).toFixed(2) : '',
  };
}

/** Removes the UI-only fields before a line is sent to the service. */
export function stripLine(line) {
  return Object.fromEntries(Object.entries(line).filter(([key]) => !key.startsWith('_')));
}

export function newCustomLine(id, currency) {
  return {
    id,
    type: 'custom',
    description: '',
    employeeId: null,
    projectId: null,
    attendanceRecordIds: [],
    recordedMinutes: 0,
    rateId: null,
    originalQuantityHours: null,
    quantityHours: 1,
    hourlyRate: 0,
    originalAmount: null,
    amount: 0,
    amountOverridden: false,
    adjustmentReason: '',
    _qtyInput: '1',
    _rateInput: toMajor(0, currency).toFixed(2),
    _amountInput: '',
  };
}

/**
 * Client-side line checks mirroring the service rules, so the administrator
 * sees every problem at once. Returns { [lineId]: { field: message } }.
 */
export function validateLineItems(lines) {
  const errors = {};
  lines.forEach((line) => {
    const e = {};
    if (!line.description?.trim()) e.description = 'Enter a description.';
    const qty = parseDecimal(line._qtyInput ?? line.quantityHours);
    if (!Number.isFinite(qty) || qty < 0) e.quantity = 'Enter a quantity of 0 or more (e.g. 7.5).';
    else if (Math.abs(qty * 100 - Math.round(qty * 100)) > 1e-6) e.quantity = 'Use at most two decimal places.';
    if (line.type !== 'hours') {
      const rate = parseDecimal(line._rateInput);
      if (!Number.isFinite(rate) || rate < 0) e.rate = 'Enter a unit rate of 0 or more.';
    }
    if (line.amountOverridden) {
      const amount = parseDecimal(line._amountInput);
      if (!Number.isFinite(amount) || amount < 0) e.amount = 'Enter an amount of 0 or more.';
    }
    if (line.type === 'hours' && isLineAdjusted(line) && !line.adjustmentReason?.trim()) {
      e.reason = 'Explain why the attendance-derived quantity or amount was changed.';
    }
    if (line.type !== 'hours' && !line.adjustmentReason?.trim()) {
      e.reason = 'Additional lines need a reason or reference (e.g. "Materials agreed by email").';
    }
    if (Object.keys(e).length) errors[line.id] = e;
  });
  return errors;
}

/** Applies a typed edit to a line and keeps the amount consistent. */
export function applyLineEdit(line, field, value, currency) {
  const next = { ...line };
  if (field === 'description') next.description = value;
  if (field === 'reason') next.adjustmentReason = value;
  if (field === 'quantity') {
    next._qtyInput = value;
    next.quantityHours = roundHours(value);
  }
  if (field === 'rate') {
    next._rateInput = value;
    const parsed = parseDecimal(value);
    next.hourlyRate = Number.isFinite(parsed) && parsed >= 0 ? toMinor(parsed, currency) : 0;
  }
  if (field === 'override') {
    next.amountOverridden = Boolean(value);
    next._amountInput = value ? toMajor(line.amount, currency).toFixed(2) : '';
  }
  if (field === 'amount') {
    next._amountInput = value;
    const parsed = parseDecimal(value);
    next.amount = Number.isFinite(parsed) && parsed >= 0 ? toMinor(parsed, currency) : 0;
  }
  if (!next.amountOverridden) next.amount = calculateLineAmount(next.quantityHours, next.hourlyRate);
  return next;
}

/** Opens a print window containing only the given element (the invoice document). */
export function printElement(element, title = 'Invoice') {
  if (!element) return false;
  const win = window.open('', '_blank', 'width=960,height=1100');
  if (!win) return false;
  const styles = [...document.querySelectorAll('style, link[rel="stylesheet"]')].map((node) => node.outerHTML).join('\n');
  const safeTitle = String(title).replace(/[<>&"]/g, '');
  win.document.write(
    `<!doctype html><html><head><meta charset="utf-8"><base href="${document.baseURI}"><title>${safeTitle}</title>${styles}` +
      '<style>body{background:#fff;margin:0;padding:24px}@page{margin:14mm}.invoice-doc{box-shadow:none!important;border:0!important;min-width:0!important}</style>' +
      `</head><body>${element.outerHTML}</body></html>`,
  );
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
  }, 400);
  return true;
}
