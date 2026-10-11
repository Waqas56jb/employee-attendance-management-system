import { Link } from 'react-router-dom';
import { FolderKanban, Plus } from 'lucide-react';
import { Card, CardHeader } from '../common/Card';
import { AvatarGroup } from '../common/Avatar';
import { Button } from '../common/Button';
import { DataTable } from '../common/DataTable';
import { EmptyState } from '../common/EmptyState';
import { StatusBadge } from '../common/StatusBadge';
import { formatDate } from '../../utils/dateUtils';
import { formatDuration } from '../../utils/formatters';

/** Projects of ONE customer with status, dates, team and recorded hours. */
export function CustomerProjectList({ customer, projects, employeesById, minutesByProject, title = 'Projects', pageSize = 10, showCreate = true }) {
  const createButton = showCreate ? (
    <Button size="sm" icon={Plus} to={`/projects/new?customer=${customer.id}`} disabled={customer.status === 'archived'}>
      Create project
    </Button>
  ) : null;

  const columns = [
    {
      key: 'name',
      header: 'Project',
      primary: true,
      sortValue: (p) => p.name,
      render: (p) => (
        <span className="block min-w-0">
          <Link to={`/projects/${p.id}`} className="block max-w-[18rem] truncate font-medium text-ink hover:text-brand-700 hover:underline">
            {p.name}
          </Link>
          <span className="tabular block text-xs text-ink-muted">{p.projectNumber}</span>
        </span>
      ),
    },
    { key: 'status', header: 'Status', sortValue: (p) => p.status, render: (p) => <StatusBadge kind="project" status={p.status} /> },
    { key: 'start', header: 'Start', sortValue: (p) => p.startDate, render: (p) => <span className="whitespace-nowrap">{formatDate(p.startDate)}</span> },
    {
      key: 'end',
      header: 'End',
      sortValue: (p) => p.endDate || '9999',
      render: (p) => <span className="whitespace-nowrap">{p.endDate ? formatDate(p.endDate) : <span className="text-ink-muted">Open-ended</span>}</span>,
    },
    {
      key: 'team',
      header: 'Team',
      sortValue: (p) => p.assignedEmployeeIds.length,
      render: (p) => <AvatarGroup names={p.assignedEmployeeIds.map((id) => employeesById[id]?.fullName).filter(Boolean)} max={4} />,
    },
    {
      key: 'hours',
      header: 'Recorded hours',
      align: 'right',
      sortValue: (p) => minutesByProject[p.id] ?? 0,
      render: (p) => (
        <span>
          {formatDuration(minutesByProject[p.id] ?? 0)}
          {p.targetHours ? <span className="block text-2xs text-ink-muted">of {p.targetHours} h target</span> : null}
        </span>
      ),
    },
  ];

  return (
    <Card>
      <CardHeader title={title} icon={FolderKanban} description={`${projects.length} project${projects.length === 1 ? '' : 's'} for ${customer.companyName}`} action={createButton} />
      <DataTable
        columns={columns}
        rows={projects}
        initialSort={{ key: 'start', dir: 'desc' }}
        pageSize={pageSize}
        caption={`Projects of ${customer.companyName}`}
        emptyState={<EmptyState compact icon={FolderKanban} title="No projects yet" description="Create a project to assign employees and record attendance." action={createButton} />}
      />
    </Card>
  );
}
