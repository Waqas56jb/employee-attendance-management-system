import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Archive, Eye, PencilLine } from 'lucide-react';
import { DataTable } from '../common/DataTable';
import { AvatarGroup } from '../common/Avatar';
import { Button } from '../common/Button';
import { StatusBadge } from '../common/StatusBadge';
import { formatDate } from '../../utils/dateUtils';
import { formatHours } from '../../utils/formatters';

export function ProjectTable({ rows, totals, customersById, employeesById, onEdit, onArchive, emptyState }) {
  const navigate = useNavigate();

  const columns = useMemo(
    () => [
      {
        key: 'name',
        header: 'Project',
        primary: true,
        sortValue: (p) => p.name,
        render: (p) => (
          <div className="min-w-0">
            <Link to={`/projects/${p.id}`} className="block max-w-[16rem] truncate font-medium text-ink hover:text-brand-700 hover:underline">
              {p.name}
            </Link>
            <span className="text-xs text-ink-muted">{p.projectNumber}</span>
          </div>
        ),
      },
      {
        key: 'customer',
        header: 'Customer',
        sortValue: (p) => customersById[p.customerId]?.companyName ?? '',
        render: (p) =>
          customersById[p.customerId] ? (
            <Link to={`/customers/${p.customerId}`} className="block max-w-[12rem] truncate hover:text-brand-700 hover:underline">
              {customersById[p.customerId].companyName}
            </Link>
          ) : (
            '—'
          ),
      },
      {
        key: 'address',
        header: 'Location',
        sortValue: (p) => p.address,
        render: (p) => (
          <span className="block max-w-[14rem] truncate text-ink-secondary" title={p.address}>
            {p.address || '—'}
          </span>
        ),
      },
      {
        key: 'employees',
        header: 'Team',
        sortValue: (p) => p.assignedEmployeeIds.length,
        render: (p) => <AvatarGroup names={p.assignedEmployeeIds.map((id) => employeesById[id]?.fullName).filter(Boolean)} max={4} />,
      },
      { key: 'startDate', header: 'Start', sortValue: (p) => p.startDate, render: (p) => <span className="whitespace-nowrap">{formatDate(p.startDate)}</span> },
      {
        key: 'endDate',
        header: 'End',
        sortValue: (p) => p.endDate || '9999',
        render: (p) => <span className="whitespace-nowrap">{p.endDate ? formatDate(p.endDate) : <span className="text-ink-muted">Open-ended</span>}</span>,
      },
      { key: 'recorded', header: 'Recorded h', align: 'right', sortValue: (p) => totals[p.id]?.recorded ?? 0, render: (p) => formatHours(totals[p.id]?.recorded ?? 0) },
      { key: 'billable', header: 'Billable h', align: 'right', sortValue: (p) => totals[p.id]?.billable ?? 0, render: (p) => formatHours(totals[p.id]?.billable ?? 0) },
      { key: 'status', header: 'Status', sortValue: (p) => p.status, render: (p) => <StatusBadge kind="project" status={p.status} /> },
      {
        key: 'actions',
        header: <span className="sr-only">Actions</span>,
        align: 'right',
        render: (p) => (
          <div className="flex items-center justify-end gap-1">
            <Button size="xs" variant="ghost" icon={Eye} to={`/projects/${p.id}`} aria-label={`View ${p.name}`}>
              View
            </Button>
            <Button size="xs" variant="ghost" icon={PencilLine} onClick={() => onEdit(p)} aria-label={`Edit ${p.name}`}>
              Edit
            </Button>
            {p.status !== 'archived' && (
              <Button size="xs" variant="danger-ghost" icon={Archive} onClick={() => onArchive(p)} aria-label={`Archive ${p.name}`}>
                Archive
              </Button>
            )}
          </div>
        ),
      },
    ],
    [customersById, employeesById, totals, onEdit, onArchive],
  );

  return (
    <DataTable
      columns={columns}
      rows={rows}
      pageSize={10}
      initialSort={{ key: 'startDate', dir: 'desc' }}
      onRowClick={(p) => navigate(`/projects/${p.id}`)}
      emptyState={emptyState}
      caption="Projects"
    />
  );
}
