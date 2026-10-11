import { Link } from 'react-router-dom';
import { Users } from 'lucide-react';
import { Avatar } from '../common/Avatar';
import { DataTable } from '../common/DataTable';
import { EmptyState } from '../common/EmptyState';
import { formatDuration } from '../../utils/formatters';
import { EmployeeStatusBadge } from './EmployeeStatusBadge';
import { EmployeeRowActions } from './EmployeeRowActions';

function projectNames(projects) {
  if (!projects.length) return <span className="text-ink-muted">None</span>;
  const shown = projects.slice(0, 2);
  const rest = projects.length - shown.length;
  return (
    <span className="block max-w-[16rem] truncate text-sm" title={projects.map((p) => p.name).join(', ')}>
      {shown.map((p) => p.name).join(', ')}
      {rest > 0 && <span className="ml-1 text-xs font-medium text-ink-muted">+{rest}</span>}
    </span>
  );
}

/** rows: employees enriched with `projects` and `weekMinutes`. */
export function EmployeeTable({ rows, onAction, onRowClick, emptyAction, isFiltered }) {
  const columns = [
    {
      key: 'employee',
      header: 'Employee',
      primary: true,
      sortValue: (e) => e.fullName,
      render: (e) => (
        <span className="flex min-w-0 items-center gap-3">
          <Avatar name={e.fullName} size="sm" />
          <span className="min-w-0">
            <Link to={`/employees/${e.id}`} className="block truncate font-medium text-ink hover:text-brand-700 hover:underline">
              {e.fullName}
            </Link>
            <span className="block truncate text-xs text-ink-muted">{e.jobTitle}</span>
          </span>
        </span>
      ),
    },
    {
      key: 'employeeNumber',
      header: 'Employee ID',
      sortValue: (e) => e.employeeNumber,
      render: (e) => <span className="tabular whitespace-nowrap text-ink-secondary">{e.employeeNumber}</span>,
    },
    {
      key: 'email',
      header: 'Email',
      sortValue: (e) => e.email,
      render: (e) => (
        <a href={`mailto:${e.email}`} className="block max-w-[14rem] truncate text-ink-secondary hover:text-brand-700">
          {e.email}
        </a>
      ),
    },
    { key: 'phone', header: 'Phone', render: (e) => <span className="whitespace-nowrap text-ink-secondary">{e.phone}</span> },
    { key: 'projects', header: 'Assigned projects', sortValue: (e) => e.projects.length, render: (e) => projectNames(e.projects) },
    {
      key: 'week',
      header: 'Hours this week',
      align: 'right',
      sortValue: (e) => e.weekMinutes,
      render: (e) => <span className={e.weekMinutes ? 'text-ink' : 'text-ink-muted'}>{formatDuration(e.weekMinutes)}</span>,
    },
    { key: 'status', header: 'Status', sortValue: (e) => e.status, render: (e) => <EmployeeStatusBadge status={e.status} /> },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      align: 'right',
      render: (e) => <EmployeeRowActions employee={e} onAction={onAction} />,
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      initialSort={{ key: 'employee', dir: 'asc' }}
      onRowClick={onRowClick}
      caption="Employees"
      emptyState={
        <EmptyState
          icon={Users}
          title={isFiltered ? 'No employees match these filters' : 'No employees yet'}
          description={isFiltered ? 'Try a different search term or reset the filters.' : 'Add your first employee to start tracking attendance.'}
          action={emptyAction}
        />
      }
    />
  );
}
