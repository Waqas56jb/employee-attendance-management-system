import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { Activity, CheckCircle2, Clock, UserX } from 'lucide-react';
import { Card, CardBody, CardHeader } from '../common/Card';
import { Callout } from '../common/Callout';
import { Button } from '../common/Button';
import { Avatar } from '../common/Avatar';
import { Badge } from '../common/Badge';
import { EmptyState } from '../common/EmptyState';
import { elapsedMinutes } from '../../utils/calculations';
import { formatTime, todayKey } from '../../utils/dateUtils';
import { formatDuration, formatNumber, pluralize } from '../../utils/formatters';

const SEGMENTS = [
  { key: 'working', label: 'Working now', bar: 'bg-brand-600' },
  { key: 'finished', label: 'Finished today', bar: 'bg-success' },
  { key: 'absent', label: 'Not checked in', bar: 'bg-line-strong' },
];

function MiniStat({ icon: Icon, label, value, hint, to, tone }) {
  return (
    <Link to={to} className="group rounded-lg border border-line px-3 py-2.5 transition-colors hover:border-line-strong hover:bg-subtle/60">
      <p className="flex items-center gap-1.5 text-xs font-medium text-ink-muted">
        <Icon size={14} aria-hidden className={tone} />
        {label}
      </p>
      <p className="tabular mt-1 text-xl font-semibold text-ink">{value}</p>
      {hint && <p className="truncate text-2xs text-ink-muted">{hint}</p>}
    </Link>
  );
}

/** Today's attendance: live counts, a split meter and the shifts currently running. */
export function AttendanceOverviewChart({ today, now, employeesById, projectsById, customersById }) {
  const day = todayKey();
  const workingIds = new Set(today.working.map((a) => a.employeeId));
  const finishedIds = new Set(today.completed.map((a) => a.employeeId).filter((id) => !workingIds.has(id)));
  const counts = { working: workingIds.size, finished: finishedIds.size, absent: today.notCheckedIn.length };
  const meterTotal = counts.working + counts.finished + counts.absent;
  const running = [...today.working].sort((a, b) => a.checkInAt.localeCompare(b.checkInAt));

  return (
    <Card className="flex flex-col">
      <CardHeader
        icon={Activity}
        title="Attendance today"
        description="Live view of shifts started today. Durations update automatically."
        action={
          <Button variant="ghost" size="xs" to={`/attendance?from=${day}&to=${day}`}>
            Today&apos;s records
          </Button>
        }
      />
      <CardBody className="flex-1 space-y-4">
        {today.missing.length > 0 && (
          <Callout
            tone="warning"
            title={`${pluralize(today.missing.length, 'shift')} missing a check-out`}
            action={
              <Button size="xs" variant="secondary" to="/attendance?status=missing_checkout">
                Review
              </Button>
            }
          >
            These shifts started on an earlier day or exceeded the open-shift alert. Close them with the actual end time.
          </Callout>
        )}

        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <MiniStat icon={Activity} tone="text-brand-700" label="Working now" value={formatNumber(today.working.length)} hint="Open shifts" to="/attendance?status=active" />
          <MiniStat
            icon={CheckCircle2}
            tone="text-success-ink"
            label="Completed today"
            value={formatNumber(today.completed.length)}
            hint="Shifts checked out"
            to={`/attendance?from=${day}&to=${day}&status=completed`}
          />
          <MiniStat
            icon={UserX}
            tone="text-ink-muted"
            label="Not checked in"
            value={formatNumber(today.notCheckedIn.length)}
            hint={`of ${today.scheduledCount} assigned to active projects`}
            to="/employees?status=active"
          />
          <MiniStat icon={Clock} tone="text-info-ink" label="Hours today" value={formatDuration(today.minutes)} hint="Incl. running shifts" to={`/attendance?from=${day}&to=${day}`} />
        </div>

        {meterTotal > 0 && (
          <div>
            <div className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full" role="img" aria-label={SEGMENTS.map((s) => `${s.label}: ${counts[s.key]}`).join(', ')}>
              {SEGMENTS.filter((s) => counts[s.key] > 0).map((s) => (
                <span key={s.key} className={clsx('h-full first:rounded-l-full last:rounded-r-full', s.bar)} style={{ width: `${(counts[s.key] / meterTotal) * 100}%` }} />
              ))}
            </div>
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-secondary">
              {SEGMENTS.map((s) => (
                <li key={s.key} className="flex items-center gap-1.5">
                  <span className={clsx('h-2.5 w-2.5 rounded-sm', s.bar)} aria-hidden />
                  {s.label}
                  <span className="tabular font-semibold text-ink">{counts[s.key]}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">Currently working</h3>
          {running.length === 0 ? (
            <EmptyState compact icon={Activity} title="Nobody is checked in right now" description="Open shifts appear here as soon as employees check in." />
          ) : (
            <ul className="divide-y divide-line rounded-lg border border-line">
              {running.slice(0, 6).map((a) => {
                const employee = employeesById[a.employeeId];
                const project = projectsById[a.projectId];
                return (
                  <li key={a.id}>
                    <Link to={`/attendance/${a.id}`} className="flex items-center gap-3 px-3 py-2.5 hover:bg-subtle/60">
                      <Avatar name={employee?.fullName ?? '?'} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ink">{employee?.fullName ?? 'Unknown employee'}</span>
                        <span className="block truncate text-xs text-ink-muted">
                          {project?.name ?? 'No project'} · {customersById[a.customerId]?.companyName ?? '—'}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <Badge tone="info" dot pulse>
                          <span className="tabular">{formatDuration(elapsedMinutes(a.checkInAt, now))}</span>
                        </Badge>
                        <span className="mt-0.5 block text-2xs text-ink-muted">since {formatTime(a.checkInAt)}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          {running.length > 6 && (
            <Link to="/attendance?status=active" className="mt-2 inline-block text-xs font-medium text-brand-700 hover:underline">
              View all {running.length} open shifts
            </Link>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
