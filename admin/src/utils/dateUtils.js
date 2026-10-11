import {
  addDays,
  differenceInMinutes,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isValid,
  isWithinInterval,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from 'date-fns';

/**
 * Date conventions
 * ----------------
 * - Timestamps (check-in/out, createdAt) are full ISO strings.
 * - Calendar dates (issue date, billing period, effective dates) are
 *   "yyyy-MM-dd" strings interpreted in the browser's local time zone.
 * - Weeks start on Monday (European business convention).
 */

export const WEEK_OPTIONS = { weekStartsOn: 1 };

export function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return isValid(value) ? value : null;
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : null;
}

/** "yyyy-MM-dd" for a Date or ISO string. */
export function toDateKey(value) {
  const date = toDate(value);
  return date ? format(date, 'yyyy-MM-dd') : '';
}

export function todayKey() {
  return toDateKey(new Date());
}

export function nowIso() {
  return new Date().toISOString();
}

export function formatDate(value, pattern = 'dd MMM yyyy') {
  const date = toDate(value);
  return date ? format(date, pattern) : '—';
}

export function formatDateTime(value) {
  return formatDate(value, 'dd MMM yyyy, HH:mm');
}

export function formatTime(value) {
  return formatDate(value, 'HH:mm');
}

/** Value for <input type="datetime-local">. */
export function toDateTimeInput(value) {
  const date = toDate(value);
  return date ? format(date, "yyyy-MM-dd'T'HH:mm") : '';
}

/** Parses a datetime-local input value into an ISO string (local time). */
export function fromDateTimeInput(value) {
  if (!value) return null;
  const date = new Date(value);
  return isValid(date) ? date.toISOString() : null;
}

export function minutesBetween(start, end) {
  const a = toDate(start);
  const b = toDate(end);
  if (!a || !b) return null;
  return differenceInMinutes(b, a);
}

/** Is an ISO timestamp / date key inside an inclusive [from, to] date-key range? Empty bounds are open. */
export function isInDateRange(value, from, to) {
  const date = toDate(value);
  if (!date) return false;
  const start = from ? startOfDay(toDate(from)) : new Date(-8640000000000000);
  const end = to ? endOfDay(toDate(to)) : new Date(8640000000000000);
  return isWithinInterval(date, { start, end });
}

export function addDaysKey(dateKey, days) {
  return toDateKey(addDays(toDate(dateKey), days));
}

/** Preset billing/reporting periods, returned as { from, to } date keys. */
export function getPresetRange(preset, reference = new Date()) {
  switch (preset) {
    case 'today':
      return { from: toDateKey(reference), to: toDateKey(reference) };
    case 'this_week':
      return {
        from: toDateKey(startOfWeek(reference, WEEK_OPTIONS)),
        to: toDateKey(endOfWeek(reference, WEEK_OPTIONS)),
      };
    case 'last_week': {
      const ref = subWeeks(reference, 1);
      return {
        from: toDateKey(startOfWeek(ref, WEEK_OPTIONS)),
        to: toDateKey(endOfWeek(ref, WEEK_OPTIONS)),
      };
    }
    case 'this_month':
      return { from: toDateKey(startOfMonth(reference)), to: toDateKey(endOfMonth(reference)) };
    case 'last_month': {
      const ref = subMonths(reference, 1);
      return { from: toDateKey(startOfMonth(ref)), to: toDateKey(endOfMonth(ref)) };
    }
    case 'last_30_days':
      return { from: toDateKey(addDays(reference, -29)), to: toDateKey(reference) };
    case 'last_90_days':
      return { from: toDateKey(addDays(reference, -89)), to: toDateKey(reference) };
    case 'this_year':
      return { from: `${reference.getFullYear()}-01-01`, to: `${reference.getFullYear()}-12-31` };
    default:
      return { from: '', to: '' };
  }
}

export const PERIOD_PRESETS = [
  { value: 'this_week', label: 'This week' },
  { value: 'last_week', label: 'Last week' },
  { value: 'this_month', label: 'This month' },
  { value: 'last_month', label: 'Last month' },
  { value: 'last_30_days', label: 'Last 30 days' },
  { value: 'last_90_days', label: 'Last 90 days' },
  { value: 'this_year', label: 'This year' },
];

/** Identifies which preset (if any) matches a range, for highlighting quick-select chips. */
export function matchPreset(range, presets = PERIOD_PRESETS) {
  const hit = presets.find((p) => {
    const r = getPresetRange(p.value);
    return r.from === range.from && r.to === range.to;
  });
  return hit ? hit.value : 'custom';
}

export function formatPeriod(from, to) {
  if (!from && !to) return 'All time';
  if (from && to && from === to) return formatDate(from);
  return `${from ? formatDate(from) : '…'} – ${to ? formatDate(to) : '…'}`;
}

export function greetingForHour(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}
