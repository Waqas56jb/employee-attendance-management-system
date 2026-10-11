import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCheck, Eye, PencilLine } from 'lucide-react';
import { DataTable } from '../common/DataTable';
import { Avatar } from '../common/Avatar';
import { Button } from '../common/Button';
import { StatusBadge } from '../common/StatusBadge';
import { displayAttendanceStatus, getBillableMinutes, isShiftOpen } from '../../utils/calculations';
import { formatDate, formatDateTime, formatTime, toDateKey } from '../../utils/dateUtils';
import { formatDuration } from '../../utils/formatters';
import { isBillableAdjusted, liveDuration } from './attendanceHelpers';

/**
 * Attendance records table. `rows` must already be filtered; sorting and
 * pagination operate on them.
 */
export function AttendanceTable({ rows, lookups, rules, onCorrect, onApprove, emptyState, pageSize = 15, hideColumns = [] }) {
  const navigate = useNavigate();
  const { employeesById, customersById, projectsById } = lookups;
  const { now } = rules;

  const columns = useMemo(() => {
    const all = [
      {
        key: 'employee',
        header: 'Employee',
        primary: true,
        sortValue: (r) => employeesById[r.employeeId]?.fullName ?? '',
        render: (r) => {
          const employee = employeesById[r.employeeId];
          return (
            <div className="flex min-w-0 items-center gap-2.5">
              <Avatar name={employee?.fullName} size="xs" />
              <Link to={`/attendance/${r.id}`} className="truncate font-medium text-ink hover:text-brand-700 hover:underline">
                {employee?.fullName ?? 'Unknown employee'}
              </Link>
            </div>
          );
        },
      },
      {
        key: 'date',
        header: 'Date',
        sortValue: (r) => r.checkInAt,
        render: (r) => <span className="whitespace-nowrap">{formatDate(r.checkInAt, 'EEE dd MMM yyyy')}</span>,
      },
      {
        key: 'customer',
        header: 'Customer',
        sortValue: (r) => customersById[r.customerId]?.companyName ?? '',
        render: (r) => <span className="block max-w-[12rem] truncate">{customersById[r.customerId]?.companyName ?? '—'}</span>,
      },
      {
        key: 'project',
        header: 'Project',
        sortValue: (r) => projectsById[r.projectId]?.name ?? '',
        render: (r) => <span className="block max-w-[12rem] truncate">{projectsById[r.projectId]?.name ?? '—'}</span>,
      },
      { key: 'checkIn', header: 'Check-in', sortValue: (r) => r.checkInAt, render: (r) => <span className="tabular">{formatTime(r.checkInAt)}</span> },
      {
        key: 'checkOut',
        header: 'Check-out',
        sortValue: (r) => r.checkOutAt ?? '',
        render: (r) => {
          if (!r.checkOutAt) return <span className="text-ink-muted">Open</span>;
          const otherDay = toDateKey(r.checkOutAt) !== toDateKey(r.checkInAt);
          return <span className="tabular">{otherDay ? formatDateTime(r.checkOutAt) : formatTime(r.checkOutAt)}</span>;
        },
      },
      {
        key: 'duration',
        header: 'Duration',
        align: 'right',
        sortValue: (r) => liveDuration(r, now) ?? -1,
        render: (r) => (
          <span className="whitespace-nowrap">
            <span className={isShiftOpen(r) ? 'text-info-ink' : undefined}>{formatDuration(liveDuration(r, now))}</span>
            {isShiftOpen(r) && <span className="sr-only"> (running)</span>}
            {isBillableAdjusted(r) && (
              <span className="block text-2xs text-ink-muted" title="Billable duration adjusted by an administrator">
                Billable {formatDuration(getBillableMinutes(r))}
              </span>
            )}
          </span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        sortValue: (r) => displayAttendanceStatus(r, rules),
        render: (r) => <StatusBadge kind="attendance" status={displayAttendanceStatus(r, rules)} />,
      },
      {
        key: 'updated',
        header: 'Last updated',
        sortValue: (r) => r.updatedAt ?? '',
        mobile: false,
        render: (r) => (
          <span className="whitespace-nowrap text-xs text-ink-muted">
            {formatDateTime(r.updatedAt)}
            {r.updatedBy && <span className="block">by {r.updatedBy}</span>}
          </span>
        ),
      },
      {
        key: 'actions',
        header: <span className="sr-only">Actions</span>,
        align: 'right',
        render: (r) => {
          const status = displayAttendanceStatus(r, rules);
          const employeeName = employeesById[r.employeeId]?.fullName ?? 'record';
          return (
            <div className="flex flex-wrap items-center justify-end gap-1">
              <Button size="xs" variant="ghost" icon={Eye} to={`/attendance/${r.id}`} aria-label={`View attendance of ${employeeName}`}>
                View
              </Button>
              {r.status !== 'cancelled' && onCorrect && (
                <Button size="xs" variant="ghost" icon={PencilLine} onClick={() => onCorrect(r)} aria-label={`Correct attendance of ${employeeName}`}>
                  Correct
                </Button>
              )}
              {status === 'needs_review' && r.checkOutAt && onApprove && (
                <Button size="xs" variant="subtle" icon={CheckCheck} onClick={() => onApprove(r)} aria-label={`Approve attendance of ${employeeName}`}>
                  Approve
                </Button>
              )}
            </div>
          );
        },
      },
    ];
    return all.filter((c) => !hideColumns.includes(c.key));
    // hideColumns is a static list per usage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeesById, customersById, projectsById, rules, now, onCorrect, onApprove]);

  return (
    <DataTable
      columns={columns}
      rows={rows}
      pageSize={pageSize}
      initialSort={{ key: 'date', dir: 'desc' }}
      onRowClick={(r) => navigate(`/attendance/${r.id}`)}
      emptyState={emptyState}
      caption="Attendance records"
    />
  );
}
