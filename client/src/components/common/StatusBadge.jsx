import { Badge } from './Badge';

export const ATTENDANCE_STATUS_META = {
  active: { label: 'In progress', tone: 'brand', description: 'Shift is running; duration not final yet.' },
  completed: { label: 'Submitted', tone: 'info', description: 'Completed and awaiting supervisor review.' },
  approved: { label: 'Approved', tone: 'success', description: 'Reviewed and approved by your supervisor.' },
};

/** Attendance record status. */
export function StatusBadge({ status, className }) {
  const meta = ATTENDANCE_STATUS_META[status] ?? { label: status ?? 'Unknown', tone: 'neutral' };
  return (
    <Badge tone={meta.tone} dot pulse={status === 'active'} className={className}>
      <span title={meta.description}>{meta.label}</span>
    </Badge>
  );
}

export default StatusBadge;
