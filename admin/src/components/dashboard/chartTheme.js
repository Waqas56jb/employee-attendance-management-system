/**
 * Chart styling shared by the dashboard charts (Recharts).
 *
 * Categorical order is fixed (validated for colour-vision deficiency against
 * the white card surface): slot 1 indigo = gross / total measures
 * (recorded hours, invoiced), slot 2 teal = the realised subset
 * (billable hours, collected payments). Colour follows the measure, never rank.
 */
import { getCurrencyMeta } from '../../utils/currency';

export const SERIES = {
  primary: '#4f46e5',
  secondary: '#0d9488',
};

export const CHROME = {
  grid: '#eef0f3',
  axis: '#d1d5db',
  tick: '#64748b',
  ink: '#0f172a',
  surface: '#ffffff',
  cursor: 'rgba(79, 70, 229, 0.06)',
};

/** Matches StatusBadge tones (draft/void neutral, sent/finalized info, …). */
export const INVOICE_STATUS_COLORS = {
  draft: '#94a3b8',
  finalized: '#93c5fd',
  sent: '#3b82f6',
  partially_paid: '#f59e0b',
  paid: '#10b981',
  overdue: '#ef4444',
  void: '#cbd5e1',
};

export const INVOICE_STATUS_ORDER = ['draft', 'finalized', 'sent', 'partially_paid', 'overdue', 'paid', 'void'];

export const axisProps = {
  tick: { fill: CHROME.tick, fontSize: 11 },
  tickLine: false,
  axisLine: { stroke: CHROME.axis },
  tickMargin: 6,
};

export const gridProps = { stroke: CHROME.grid, vertical: false };

/** Bars: ≤ 24px thick with a 4px rounded data end. */
export const BAR_SIZE = 18;

/** Major-unit compact money for axes, e.g. 12500 → "€12.5K". */
export function compactMoneyMajor(value, currency = 'EUR') {
  const meta = getCurrencyMeta(currency);
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: meta.code,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(Number(value) || 0);
}

/** Minor units → whole currency units without decimals (for KPI tiles). */
export function wholeMoney(minor, currency = 'EUR') {
  const meta = getCurrencyMeta(currency);
  return new Intl.NumberFormat(meta.locale, {
    style: 'currency',
    currency: meta.code,
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format((Number(minor) || 0) / 10 ** meta.fractionDigits);
}

export function hoursTick(value) {
  return `${Number(value) || 0}h`;
}
