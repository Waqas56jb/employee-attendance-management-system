import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { formatDistanceToNow } from 'date-fns';
import { LogIn, LogOut, History } from 'lucide-react';
import { Card, CardHeader } from '../common/Card';
import { Button } from '../common/Button';
import { EmptyState } from '../common/EmptyState';
import { ATTENDANCE_STATUS } from '../../utils/calculations';
import { formatDateTime } from '../../utils/dateUtils';
import { formatDuration } from '../../utils/formatters';

/** Latest check-in / check-out events across all employees. */
export function RecentAttendance({ attendance, employeesById, projectsById, now, limit = 8 }) {
  const events = useMemo(() => {
    const list = [];
    attendance.forEach((a) => {
      if (a.status === ATTENDANCE_STATUS.CANCELLED) return;
      list.push({ id: `${a.id}-in`, record: a, type: 'in', at: a.checkInAt });
      if (a.checkOutAt) list.push({ id: `${a.id}-out`, record: a, type: 'out', at: a.checkOutAt });
    });
    return list
      .filter((e) => e.at <= now.toISOString())
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, limit);
  }, [attendance, now, limit]);

  return (
    <Card className="flex flex-col">
      <CardHeader
        icon={History}
        title="Check-in activity"
        description="Latest check-ins and check-outs"
        action={
          <Button variant="ghost" size="xs" to="/attendance">
            All
          </Button>
        }
      />
      {events.length === 0 ? (
        <EmptyState compact icon={History} title="No attendance yet" description="Check-ins from the employee app will appear here." />
      ) : (
        <ul className="divide-y divide-line">
          {events.map((e) => {
            const name = employeesById[e.record.employeeId]?.fullName ?? 'Unknown employee';
            const isIn = e.type === 'in';
            return (
              <li key={e.id}>
                <Link to={`/attendance/${e.record.id}`} className="flex items-start gap-3 px-5 py-2.5 hover:bg-subtle/60">
                  <span
                    className={clsx(
                      'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
                      isIn ? 'bg-info-soft text-info-ink' : 'bg-success-soft text-success-ink',
                    )}
                    aria-hidden
                  >
                    {isIn ? <LogIn size={14} /> : <LogOut size={14} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-ink">
                      <span className="font-medium">{name}</span> {isIn ? 'checked in' : 'checked out'}
                    </span>
                    <span className="block truncate text-xs text-ink-muted">
                      {projectsById[e.record.projectId]?.name ?? 'No project'}
                      {!isIn && e.record.recordedDurationMinutes ? ` · ${formatDuration(e.record.recordedDurationMinutes)}` : ''}
                    </span>
                  </span>
                  <time dateTime={e.at} title={formatDateTime(e.at)} className="shrink-0 text-2xs text-ink-muted">
                    {formatDistanceToNow(new Date(e.at), { addSuffix: true })}
                  </time>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
