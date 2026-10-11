import { useId, useState } from 'react';
import { toast } from 'sonner';
import { useEmployees } from '../../hooks/useEmployees';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { EmployeeForm } from './EmployeeForm';
import { employeeToForm } from './employeeUtils';

/** Edit an employee in a modal by reusing the create form. Mount only while open. */
export function EmployeeEditModal({ employee, onClose }) {
  const { updateEmployee } = useEmployees();
  const formId = useId();
  const [saving, setSaving] = useState(false);
  const [defaults] = useState(() => employeeToForm(employee));

  const onSubmit = async (values) => {
    setSaving(true);
    try {
      // Status is changed through the dedicated status actions only.
      await updateEmployee(employee.id, { ...values, status: employee.status });
      toast.success('Employee updated');
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      dismissible={!saving}
      size="lg"
      title={`Edit ${employee.fullName}`}
      description="Changes are recorded in the activity log. Attendance history is not affected."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={saving}>
            Save changes
          </Button>
        </>
      }
    >
      <EmployeeForm mode="edit" variant="modal" formId={formId} defaultValues={defaults} onSubmit={onSubmit} currentProjectIds={defaults.assignedProjectIds} />
    </Modal>
  );
}
