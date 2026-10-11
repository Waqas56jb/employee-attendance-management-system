/** Display helpers. They never feed back into calculations. */

/** 445 → "7h 25m" */
export function formatDuration(minutes) {
  if (minutes === null || minutes === undefined || Number.isNaN(minutes)) return '—';
  const sign = minutes < 0 ? '-' : '';
  const abs = Math.abs(Math.round(minutes));
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (h === 0) return `${sign}${m}m`;
  return `${sign}${h}h ${String(m).padStart(2, '0')}m`;
}

/** 445 → "7.42" (decimal hours, two places) */
export function formatHours(minutes, { suffix = false } = {}) {
  if (minutes === null || minutes === undefined) return '—';
  const value = (Math.round((minutes * 100) / 60) / 100).toFixed(2);
  return suffix ? `${value} h` : value;
}

/** Decimal hours number → "7.42 h" */
export function formatHoursValue(hours, { suffix = true } = {}) {
  const value = (Number(hours) || 0).toFixed(2);
  return suffix ? `${value} h` : value;
}

export function formatNumber(value, digits = 0) {
  return new Intl.NumberFormat('en-GB', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number(value) || 0);
}

export function formatPercent(value, digits = 0) {
  return `${formatNumber(value, digits)}%`;
}

export function initials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export function pluralize(count, singular, plural = `${singular}s`) {
  return `${formatNumber(count)} ${count === 1 ? singular : plural}`;
}

export function titleCase(value = '') {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\w\S*/g, (word) => word[0].toUpperCase() + word.slice(1).toLowerCase());
}

export function joinAddress(address) {
  if (!address) return '';
  if (typeof address === 'string') return address;
  return [address.street, [address.postalCode, address.city].filter(Boolean).join(' '), address.country]
    .filter(Boolean)
    .join(', ');
}

export function truncate(value = '', length = 80) {
  return value.length > length ? `${value.slice(0, length - 1)}…` : value;
}
