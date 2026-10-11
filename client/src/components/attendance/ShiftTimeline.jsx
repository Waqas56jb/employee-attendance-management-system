import { Link } from 'react-router-dom';
import { useAssignments } from '../../hooks/useAssignments';
import { useFormatters } from '../../hooks/useFormatters';
import { cn } from '../../utils/cn';
import { getRecordMinutes } from '../../utils/dateUtils';
import { formatDuration } from '../../utils/formatters';
import { StatusBadge } from '../common/StatusBadge';

/** Vertical timeline of shifts (e.g. today's sessions). */
export function ShiftTimeline({ records, now = new Date() }) {
  const { projectsById, customersById } = useAssignments();
  const fmt = useFormatters();

  return (
    <ol className="relative space-y-1">
      {records.map((record, index) => {
        const active = record.status === 'active';
        const project = projectsById[record.projectId];
        const customer = customersById[record.customerId];
        return (
          <li key={record.id} className="relative flex gap-4 pb-4 last:pb-0">
            {index < records.length - 1 && (
              <span className="absolute left-[7px] top-5 h-full w-px bg-line" aria-hidden="true" />
            )}
            <span
              className={cn(
                'relative mt-1.5 h-[15px] w-[15px] shrink-0 rounded-full border-[3px] border-surface ring-1',
                active ? 'bg-success ring-success/40' : 'bg-brand-500 ring-brand-200',
              )}
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <p className="tabular text-sm font-medium text-ink">
                  {fmt.time(record.checkInAt)} – {active ? 'now' : fmt.time(record.checkOutAt)}
                </p>
                <div className="flex items-center gap-2">
                  <span className="tabular text-sm font-semibold text-ink">{formatDuration(getRecordMinutes(record, now))}</span>
                  <StatusBadge status={record.status} />
                </div>
              </div>
              <p className="mt-0.5 truncate text-sm text-ink-secondary">
                {project ? (
                  <Link to={`/projects/${project.id}`} className="hover:text-brand-700 hover:underline">
                    {project.name}
                  </Link>
                ) : (
                  'Unknown project'
                )}
                <span className="text-ink-muted"> · {customer?.companyName ?? 'Unknown customer'}</span>
              </p>
              {(record.checkOutNote || record.checkInNote) && (
                <p className="mt-1 line-clamp-2 text-xs text-ink-muted">{record.checkOutNote || record.checkInNote}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export default ShiftTimeline;
