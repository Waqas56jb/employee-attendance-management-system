import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CircleDot, LogOut } from 'lucide-react';
import { Card, CardHeader } from '../common/Card';
import { Avatar } from '../common/Avatar';
import { Button } from '../common/Button';
import { StatusBadge } from '../common/StatusBadge';
import { EmptyState } from '../common/EmptyState';
import { useLookups } from '../../hooks/useLookups';
import { elapsedMinutes, isMissingCheckout, isShiftOpen } from '../../utils/calculations';
import { formatDateTime, formatTime, toDateKey } from '../../utils/dateUtils';
import { formatDuration } from '../../utils/formatters';
import { CloseShiftDialog } from './CloseShiftDialog';
import { useAttendanceRules } from './attendanceHelpers';

/** Employees currently checked in, with live elapsed time. */
export function ActiveShiftsPanel({ records }) {
  const rules = useAttendanceRules(30000);
  const { now } = rules;
  const { employeesById, customersById, projectsById } = useLookups();
  const [closing, setClosing] = useState(null);

  const open = useMemo(
    () =>
      records
        .filter(isShiftOpen)
        .map((r) => ({ record: r, missing: isMissingCheckout(r, rules) }))
        .sort((a, b) => Number(b.missing) - Number(a.missing) || a.record.checkInAt.localeCompare(b.record.checkInAt)),
    [records, rules],
  );

  return (
    <Card>
      <CardHeader
        icon={CircleDot}
        title="Active shifts"
        description={open.length ? `${open.length} open ${open.length === 1 ? 'shift' : 'shifts'} · elapsed time updates live` : 'Nobody is checked in right now'}
      />
      {open.length === 0 ? (
        <EmptyState compact title="No open shifts" description="Employees appear here as soon as they check in from the employee app." />
      ) : (
        <ul className="divide-y divide-line">
          {open.map(({ record, missing }) => {
            const employee = employeesById[record.employeeId];
            const sameDay = toDateKey(record.checkInAt) === toDateKey(now);
            return (
              <li key={record.id} className="flex flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <Avatar name={employee?.fullName} size="sm" />
                  <div className="min-w-0">
                    <Link to={`/attendance/${record.id}`} className="font-medium text-ink hover:text-brand-700 hover:underline">
                      {employee?.fullName ?? 'Unknown employee'}
                    </Link>
                    <p className="truncate text-xs text-ink-muted">
                      {customersById[record.customerId]?.companyName ?? '—'} · {projectsById[record.projectId]?.name ?? '—'}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-secondary">
                      Checked in {sameDay ? `at ${formatTime(record.checkInAt)}` : formatDateTime(record.checkInAt)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                  <div className="text-right">
                    <p className="tabular text-sm font-semibold text-ink" aria-label="Elapsed time">
                      {formatDuration(elapsedMinutes(record.checkInAt, now))}
                    </p>
                    <p className="text-2xs text-ink-muted">elapsed</p>
                  </div>
                  <StatusBadge kind="attendance" status={missing ? 'missing_checkout' : 'active'} />
                  <Button size="sm" variant={missing ? 'primary' : 'secondary'} icon={LogOut} onClick={() => setClosing(record)}>
                    Close shift
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <CloseShiftDialog record={closing} open={Boolean(closing)} onClose={() => setClosing(null)} />
    </Card>
  );
}
