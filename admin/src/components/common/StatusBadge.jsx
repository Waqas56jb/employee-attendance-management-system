import {
  AlertTriangle,
  Archive,
  Ban,
  CalendarClock,
  CheckCircle2,
  CircleDashed,
  CircleDot,
  CirclePause,
  Clock,
  FileCheck2,
  FilePen,
  PencilLine,
  Send,
  XCircle,
} from 'lucide-react';
import { Badge } from './Badge';

/**
 * One place that maps every domain status to a label, tone and icon, so the
 * same state looks identical on every screen. Text is always visible, so
 * status never depends on color alone.
 */
const STATUS_MAP = {
  employee: {
    active: { label: 'Active', tone: 'success', icon: CheckCircle2 },
    inactive: { label: 'Inactive', tone: 'neutral', icon: CirclePause },
    archived: { label: 'Archived', tone: 'neutral', icon: Archive },
  },
  customer: {
    active: { label: 'Active', tone: 'success', icon: CheckCircle2 },
    inactive: { label: 'Inactive', tone: 'neutral', icon: CirclePause },
    archived: { label: 'Archived', tone: 'neutral', icon: Archive },
  },
  project: {
    planned: { label: 'Planned', tone: 'info', icon: CalendarClock },
    active: { label: 'Active', tone: 'success', icon: CircleDot },
    on_hold: { label: 'On hold', tone: 'warning', icon: CirclePause },
    completed: { label: 'Completed', tone: 'brand', icon: CheckCircle2 },
    archived: { label: 'Archived', tone: 'neutral', icon: Archive },
  },
  attendance: {
    active: { label: 'Active', tone: 'info', icon: CircleDot, dot: true },
    completed: { label: 'Completed', tone: 'success', icon: CheckCircle2 },
    needs_review: { label: 'Needs review', tone: 'warning', icon: AlertTriangle },
    corrected: { label: 'Corrected', tone: 'brand', icon: PencilLine },
    cancelled: { label: 'Cancelled', tone: 'neutral', icon: Ban },
    missing_checkout: { label: 'Missing check-out', tone: 'danger', icon: Clock },
  },
  invoice: {
    draft: { label: 'Draft', tone: 'neutral', icon: FilePen },
    finalized: { label: 'Finalized', tone: 'info', icon: FileCheck2 },
    sent: { label: 'Sent', tone: 'info', icon: Send },
    partially_paid: { label: 'Partially paid', tone: 'warning', icon: CircleDashed },
    paid: { label: 'Paid', tone: 'success', icon: CheckCircle2 },
    overdue: { label: 'Overdue', tone: 'danger', icon: AlertTriangle },
    void: { label: 'Void', tone: 'neutral', icon: XCircle },
  },
  rate: {
    active: { label: 'Active', tone: 'success', icon: CheckCircle2 },
    scheduled: { label: 'Scheduled', tone: 'info', icon: CalendarClock },
    expired: { label: 'Expired', tone: 'neutral', icon: Clock },
    inactive: { label: 'Inactive', tone: 'neutral', icon: Ban },
  },
  billing: {
    eligible: { label: 'Billable', tone: 'success', icon: CheckCircle2 },
    billed: { label: 'Billed', tone: 'brand', icon: FileCheck2 },
    in_draft: { label: 'In draft', tone: 'info', icon: FilePen },
    excluded: { label: 'Excluded', tone: 'neutral', icon: Ban },
    needs_review: { label: 'Needs review', tone: 'warning', icon: AlertTriangle },
    active: { label: 'Shift open', tone: 'info', icon: CircleDot },
    cancelled: { label: 'Cancelled', tone: 'neutral', icon: Ban },
    invalid: { label: 'Invalid', tone: 'danger', icon: XCircle },
    no_rate: { label: 'No rate', tone: 'danger', icon: AlertTriangle },
  },
  notification: {
    unread: { label: 'Unread', tone: 'brand' },
    read: { label: 'Read', tone: 'neutral' },
  },
};

export function getStatusMeta(kind, status) {
  return STATUS_MAP[kind]?.[status] ?? { label: status ? String(status).replace(/_/g, ' ') : 'Unknown', tone: 'neutral' };
}

export function statusOptions(kind) {
  return Object.entries(STATUS_MAP[kind] ?? {}).map(([value, meta]) => ({ value, label: meta.label }));
}

export function StatusBadge({ kind, status, label, showIcon = true, className, title }) {
  const meta = getStatusMeta(kind, status);
  return (
    <Badge tone={meta.tone} icon={showIcon && !meta.dot ? meta.icon : undefined} dot={meta.dot} pulse={meta.dot} className={className} title={title}>
      {label ?? meta.label}
    </Badge>
  );
}
