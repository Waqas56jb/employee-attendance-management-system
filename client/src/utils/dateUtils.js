import {
  addDays,
  differenceInMinutes,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isValid,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from 'date-fns';

/*
 * Working-time rules used everywhere in the app:
 *  - Integer minutes are the primary duration unit.
 *  - A shift belongs to the local calendar day on which it STARTED. A shift
 *    that crosses midnight is therefore counted once, on its check-in day,
 *    which avoids double-counting.
 *  - Completed shifts use their stored durationMinutes (derived from the
 *    original timestamps at check-out). Active shifts are measured live from
 *    the stored check-in timestamp and are reported separately.
 */

export const ATTENDANCE_STATUS = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  APPROVED: 'approved',
};

export const isFinished = (record) =>
  record?.status === ATTENDANCE_STATUS.COMPLETED || record?.status === ATTENDANCE_STATUS.APPROVED;

/** Parses an ISO string, timestamp or Date. Returns null for anything invalid. */
export function toDate(value) {
  if (value == null || value === '') return null;
  const date = value instanceof Date ? value : typeof value === 'string' ? parseISO(value) : new Date(value);
  return isValid(date) ? date : null;
}

/** Whole minutes between two instants. Never negative. */
export function minutesBetween(start, end) {
  const a = toDate(start);
  const b = toDate(end);
  if (!a || !b) return 0;
  return Math.max(0, differenceInMinutes(b, a));
}

/** Duration of a record in minutes. Active shifts are measured up to `now`. */
export function getRecordMinutes(record, now = new Date()) {
  if (!record) return 0;
  if (record.status === ATTENDANCE_STATUS.ACTIVE) return minutesBetween(record.checkInAt, now);
  if (Number.isFinite(record.durationMinutes)) return Math.max(0, Math.round(record.durationMinutes));
  return minutesBetween(record.checkInAt, record.checkOutAt);
}

/** Milliseconds elapsed since a timestamp (for the live HH:MM:SS timer). */
export function elapsedMs(from, now = new Date()) {
  const start = toDate(from);
  if (!start) return 0;
  return Math.max(0, now.getTime() - start.getTime());
}

export const PERIOD_PRESETS = [
  { value: 'this-week', label: 'This week' },
  { value: 'last-week', label: 'Last week' },
  { value: 'this-month', label: 'This month' },
  { value: 'last-month', label: 'Last month' },
  { value: 'all', label: 'All time' },
  { value: 'custom', label: 'Custom range' },
];

/**
 * Returns an inclusive { start, end } range for a preset, or null for "all".
 * `weekStartsOn` follows date-fns (0 = Sunday, 1 = Monday).
 */
export function getPeriodRange(preset, now = new Date(), weekStartsOn = 1, custom = {}) {
  switch (preset) {
    case 'today':
      return { start: startOfDay(now), end: endOfDay(now) };
    case 'this-week':
      return { start: startOfWeek(now, { weekStartsOn }), end: endOfWeek(now, { weekStartsOn }) };
    case 'last-week': {
      const ref = subWeeks(now, 1);
      return { start: startOfWeek(ref, { weekStartsOn }), end: endOfWeek(ref, { weekStartsOn }) };
    }
    case 'this-month':
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case 'last-month': {
      const ref = subMonths(now, 1);
      return { start: startOfMonth(ref), end: endOfMonth(ref) };
    }
    case 'custom': {
      const from = fromDateInputValue(custom.from);
      const to = fromDateInputValue(custom.to);
      if (!from && !to) return null;
      return {
        start: from ? startOfDay(from) : new Date(0),
        end: to ? endOfDay(to) : endOfDay(now),
      };
    }
    default:
      return null;
  }
}

export function isInRange(value, range) {
  if (!range) return true;
  const date = toDate(value);
  if (!date) return false;
  return date >= range.start && date <= range.end;
}

/** Sum of finished-shift minutes whose check-in falls inside the range. */
export function sumCompletedMinutes(records, range = null) {
  return records.reduce(
    (total, r) => (isFinished(r) && isInRange(r.checkInAt, range) ? total + getRecordMinutes(r) : total),
    0,
  );
}

/** Live minutes of an active shift if it started inside the range, else 0. */
export function activeMinutesInRange(activeShift, range, now = new Date()) {
  if (!activeShift || !isInRange(activeShift.checkInAt, range)) return 0;
  return getRecordMinutes(activeShift, now);
}

/** Number of distinct local days with at least one finished shift. */
export function countWorkingDays(records) {
  const days = new Set();
  records.forEach((r) => {
    const date = toDate(r.checkInAt);
    if (isFinished(r) && date) days.add(dayKey(date));
  });
  return days.size;
}

export function averageMinutesPerWorkingDay(records) {
  const finished = records.filter(isFinished);
  const days = countWorkingDays(finished);
  if (!days) return 0;
  return Math.round(sumCompletedMinutes(finished) / days);
}

/** Minutes per key, e.g. by projectId or customerId (finished shifts only). */
export function minutesBy(records, key) {
  return records.reduce((acc, r) => {
    if (!isFinished(r)) return acc;
    const k = r[key];
    acc[k] = (acc[k] || 0) + getRecordMinutes(r);
    return acc;
  }, {});
}

export const dayKey = (date) => format(date, 'yyyy-MM-dd');

/**
 * Builds a per-day series for a week, used by the weekly chart.
 * Active-shift minutes are reported in their own field.
 */
export function buildWeekSeries(records, activeShift, now = new Date(), weekStartsOn = 1) {
  const start = startOfWeek(now, { weekStartsOn });
  const byDay = {};
  records.forEach((r) => {
    const date = toDate(r.checkInAt);
    if (isFinished(r) && date) {
      const k = dayKey(date);
      byDay[k] = (byDay[k] || 0) + getRecordMinutes(r);
    }
  });
  const activeDay = activeShift ? dayKey(toDate(activeShift.checkInAt) ?? now) : null;
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(start, i);
    const k = dayKey(date);
    return {
      key: k,
      date,
      label: format(date, 'EEE'),
      completedMinutes: byDay[k] || 0,
      activeMinutes: k === activeDay ? getRecordMinutes(activeShift, now) : 0,
      isToday: k === dayKey(now),
      isFuture: date > now,
    };
  });
}

export function getGreeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 5) return 'Good evening';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/** `yyyy-MM-dd` for <input type="date">. */
export function toDateInputValue(date) {
  const d = toDate(date);
  return d ? format(d, 'yyyy-MM-dd') : '';
}

export function fromDateInputValue(value) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return isValid(date) ? date : null;
}
