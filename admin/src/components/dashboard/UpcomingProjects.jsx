import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { Briefcase, Users } from 'lucide-react';
import { Card, CardHeader } from '../common/Card';
import { Button } from '../common/Button';
import { EmptyState } from '../common/EmptyState';
import { StatusBadge } from '../common/StatusBadge';
import { sumRecorded } from '../../services/reportService';
import { formatDate } from '../../utils/dateUtils';
import { formatNumber } from '../../utils/formatters';

const ORDER = { active: 0, planned: 1 };

/** Active and planned projects with team size and progress against target hours. */
export function UpcomingProjects({ projects, attendance, customersById, limit = 6 }) {
  const rows = useMemo(() => {
    const minutesByProject = {};
    attendance.forEach((a) => {
      (minutesByProject[a.projectId] = minutesByProject[a.projectId] ?? []).push(a);
    });
    return projects
      .filter((p) => p.status === 'active' || p.status === 'planned')
      .sort((a, b) => ORDER[a.status] - ORDER[b.status] || (a.startDate ?? '').localeCompare(b.startDate ?? ''))
      .map((p) => ({ ...p, recordedMinutes: sumRecorded(minutesByProject[p.id] ?? []) }));
  }, [projects, attendance]);

  const visible = rows.slice(0, limit);

  return (
    <Card>
      <CardHeader
        icon={Briefcase}
        title="Active & upcoming projects"
        description={`${rows.length} active or planned`}
        action={
          <Button variant="ghost" size="xs" to="/projects?status=active">
            All projects
          </Button>
        }
      />
      {visible.length === 0 ? (
        <EmptyState compact icon={Briefcase} title="No active or planned projects" action={<Button size="sm" to="/projects/new">Create project</Button>} />
      ) : (
        <ul className="divide-y divide-line">
          {visible.map((p) => {
            const hours = p.recordedMinutes / 60;
            const pct = p.targetHours ? Math.min(100, Math.round((hours / p.targetHours) * 100)) : null;
            const over = p.targetHours && hours > p.targetHours;
            return (
              <li key={p.id}>
                <Link to={`/projects/${p.id}`} className="block px-5 py-3 hover:bg-subtle/60">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{p.name}</p>
                      <p className="truncate text-xs text-ink-muted">
                        {customersById[p.customerId]?.companyName ?? '—'} · {formatDate(p.startDate)} – {p.endDate ? formatDate(p.endDate) : 'open-ended'}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="flex items-center gap-1 text-xs text-ink-secondary" title="Team size">
                        <Users size={13} aria-hidden />
                        <span className="tabular">{p.assignedEmployeeIds.length}</span>
                        <span className="sr-only">assigned employees</span>
                      </span>
                      <StatusBadge kind="project" status={p.status} />
                    </div>
                  </div>
                  {pct !== null ? (
                    <div className="mt-2 flex items-center gap-3">
                      <div
                        className="h-1.5 flex-1 overflow-hidden rounded-full bg-subtle"
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={pct}
                        aria-label={`${p.name} progress against target hours`}
                      >
                        <div className={clsx('h-full rounded-full', over ? 'bg-warning' : 'bg-brand-600')} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="tabular shrink-0 text-2xs text-ink-muted">
                        {formatNumber(hours, 1)} / {formatNumber(p.targetHours)} h{over ? ' · over target' : ''}
                      </span>
                    </div>
                  ) : (
                    <p className="tabular mt-1 text-2xs text-ink-muted">{formatNumber(hours, 1)} h recorded · no target set</p>
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
