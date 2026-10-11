import { useAttendance, useAttendanceSummary } from '../../hooks/useAttendance';
import { formatDuration } from '../../utils/formatters';
import { Skeleton } from '../common/LoadingSpinner';

/** Today / this week / this month totals, with in-progress time shown separately. */
export function HoursSummary() {
  const { isLoading } = useAttendance();
  const summary = useAttendanceSummary();

  const rows = [
    { label: 'Today', data: summary.today },
    { label: 'This week', data: summary.week },
    { label: 'This month', data: summary.month },
  ];

  return (
    <dl className="divide-y divide-line">
      {rows.map(({ label, data }) => (
        <div key={label} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
          <dt className="text-sm text-ink-secondary">{label}</dt>
          <dd className="text-right">
            {isLoading ? (
              <Skeleton className="h-5 w-16" />
            ) : (
              <>
                <span className="tabular text-sm font-semibold text-ink">{formatDuration(data.completed)}</span>
                {data.active > 0 && (
                  <span className="tabular block text-xs text-success-ink">+{formatDuration(data.active)} in progress</span>
                )}
              </>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export default HoursSummary;
