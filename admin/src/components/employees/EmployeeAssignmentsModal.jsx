import { useMemo, useState } from 'react';
import { useEmployees } from '../../hooks/useEmployees';
import { useProjects } from '../../hooks/useProjects';
import { useCustomers } from '../../hooks/useCustomers';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { MultiSelect } from '../common/MultiSelect';
import { Callout } from '../common/Callout';
import { assignmentOptions } from './employeeUtils';

/** Manage an employee's project assignments. Mount only while open. */
export function EmployeeAssignmentsModal({ employee, onClose }) {
  const { updateEmployeeAssignments } = useEmployees();
  const { projects } = useProjects();
  const { customersById } = useCustomers();
  const [run, pending] = useAsyncAction();
  const [initial] = useState(() => [...employee.assignedProjectIds]);
  const [selected, setSelected] = useState(initial);

  const options = useMemo(
    () => assignmentOptions(projects, customersById, { employeeStatus: employee.status, currentIds: initial }),
    [projects, customersById, employee.status, initial],
  );

  const changed = selected.length !== initial.length || selected.some((id) => !initial.includes(id));

  const save = async () => {
    const result = await run(() => updateEmployeeAssignments(employee.id, selected), { success: 'Project assignments updated' });
    if (result) onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      dismissible={!pending}
      size="lg"
      title="Manage project assignments"
      description={`Choose the projects ${employee.fullName} works on. The employee app only offers assigned projects for check-in.`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={save} loading={pending} disabled={!changed}>
            Save assignments
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {employee.status !== 'active' && (
          <Callout tone="warning" title="New assignments are blocked">
            {employee.fullName} is {employee.status}. Existing assignments can be removed, but new projects can only be assigned to active
            employees.
          </Callout>
        )}
        <MultiSelect
          aria-label="Assigned projects"
          options={options}
          value={selected}
          onChange={setSelected}
          placeholder="Search projects or customers…"
          emptyText="No projects found"
          maxHeight="max-h-80"
        />
        <p className="text-xs text-ink-muted">Removing an assignment never deletes attendance already recorded on that project.</p>
      </div>
    </Modal>
  );
}
