import { Link } from 'react-router-dom';
import { Briefcase, Building2, FolderKanban } from 'lucide-react';
import { Card, CardBody, CardHeader } from '../common/Card';
import { Button } from '../common/Button';
import { EmptyState } from '../common/EmptyState';
import { StatusBadge } from '../common/StatusBadge';
import { formatDuration } from '../../utils/formatters';

/**
 * Assigned projects and the customers derived from them.
 * minutesByProject: projectId → recorded minutes of this employee.
 */
export function EmployeeProjectAssignments({ employee, projectsById, customersById, minutesByProject = {}, onManage }) {
  const projects = employee.assignedProjectIds.map((id) => projectsById[id]).filter(Boolean);
  const customers = [...new Set(projects.map((p) => p.customerId))].map((id) => customersById[id]).filter(Boolean);

  return (
    <Card>
      <CardHeader
        title="Assignments"
        icon={FolderKanban}
        description={`${projects.length} project${projects.length === 1 ? '' : 's'} · ${customers.length} customer${customers.length === 1 ? '' : 's'}`}
        action={
          <Button variant="secondary" size="sm" icon={Briefcase} onClick={onManage}>
            Manage
          </Button>
        }
      />
      {projects.length === 0 ? (
        <EmptyState
          compact
          icon={FolderKanban}
          title="No project assignments"
          description={employee.status === 'active' ? 'Assign projects so the employee can check in on site.' : 'Inactive employees cannot receive new assignments.'}
        />
      ) : (
        <CardBody className="space-y-4">
          <div>
            <p className="mb-2 text-2xs font-medium uppercase tracking-wide text-ink-muted">Customers</p>
            <div className="flex flex-wrap gap-1.5">
              {customers.map((c) => (
                <Link
                  key={c.id}
                  to={`/customers/${c.id}`}
                  className="inline-flex items-center gap-1.5 rounded-md border border-line bg-subtle px-2 py-1 text-xs font-medium text-ink-secondary hover:border-line-strong hover:text-ink"
                >
                  <Building2 size={12} aria-hidden />
                  {c.companyName}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-2xs font-medium uppercase tracking-wide text-ink-muted">Projects</p>
            <ul className="divide-y divide-line rounded-lg border border-line">
              {projects.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
                  <div className="min-w-0">
                    <Link to={`/projects/${p.id}`} className="block truncate text-sm font-medium text-ink hover:text-brand-700 hover:underline">
                      {p.name}
                    </Link>
                    <p className="truncate text-xs text-ink-muted">
                      {customersById[p.customerId]?.companyName ?? 'Unknown customer'} · {p.projectNumber}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="tabular text-xs text-ink-secondary" title="Recorded by this employee">
                      {formatDuration(minutesByProject[p.id] ?? 0)}
                    </span>
                    <StatusBadge kind="project" status={p.status} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </CardBody>
      )}
    </Card>
  );
}
