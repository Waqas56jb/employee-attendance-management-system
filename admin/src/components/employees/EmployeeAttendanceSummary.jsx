import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import { useBusiness } from '../../hooks/useBusiness';
import { useNow } from '../../hooks/useNow';
import { Card, CardHeader } from '../common/Card';
import { DataTable } from '../common/DataTable';
import { DateRangePicker } from '../common/DateRangePicker';
import { EmptyState } from '../common/EmptyState';
import { ExportButton } from '../common/ExportButton';
import { FilterBar } from '../common/FilterBar';
import { SelectField } from '../common/SelectField';
import { StatusBadge, getStatusMeta } from '../common/StatusBadge';
import { displayAttendanceStatus, elapsedMinutes, isShiftOpen } from '../../utils/calculations';
import { formatDate, formatTime, isInDateRange } from '../../utils/dateUtils';
import { formatDuration, formatHours } from '../../utils/formatters';

/** Attendance history of one employee with date-range and project filters. */
export function EmployeeAttendanceSummary({ records, projectsById, customersById }) {
  const navigate = useNavigate();
  const { workingHours } = useBusiness();
  const now = useNow(60000);
  const [range, setRange] = useState({ from: '', to: '' });
  const [projectId, setProjectId] = useState('');

  const statusOf = (r) => displayAttendanceStatus(r, { now, openShiftAlertHours: workingHours.openShiftAlertHours, reviewShiftsOverHours: workingHours.reviewShiftsOverHours });

  const projectOptions = useMemo(() => {
    const ids = [...new Set(records.map((r) => r.projectId))];
    return ids
      .map((id) => projectsById[id])
      .filter(Boolean)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((p) => ({ value: p.id, label: p.name }));
  }, [records, projectsById]);

  const rows = useMemo(
    () => records.filter((r) => (!projectId || r.projectId === projectId) && isInDateRange(r.checkInAt, range.from, range.to)),
    [records, projectId, range],
  );

  const duration = (r) => (isShiftOpen(r) ? elapsedMinutes(r.checkInAt, now) : r.recordedDurationMinutes ?? 0);
  const isFiltered = Boolean(projectId || range.from || range.to);

  const columns = [
    {
      key: 'date',
      header: 'Date',
      primary: true,
      sortValue: (r) => r.checkInAt,
      render: (r) => (
        <Link to={`/attendance/${r.id}`} className="whitespace-nowrap font-medium text-ink hover:text-brand-700 hover:underline">
          {formatDate(r.checkInAt, 'EEE dd MMM yyyy')}
        </Link>
      ),
    },
    { key: 'customer', header: 'Customer', sortValue: (r) => customersById[r.customerId]?.companyName ?? '', render: (r) => <span className="block max-w-[12rem] truncate">{customersById[r.customerId]?.companyName ?? '—'}</span> },
    { key: 'project', header: 'Project', sortValue: (r) => projectsById[r.projectId]?.name ?? '', render: (r) => <span className="block max-w-[14rem] truncate">{projectsById[r.projectId]?.name ?? '—'}</span> },
    { key: 'in', header: 'Check-in', render: (r) => <span className="tabular">{formatTime(r.checkInAt)}</span> },
    { key: 'out', header: 'Check-out', render: (r) => (r.checkOutAt ? <span className="tabular">{formatTime(r.checkOutAt)}</span> : <span className="text-ink-muted">Open</span>) },
    {
      key: 'duration',
      header: 'Duration',
      align: 'right',
      sortValue: duration,
      render: (r) => <span className={isShiftOpen(r) ? 'text-info-ink' : undefined}>{formatDuration(duration(r))}{isShiftOpen(r) ? ' (running)' : ''}</span>,
    },
    { key: 'status', header: 'Status', sortValue: statusOf, render: (r) => <StatusBadge kind="attendance" status={statusOf(r)} /> },
  ];

  const exportColumns = [
    { header: 'Date', value: (r) => formatDate(r.checkInAt, 'yyyy-MM-dd') },
    { header: 'Customer', value: (r) => customersById[r.customerId]?.companyName ?? '' },
    { header: 'Project', value: (r) => projectsById[r.projectId]?.name ?? '' },
    { header: 'Check-in', value: (r) => formatTime(r.checkInAt) },
    { header: 'Check-out', value: (r) => (r.checkOutAt ? formatTime(r.checkOutAt) : '') },
    { header: 'Recorded hours', value: (r) => (r.checkOutAt ? formatHours(r.recordedDurationMinutes ?? 0) : '') },
    { header: 'Status', value: (r) => getStatusMeta('attendance', statusOf(r)).label },
  ];

  return (
    <Card>
      <CardHeader title="Attendance history" icon={ClipboardList} description="Every check-in of this employee. Open a row for details and corrections." />
      <FilterBar
        count={rows.length}
        isFiltered={isFiltered}
        onReset={() => {
          setRange({ from: '', to: '' });
          setProjectId('');
        }}
        actions={<ExportButton rows={rows} columns={exportColumns} filename="employee-attendance" />}
      >
        <DateRangePicker value={range} onChange={setRange} compact />
        <SelectField
          aria-label="Filter attendance by project"
          size="sm"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          placeholder="All projects"
          options={projectOptions}
          className="w-full sm:w-56"
        />
      </FilterBar>
      <DataTable
        columns={columns}
        rows={rows}
        initialSort={{ key: 'date', dir: 'desc' }}
        onRowClick={(r) => navigate(`/attendance/${r.id}`)}
        caption="Attendance history"
        dense
        emptyState={
          <EmptyState
            compact
            icon={ClipboardList}
            title={isFiltered ? 'No attendance in this selection' : 'No attendance recorded yet'}
            description={isFiltered ? 'Change the period or project filter.' : 'Records appear here once the employee checks in.'}
          />
        }
      />
    </Card>
  );
}
