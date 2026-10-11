import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays } from 'lucide-react';
import { useAssignments } from '../../hooks/useAssignments';
import { useAttendance } from '../../hooks/useAttendance';
import { useFormatters } from '../../hooks/useFormatters';
import { useNow } from '../../hooks/useNow';
import { getRecordMinutes } from '../../utils/dateUtils';
import { formatDayLabel, formatDuration } from '../../utils/formatters';
import { Card, CardHeader } from '../common/Card';
import { EmptyState } from '../common/EmptyState';
import { Skeleton } from '../common/LoadingSpinner';
import { StatusBadge } from '../common/StatusBadge';

export function RecentActivity({ limit = 5 }) {
  const { records, activeShift, isLoading } = useAttendance();
  const { projectsById, customersById } = useAssignments();
  const fmt = useFormatters();
  const now = useNow(30_000, Boolean(activeShift));
  const recent = records.slice(0, limit);

  return (
    <Card padded={false}>
      <div className="p-5 pb-0 sm:p-6 sm:pb-0">
        <CardHeader
          title="Recent attendance"
          description="Your latest recorded shifts"
          action={
            <Link to="/attendance" className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline">
              View all <ArrowRight size={14} aria-hidden="true" />
            </Link>
          }
        />
      </div>
      {isLoading ? (
        <div className="space-y-3 p-5 pt-0 sm:p-6 sm:pt-0">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : !recent.length ? (
        <EmptyState compact icon={CalendarDays} title="No attendance yet" description="Your shifts will appear here after you check in." />
      ) : (
        <ul className="divide-y divide-line border-t border-line">
          {recent.map((record) => (
            <li key={record.id} className="flex items-center gap-4 px-5 py-3.5 sm:px-6">
              <div className="w-16 shrink-0">
                <p className="text-xs font-semibold text-ink">{formatDayLabel(record.checkInAt)}</p>
                <p className="tabular text-xs text-ink-muted">{fmt.time(record.checkInAt)}</p>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{projectsById[record.projectId]?.name ?? 'Unknown project'}</p>
                <p className="truncate text-xs text-ink-muted">{customersById[record.customerId]?.companyName}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="tabular text-sm font-semibold text-ink">{formatDuration(getRecordMinutes(record, now))}</span>
                <StatusBadge status={record.status} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default RecentActivity;
