import { format, formatDistanceToNowStrict, isToday, isYesterday } from 'date-fns';
import { toDate } from './dateUtils';

export const DATE_FORMATS = {
  medium: { label: 'Oct 12, 2026', pattern: 'MMM d, yyyy' },
  us: { label: '10/12/2026', pattern: 'MM/dd/yyyy' },
  eu: { label: '12/10/2026', pattern: 'dd/MM/yyyy' },
  iso: { label: '2026-10-12', pattern: 'yyyy-MM-dd' },
};

export const CLOCK_FORMATS = {
  '12h': { label: '12-hour (2:30 PM)', pattern: 'h:mm a', withSeconds: 'h:mm:ss a' },
  '24h': { label: '24-hour (14:30)', pattern: 'HH:mm', withSeconds: 'HH:mm:ss' },
};

/** 465 -> "7h 45m", 45 -> "45m", 0 -> "0m". */
export function formatDuration(minutes) {
  const total = Math.max(0, Math.round(Number(minutes) || 0));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (!h) return `${m}m`;
  if (!m) return `${h}h`;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

/** 465 -> "7.8" (one decimal, for compact metrics and charts). */
export function formatHoursDecimal(minutes, digits = 1) {
  return (Math.max(0, Number(minutes) || 0) / 60).toFixed(digits);
}

/** Milliseconds -> "02:05:09" for live timers. */
export function formatElapsed(ms) {
  const totalSeconds = Math.max(0, Math.floor((Number(ms) || 0) / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

export function formatTime(value, clock = '12h', withSeconds = false) {
  const date = toDate(value);
  if (!date) return '—';
  const cfg = CLOCK_FORMATS[clock] ?? CLOCK_FORMATS['12h'];
  return format(date, withSeconds ? cfg.withSeconds : cfg.pattern);
}

export function formatDate(value, dateFormat = 'medium') {
  const date = toDate(value);
  if (!date) return '—';
  return format(date, (DATE_FORMATS[dateFormat] ?? DATE_FORMATS.medium).pattern);
}

/** "Monday, October 12" */
export function formatLongDate(value) {
  const date = toDate(value);
  return date ? format(date, 'EEEE, MMMM d') : '—';
}

/** "Today", "Yesterday" or "Mon, Oct 5" */
export function formatDayLabel(value) {
  const date = toDate(value);
  if (!date) return '—';
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'EEE, MMM d');
}

export function formatRelative(value, now = new Date()) {
  const date = toDate(value);
  if (!date) return '—';
  if (Math.abs(now.getTime() - date.getTime()) < 60_000) return 'Just now';
  return formatDistanceToNowStrict(date, { addSuffix: true });
}

export function formatCoordinates(location) {
  if (!location || !Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)) return null;
  return `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`;
}

export function phoneHref(phone) {
  return phone ? `tel:${phone.replace(/[^\d+]/g, '')}` : undefined;
}

export function getInitials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return `${first}${last}`.toUpperCase();
}

export function firstName(name = '') {
  return name.trim().split(/\s+/)[0] || '';
}

export function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}
