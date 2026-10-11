import { ASSIGNABLE_PROJECT_STATUSES } from '../../services/employeeService';
import { isClosedRecord } from '../../services/reportService';
import { isInDateRange } from '../../utils/dateUtils';
import { getStatusMeta } from '../common/StatusBadge';

/** '' = everyone except archived (default list view). */
export const EMPLOYEE_STATUS_FILTERS = [
  { value: '', label: 'Active & inactive' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'archived', label: 'Archived' },
];

export function matchesStatusFilter(status, filter) {
  if (!filter) return status !== 'archived';
  return status === filter;
}

/** employeeId → recorded minutes of closed, non-cancelled records in the range. */
export function recordedMinutesByEmployee(attendance, { from = '', to = '' } = {}) {
  const map = {};
  attendance.forEach((a) => {
    if (!isClosedRecord(a) || !isInDateRange(a.checkInAt, from, to)) return;
    map[a.employeeId] = (map[a.employeeId] ?? 0) + a.recordedDurationMinutes;
  });
  return map;
}

/**
 * MultiSelect options for project assignment. Projects that are not open for
 * new assignments (completed / archived) and any new assignment for a
 * non-active employee are disabled with a reason. Already-assigned projects
 * stay selectable so they can be removed.
 */
export function assignmentOptions(projects, customersById, { employeeStatus = 'active', currentIds = [] } = {}) {
  return projects
    .filter((p) => p.status !== 'archived' || currentIds.includes(p.id))
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((p) => {
      const customer = customersById[p.customerId]?.companyName ?? 'Unknown customer';
      const statusLabel = getStatusMeta('project', p.status).label;
      const isCurrent = currentIds.includes(p.id);
      let reason = '';
      if (!isCurrent && !ASSIGNABLE_PROJECT_STATUSES.includes(p.status)) {
        reason = `${statusLabel} — not open for new assignments`;
      } else if (!isCurrent && employeeStatus !== 'active') {
        reason = 'Only active employees can receive new assignments';
      }
      return {
        value: p.id,
        label: p.name,
        description: `${customer} · ${p.projectNumber} · ${statusLabel}`,
        disabled: Boolean(reason),
        disabledReason: reason ? `${customer} · ${reason}` : undefined,
      };
    });
}

/** Form values for editing an existing employee (never includes credentials). */
export function employeeToForm(employee) {
  return {
    fullName: employee.fullName,
    employeeNumber: employee.employeeNumber,
    email: employee.email,
    phone: employee.phone,
    jobTitle: employee.jobTitle,
    department: employee.department,
    employmentStartDate: employee.employmentStartDate,
    status: employee.status,
    notes: employee.notes ?? '',
    assignedProjectIds: [...(employee.assignedProjectIds ?? [])],
  };
}
