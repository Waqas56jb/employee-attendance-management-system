/**
 * Money helpers.
 *
 * All monetary values in the app are stored and calculated as INTEGER MINOR
 * UNITS (cents for EUR/USD/GBP/CHF). Formatting happens only at the edges, so
 * floating-point rounding never leaks into totals.
 */

export const SUPPORTED_CURRENCIES = [
  { code: 'EUR', label: 'Euro (€)', locale: 'de-DE', fractionDigits: 2 },
  { code: 'USD', label: 'US Dollar ($)', locale: 'en-US', fractionDigits: 2 },
  { code: 'GBP', label: 'British Pound (£)', locale: 'en-GB', fractionDigits: 2 },
  { code: 'CHF', label: 'Swiss Franc (CHF)', locale: 'de-CH', fractionDigits: 2 },
  { code: 'SEK', label: 'Swedish Krona (kr)', locale: 'sv-SE', fractionDigits: 2 },
  { code: 'PLN', label: 'Polish Złoty (zł)', locale: 'pl-PL', fractionDigits: 2 },
];

export const DEFAULT_CURRENCY = 'EUR';

export function getCurrencyMeta(code) {
  return SUPPORTED_CURRENCIES.find((c) => c.code === code) ?? SUPPORTED_CURRENCIES[0];
}

function factor(code) {
  return 10 ** getCurrencyMeta(code).fractionDigits;
}

/** Converts a major-unit amount typed by a user (e.g. "35.5") into minor units (3550). */
export function toMinor(major, code = DEFAULT_CURRENCY) {
  if (major === '' || major === null || major === undefined) return 0;
  const value = typeof major === 'number' ? major : Number(String(major).replace(',', '.'));
  if (!Number.isFinite(value)) return 0;
  // Round via string-free scaling with a tiny epsilon to absorb 1.005-style float noise.
  return Math.round((value + Math.sign(value) * Number.EPSILON) * factor(code));
}

/** Converts minor units to a major-unit number (for form defaults only, never for math). */
export function toMajor(minor, code = DEFAULT_CURRENCY) {
  return (Number(minor) || 0) / factor(code);
}

const formatterCache = new Map();

function getFormatter(code, compact) {
  const key = `${code}:${compact}`;
  if (!formatterCache.has(key)) {
    const meta = getCurrencyMeta(code);
    formatterCache.set(
      key,
      new Intl.NumberFormat(meta.locale, {
        style: 'currency',
        currency: meta.code,
        minimumFractionDigits: compact ? 0 : meta.fractionDigits,
        maximumFractionDigits: compact ? 1 : meta.fractionDigits,
        notation: compact ? 'compact' : 'standard',
      }),
    );
  }
  return formatterCache.get(key);
}

/** Formats minor units for display, e.g. 350000 → "3.500,00 €". */
export function formatMoney(minor, code = DEFAULT_CURRENCY, { compact = false } = {}) {
  return getFormatter(code, compact).format(toMajor(minor, code));
}

/** Plain decimal string for CSV/PDF exports, e.g. 350000 → "3500.00". */
export function formatMoneyPlain(minor, code = DEFAULT_CURRENCY) {
  return toMajor(minor, code).toFixed(getCurrencyMeta(code).fractionDigits);
}

/** Integer-safe sum of minor-unit amounts. */
export function sumMinor(values) {
  return values.reduce((total, v) => total + (Number(v) || 0), 0);
}
