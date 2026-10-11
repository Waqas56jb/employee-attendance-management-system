/**
 * Small helpers shared by the billing pages (rates, billable hours, overview).
 * Pure functions only — no calculations of their own beyond grouping rows the
 * calculation engine already produced.
 */
import { getCurrencyMeta, formatMoney } from '../../utils/currency';
import { getBillingRows } from '../../services/billingService';
import { EXCLUSION_CODE, getCurrentRate, ISSUED_INVOICE_STATUSES } from '../../utils/calculations';

/** Status key for StatusBadge kind="billing" (eligible rows have code null). */
export function rowStatus(row) {
  return row.code ?? 'eligible';
}

/** Billed and still-open records cannot be adjusted; cancelled ones must be restored first. */
export function canEditBilling(row) {
  return ![EXCLUSION_CODE.BILLED, EXCLUSION_CODE.ACTIVE, EXCLUSION_CODE.CANCELLED].includes(row.code);
}

export const BILLING_VIEW_OPTIONS = [
  { value: 'all', label: 'All records' },
  { value: 'billable', label: 'Billable only' },
  { value: 'excluded', label: 'Excluded only' },
];

/** Builds "?a=1&b=2" from an object, dropping empty values. */
export function toQuery(params) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== '' && v !== null && v !== undefined) search.set(k, v);
  });
  const text = search.toString();
  return text ? `?${text}` : '';
}

/** Currency symbol for input prefixes, e.g. EUR → "€". */
export function currencySymbol(code) {
  const meta = getCurrencyMeta(code);
  try {
    const part = new Intl.NumberFormat(meta.locale, { style: 'currency', currency: meta.code })
      .formatToParts(0)
      .find((p) => p.type === 'currency');
    return part?.value ?? meta.code;
  } catch {
    return meta.code;
  }
}

/** Adds an amount to a { currency: minor } map. */
export function addToTotals(totals, currency, amount) {
  if (!currency) return totals;
  totals[currency] = (totals[currency] ?? 0) + amount;
  return totals;
}

/** "€3,500.00" or "€1,000.00 + £200.00"; zero shows in the fallback currency. */
export function formatTotals(totals, fallbackCurrency = 'EUR') {
  const entries = Object.entries(totals).filter(([, v]) => v !== 0);
  if (entries.length === 0) return formatMoney(0, fallbackCurrency);
  return entries.map(([code, v]) => formatMoney(v, code)).join(' + ');
}

/**
 * Billing rows for every customer (each in its own invoice currency), with no
 * date limit. The overview derives all its figures from this one pass.
 */
export function getAllBillingRows(db) {
  return db.customers.flatMap((customer) =>
    getBillingRows(db, { customerId: customer.id, currency: customer.currency }).map((row) => ({ ...row, currency: customer.currency })),
  );
}

/** Per-customer figures for the overview table, for rows inside [from, to]. */
export function summarizeCustomers(db, allRows, { from, to }) {
  const inRange = (key) => (!from || key >= from) && (!to || key <= to);
  return db.customers
    .map((customer) => {
      const rows = allRows.filter((r) => r.record.customerId === customer.id && inRange(r.workDate));
      const eligible = rows.filter((r) => r.eligible);
      const lastInvoice = db.invoices
        .filter((inv) => inv.customerId === customer.id && ISSUED_INVOICE_STATUSES.includes(inv.status))
        .reduce((latest, inv) => (!latest || inv.issueDate > latest.issueDate ? inv : latest), null);
      return {
        id: customer.id,
        customer,
        currentRate: getCurrentRate(db.hourlyRates, customer.id, customer.currency),
        unbilledRecords: eligible.length,
        unbilledMinutes: eligible.reduce((s, r) => s + r.billableMinutes, 0),
        unbilledAmount: eligible.reduce((s, r) => s + r.amount, 0),
        reviewCount: rows.filter((r) => r.code === EXCLUSION_CODE.NEEDS_REVIEW).length,
        noRateCount: rows.filter((r) => r.code === EXCLUSION_CODE.NO_RATE).length,
        lastInvoice,
      };
    })
    .filter((s) => s.customer.status !== 'archived' || s.unbilledRecords > 0);
}
