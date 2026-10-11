import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, UserPlus } from 'lucide-react';
import { Card, CardHeader } from '../common/Card';
import { Avatar } from '../common/Avatar';
import { Button } from '../common/Button';
import { EmptyState } from '../common/EmptyState';
import { Modal } from '../common/Modal';
import { MultiSelect } from '../common/MultiSelect';
import { StatusBadge } from '../common/StatusBadge';
import { useEmployees } from '../../hooks/useEmployees';
import { useProjects } from '../../hooks/useProjects';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { formatDuration } from '../../utils/formatters';

/** Assigned team of a project with an edit dialog. `minutesByEmployee` = recorded minutes on this project. */
export function ProjectEmployeeAssignments({ project, minutesByEmployee = {} }) {
  const { employees, employeesById } = useEmployees();
  const { updateProjectAssignments } = useProjects();
  const [run, pending] = useAsyncAction();
  const [open, setOpen] = useState(false);
  const [selection, setSelection] = useState(project.assignedEmployeeIds);

  const assigned = project.assignedEmployeeIds.map((id) => employeesById[id]).filter(Boolean);
  const options = useMemo(
    () =>
      employees
        .filter((e) => e.status !== 'archived' || project.assignedEmployeeIds.includes(e.id))
        .sort((a, b) => a.fullName.localeCompare(b.fullName))
        .map((e) => ({
          value: e.id,
          label: e.fullName,
          description: `${e.jobTitle} · ${e.employeeNumber}${e.status !== 'active' ? ` · ${e.status}` : ''}`,
          disabled: e.status !== 'active' && !project.assignedEmployeeIds.includes(e.id),
          disabledReason: `${e.status === 'inactive' ? 'Inactive' : 'Archived'} — cannot be newly assigned`,
        })),
    [employees, project.assignedEmployeeIds],
  );

  const openEditor = () => {
    setSelection(project.assignedEmployeeIds);
    setOpen(true);
  };

  const save = async () => {
    const result = await run(() => updateProjectAssignments(project.id, selection), { success: 'Team updated' });
    if (result) setOpen(false);
  };

  const added = selection.filter((id) => !project.assignedEmployeeIds.includes(id)).length;
  const removed = project.assignedEmployeeIds.filter((id) => !selection.includes(id)).length;

  return (
    <Card>
      <CardHeader
        icon={Users}
        title="Assigned employees"
        description={`${assigned.length} assigned`}
        action={
          <Button size="sm" variant="secondary" icon={UserPlus} onClick={openEditor}>
            Edit team
          </Button>
        }
      />
      {assigned.length === 0 ? (
        <EmptyState compact title="No employees assigned" description="Assigned employees can select this project when checking in." action={<Button size="sm" onClick={openEditor}>Assign employees</Button>} />
      ) : (
        <ul className="divide-y divide-line">
          {assigned.map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-3 px-5 py-2.5">
              <div className="flex min-w-0 items-center gap-2.5">
                <Avatar name={e.fullName} size="sm" />
                <div className="min-w-0">
                  <Link to={`/employees/${e.id}`} className="block truncate text-sm font-medium text-ink hover:text-brand-700 hover:underline">
                    {e.fullName}
                  </Link>
                  <p className="truncate text-xs text-ink-muted">{e.jobTitle}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="tabular text-xs text-ink-secondary" title="Recorded hours on this project">
                  {formatDuration(minutesByEmployee[e.id] ?? 0)}
                </span>
                {e.status !== 'active' && <StatusBadge kind="employee" status={e.status} />}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        dismissible={!pending}
        title="Edit project team"
        description="Removing an employee does not delete their recorded attendance on this project."
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={save} loading={pending} disabled={added === 0 && removed === 0}>
              Save team
            </Button>
          </>
        }
      >
        <MultiSelect options={options} value={selection} onChange={setSelection} placeholder="Search employees…" aria-label="Assigned employees" />
        <p className="mt-2 text-xs text-ink-muted" aria-live="polite">
          {selection.length} selected{added || removed ? ` · ${added} added, ${removed} removed` : ''}
        </p>
      </Modal>
    </Card>
  );
}
