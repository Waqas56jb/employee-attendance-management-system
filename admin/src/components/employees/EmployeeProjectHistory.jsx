import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { History } from 'lucide-react';
import { useBusiness } from '../../hooks/useBusiness';
import { Card, CardHeader } from '../common/Card';
import { DataTable } from '../common/DataTable';
import { EmptyState } from '../common/EmptyState';
import { StatusBadge } from '../common/StatusBadge';
import { isClosedRecord, sumBillable, sumRecorded } from '../../services/reportService';
import { formatDate } from '../../utils/dateUtils';
import { formatDuration } from '../../utils/formatters';

/** Every project the employee has attendance on (incl. completed/archived), with hours. */
export function EmployeeProjectHistory({ records, projectsById, customersById, assignedIds = [] }) {
  const { workingHours } = useBusiness();

  const rows = useMemo(() => {
    const groups = {};
    records.forEach((r) => {
      (groups[r.projectId] = groups[r.projectId] ?? []).push(r);
    });
    return Object.entries(groups).map(([projectId, list]) => {
      const closed = list.filter(isClosedRecord);
      const dates = list.map((r) => r.checkInAt).sort();
      return {
        id: projectId,
        project: projectsById[projectId],
        customer: customersById[list[0].customerId],
        shifts: closed.length,
        first: dates[0],
        last: dates[dates.length - 1],
        recorded: sumRecorded(list),
        billable: sumBillable(list, workingHours),
        assigned: assignedIds.includes(projectId),
      };
    });
  }, [records, projectsById, customersById, workingHours, assignedIds]);

  const columns = [
    {
      key: 'project',
      header: 'Project',
      primary: true,
      sortValue: (r) => r.project?.name ?? '',
      render: (r) => (
        <span className="block min-w-0">
          {r.project ? (
            <Link to={`/projects/${r.id}`} className="block truncate font-medium text-ink hover:text-brand-700 hover:underline">
              {r.project.name}
            </Link>
          ) : (
            <span className="text-ink-muted">Deleted project</span>
          )}
          <span className="block truncate text-xs text-ink-muted">
            {r.customer?.companyName ?? '—'}
            {r.assigned ? ' · currently assigned' : ''}
          </span>
        </span>
      ),
    },
    { key: 'status', header: 'Status', sortValue: (r) => r.project?.status ?? '', render: (r) => (r.project ? <StatusBadge kind="project" status={r.project.status} /> : '—') },
    {
      key: 'period',
      header: 'Worked',
      sortValue: (r) => r.last,
      render: (r) => (
        <span className="whitespace-nowrap text-xs text-ink-secondary">
          {formatDate(r.first, 'dd MMM yy')} – {formatDate(r.last, 'dd MMM yy')}
        </span>
      ),
    },
    { key: 'shifts', header: 'Shifts', align: 'right', sortValue: (r) => r.shifts },
    { key: 'recorded', header: 'Recorded', align: 'right', sortValue: (r) => r.recorded, render: (r) => formatDuration(r.recorded) },
    { key: 'billable', header: 'Approved billable', align: 'right', sortValue: (r) => r.billable, render: (r) => formatDuration(r.billable) },
  ];

  return (
    <Card>
      <CardHeader title="Project history" icon={History} description="All projects worked on, including completed and archived ones." />
      <DataTable
        columns={columns}
        rows={rows}
        initialSort={{ key: 'period', dir: 'desc' }}
        pageSize={6}
        dense
        caption="Project history"
        emptyState={<EmptyState compact icon={History} title="No project history yet" description="Projects appear once attendance is recorded." />}
      />
    </Card>
  );
}
