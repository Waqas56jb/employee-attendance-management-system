import { useCallback, useState } from 'react';
import { useEmployees } from '../../hooks/useEmployees';
import { useAttendance } from '../../hooks/useAttendance';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { EmployeeEditModal } from './EmployeeEditModal';
import { EmployeeAssignmentsModal } from './EmployeeAssignmentsModal';

/**
 * Shared employee actions for the list and the details page.
 *   const { trigger, elements } = useEmployeeActions({ onDeleted });
 *   trigger('edit' | 'assign' | 'activate' | 'deactivate' | 'archive' | 'restore' | 'delete', employee)
 * Render `elements` once in the page.
 */
export function useEmployeeActions({ onDeleted } = {}) {
  const { employeesById, setEmployeeStatus, deleteEmployee } = useEmployees();
  const { attendance } = useAttendance();
  const [run] = useAsyncAction();
  const [active, setActive] = useState(null); // { type, id }

  const close = useCallback(() => setActive(null), []);

  const trigger = useCallback(
    (type, employee) => {
      if (type === 'activate') {
        run(() => setEmployeeStatus(employee.id, 'active', 'Reactivated'), { success: `${employee.fullName} is active again` });
        return;
      }
      if (type === 'restore') {
        run(() => setEmployeeStatus(employee.id, 'inactive', 'Restored from archive'), {
          success: `${employee.fullName} was restored as inactive`,
        });
        return;
      }
      setActive({ type, id: employee.id });
    },
    [run, setEmployeeStatus],
  );

  const employee = active ? employeesById[active.id] : null;
  const hasHistory = employee ? attendance.some((a) => a.employeeId === employee.id) : false;

  let elements = null;
  if (employee && active.type === 'edit') elements = <EmployeeEditModal employee={employee} onClose={close} />;
  if (employee && active.type === 'assign') elements = <EmployeeAssignmentsModal employee={employee} onClose={close} />;
  if (employee && active.type === 'deactivate') {
    elements = (
      <ConfirmDialog
        open
        onClose={close}
        tone="warning"
        title={`Deactivate ${employee.fullName}?`}
        confirmLabel="Deactivate"
        message={
          <>
            Inactive employees can no longer be assigned to new projects. Their existing assignments, attendance and invoice history stay
            unchanged and they can be reactivated at any time.
          </>
        }
        requireReason
        reasonLabel="Reason (for the activity log)"
        onConfirm={(reason) =>
          run(() => setEmployeeStatus(employee.id, 'inactive', reason), { success: `${employee.fullName} was deactivated`, rethrow: true })
        }
      />
    );
  }
  if (employee && active.type === 'archive') {
    elements = (
      <ConfirmDialog
        open
        onClose={close}
        title={`Archive ${employee.fullName}?`}
        confirmLabel="Archive employee"
        message={
          <div className="space-y-2">
            <p>
              The employee is hidden from the default list and released from planned, active and on-hold projects. Attendance records,
              billing and invoice history are kept.
            </p>
            {hasHistory && (
              <p className="text-ink-muted">Employees with attendance history cannot be deleted — archiving is the safe way to retire them.</p>
            )}
          </div>
        }
        requireReason
        reasonLabel="Archive reason"
        onConfirm={(reason) =>
          run(() => setEmployeeStatus(employee.id, 'archived', reason), { success: `${employee.fullName} was archived`, rethrow: true })
        }
      />
    );
  }
  if (employee && active.type === 'delete') {
    elements = (
      <ConfirmDialog
        open
        onClose={close}
        title={`Delete ${employee.fullName}?`}
        confirmLabel="Delete permanently"
        message="This employee has no attendance history, so the record can be removed permanently. This cannot be undone."
        onConfirm={async () => {
          await run(() => deleteEmployee(employee.id), { success: 'Employee deleted', rethrow: true });
          onDeleted?.();
        }}
      />
    );
  }

  return { trigger, elements };
}
