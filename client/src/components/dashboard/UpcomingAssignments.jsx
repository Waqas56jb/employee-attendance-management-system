import { Link } from 'react-router-dom';
import { ArrowRight, FolderKanban } from 'lucide-react';
import { useAssignments } from '../../hooks/useAssignments';
import { useAttendanceSummary } from '../../hooks/useAttendance';
import { formatDuration } from '../../utils/formatters';
import { Card, CardHeader } from '../common/Card';
import { EmptyState } from '../common/EmptyState';
import { Skeleton } from '../common/LoadingSpinner';
import { ProjectStatusBadge } from '../projects/ProjectStatusBadge';

const ORDER = { active: 0, upcoming: 1, 'on-hold': 2, completed: 3 };

/** Assigned projects (active and upcoming first) with recorded vs scheduled hours. */
export function UpcomingAssignments({ limit = 4 }) {
  const { projects, isLoading } = useAssignments();
  const { minutesByProject } = useAttendanceSummary();
  const list = [...projects]
    .filter((p) => p.status !== 'completed')
    .sort((a, b) => ORDER[a.status] - ORDER[b.status] || a.name.localeCompare(b.name))
    .slice(0, limit);

  return (
    <Card padded={false}>
      <div className="p-5 pb-0 sm:p-6 sm:pb-0">
        <CardHeader
          title="Assigned projects"
          description="Active and upcoming work"
          action={
            <Link to="/projects" className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline">
              All projects <ArrowRight size={14} aria-hidden="true" />
            </Link>
          }
        />
      </div>
      {isLoading ? (
        <div className="space-y-3 p-5 pt-0 sm:p-6 sm:pt-0">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : !list.length ? (
        <EmptyState compact icon={FolderKanban} title="No current assignments" description="New project assignments will appear here." />
      ) : (
        <ul className="divide-y divide-line border-t border-line">
          {list.map((project) => {
            const recorded = minutesByProject[project.id] || 0;
            const scheduled = (project.assignment?.scheduledHours || 0) * 60;
            const pct = scheduled ? Math.min(100, Math.round((recorded / scheduled) * 100)) : null;
            return (
              <li key={project.id}>
                <Link to={`/projects/${project.id}`} className="block px-5 py-3.5 transition-colors hover:bg-canvas sm:px-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{project.name}</p>
                      <p className="truncate text-xs text-ink-muted">{project.customerName}</p>
                    </div>
                    <ProjectStatusBadge status={project.status} />
                  </div>
                  {pct !== null && (
                    <div className="mt-2.5 flex items-center gap-3">
                      <div
                        className="h-1.5 flex-1 overflow-hidden rounded-full bg-subtle"
                        role="progressbar"
                        aria-valuenow={pct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${project.name}: ${pct}% of scheduled hours recorded`}
                      >
                        <div className="h-full rounded-full bg-brand-600" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="tabular shrink-0 text-xs text-ink-muted">
                        {formatDuration(recorded)} / {project.assignment.scheduledHours}h
                      </span>
                    </div>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

export default UpcomingAssignments;
