import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { PieChart } from 'lucide-react';
import { useAssignments } from '../../hooks/useAssignments';
import { isFinished } from '../../utils/dateUtils';
import { formatDuration, formatHoursDecimal } from '../../utils/formatters';
import { Card, CardHeader } from '../common/Card';
import { EmptyState } from '../common/EmptyState';

/**
 * Ranked horizontal bars of finished hours per project for a set of records.
 * A single series in one hue; each bar is labeled with its project and value.
 */
export function AttendanceChart({ records, title = 'Hours by project', description, limit = 6 }) {
  const { projectsById, customersById } = useAssignments();

  const rows = useMemo(() => {
    const totals = {};
    records.forEach((r) => {
      if (!isFinished(r)) return;
      totals[r.projectId] = (totals[r.projectId] || 0) + (r.durationMinutes ?? 0);
    });
    return Object.entries(totals)
      .map(([projectId, minutes]) => ({ projectId, minutes, project: projectsById[projectId] }))
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, limit);
  }, [records, projectsById, limit]);

  const max = rows[0]?.minutes || 1;

  return (
    <Card>
      <CardHeader title={title} description={description} />
      {!rows.length ? (
        <EmptyState compact icon={PieChart} title="No completed shifts" description="Completed hours will appear here by project." />
      ) : (
        <ul className="space-y-4" aria-label={title}>
          {rows.map(({ projectId, minutes, project }) => (
            <li key={projectId}>
              <div className="mb-1.5 flex items-baseline justify-between gap-3">
                <div className="min-w-0">
                  <Link to={`/projects/${projectId}`} className="block truncate text-sm font-medium text-ink hover:text-brand-700 hover:underline">
                    {project?.name ?? 'Unknown project'}
                  </Link>
                  <p className="truncate text-xs text-ink-muted">{customersById[project?.customerId]?.companyName}</p>
                </div>
                <span className="tabular shrink-0 text-sm font-semibold text-ink" title={`${formatHoursDecimal(minutes)} hours`}>
                  {formatDuration(minutes)}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-subtle" aria-hidden="true">
                <div className="h-full rounded-full bg-brand-600 transition-[width] duration-500" style={{ width: `${(minutes / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default AttendanceChart;
