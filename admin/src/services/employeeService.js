import { createId, diffFields, findOrThrow, logActivity, mutate, notify, ServiceError } from './db';
import { nowIso } from '../utils/dateUtils';

const AUDITED_FIELDS = ['fullName', 'employeeNumber', 'email', 'phone', 'jobTitle', 'department', 'employmentStartDate', 'status', 'notes'];

/** Projects that can receive new assignments. */
export const ASSIGNABLE_PROJECT_STATUSES = ['planned', 'active', 'on_hold'];

function assertUnique(draft, data, ignoreId) {
  const number = data.employeeNumber.trim().toUpperCase();
  if (draft.employees.some((e) => e.id !== ignoreId && e.employeeNumber.toUpperCase() === number)) {
    throw new ServiceError(`Employee ID ${number} is already in use.`, { field: 'employeeNumber' });
  }
  const email = data.email.trim().toLowerCase();
  if (draft.employees.some((e) => e.id !== ignoreId && e.email.toLowerCase() === email)) {
    throw new ServiceError('Another employee already uses this email address.', { field: 'email' });
  }
}

/** Validates project ids and keeps project.assignedEmployeeIds in sync with the employee. */
function syncAssignments(draft, employee, projectIds, { previousIds = [] } = {}) {
  const unique = [...new Set(projectIds)];
  unique.forEach((pid) => {
    const project = draft.projects.find((p) => p.id === pid);
    if (!project) throw new ServiceError('One of the selected projects no longer exists.', { field: 'assignedProjectIds' });
    if (!previousIds.includes(pid) && !ASSIGNABLE_PROJECT_STATUSES.includes(project.status)) {
      throw new ServiceError(`${project.name} is ${project.status} and cannot receive new assignments.`, {
        field: 'assignedProjectIds',
      });
    }
  });
  if (employee.status !== 'active') {
    const added = unique.filter((pid) => !previousIds.includes(pid));
    if (added.length) {
      throw new ServiceError('Only active employees can be assigned to new projects.', { field: 'assignedProjectIds' });
    }
  }
  draft.projects.forEach((project) => {
    const has = project.assignedEmployeeIds.includes(employee.id);
    const should = unique.includes(project.id);
    if (should && !has) project.assignedEmployeeIds.push(employee.id);
    if (!should && has) project.assignedEmployeeIds = project.assignedEmployeeIds.filter((id) => id !== employee.id);
  });
  employee.assignedProjectIds = unique;
}

function normalize(data) {
  return {
    fullName: data.fullName.trim(),
    employeeNumber: data.employeeNumber.trim().toUpperCase(),
    email: data.email.trim().toLowerCase(),
    phone: data.phone.trim(),
    jobTitle: data.jobTitle.trim(),
    department: data.department.trim(),
    employmentStartDate: data.employmentStartDate,
    status: data.status,
    notes: data.notes?.trim() ?? '',
  };
}

export function createEmployee(data) {
  return mutate((draft) => {
    assertUnique(draft, data);
    const employee = {
      id: createId('emp'),
      ...normalize(data),
      assignedProjectIds: [],
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    syncAssignments(draft, employee, data.assignedProjectIds ?? []);
    draft.employees.push(employee);
    logActivity(draft, {
      action: 'employee.created',
      entityType: 'employee',
      entityId: employee.id,
      summary: `Added employee ${employee.fullName} (${employee.employeeNumber})`,
      newValues: { ...normalize(data), assignedProjectIds: employee.assignedProjectIds },
    });
    notify(draft, {
      title: 'Employee added',
      message: `${employee.fullName} was added${employee.assignedProjectIds.length ? ` and assigned to ${employee.assignedProjectIds.length} project(s)` : ''}.`,
      type: 'employee',
      relatedEntityType: 'employee',
      relatedEntityId: employee.id,
    });
    return employee;
  });
}

export function updateEmployee(id, data) {
  return mutate((draft) => {
    const employee = findOrThrow(draft.employees, id, 'Employee');
    assertUnique(draft, data, id);
    const before = { ...employee };
    Object.assign(employee, normalize(data), { updatedAt: nowIso() });
    if (data.assignedProjectIds) {
      syncAssignments(draft, employee, data.assignedProjectIds, { previousIds: before.assignedProjectIds });
    }
    const diff = diffFields(before, employee, [...AUDITED_FIELDS, 'assignedProjectIds']);
    if (diff) {
      logActivity(draft, {
        action: 'employee.updated',
        entityType: 'employee',
        entityId: id,
        summary: `Updated employee ${employee.fullName}`,
        previousValues: diff.previous,
        newValues: diff.next,
      });
    }
    return employee;
  });
}

export function updateEmployeeAssignments(id, projectIds) {
  return mutate((draft) => {
    const employee = findOrThrow(draft.employees, id, 'Employee');
    const previous = [...employee.assignedProjectIds];
    syncAssignments(draft, employee, projectIds, { previousIds: previous });
    employee.updatedAt = nowIso();
    const names = (ids) => ids.map((pid) => draft.projects.find((p) => p.id === pid)?.name).filter(Boolean);
    logActivity(draft, {
      action: 'project.assigned',
      entityType: 'employee',
      entityId: id,
      summary: `Updated project assignments for ${employee.fullName}`,
      previousValues: { projects: names(previous) },
      newValues: { projects: names(employee.assignedProjectIds) },
    });
    notify(draft, {
      title: 'Project assignment updated',
      message: `${employee.fullName} is now assigned to ${employee.assignedProjectIds.length} project(s).`,
      type: 'project',
      relatedEntityType: 'employee',
      relatedEntityId: id,
    });
    return employee;
  });
}

/**
 * Active / inactive / archived. Status changes never remove attendance or
 * invoice history. Archiving also releases the employee from open projects.
 */
export function setEmployeeStatus(id, status, reason = '') {
  return mutate((draft) => {
    const employee = findOrThrow(draft.employees, id, 'Employee');
    if (status !== 'active') {
      const open = draft.attendance.find((a) => a.employeeId === id && a.status === 'active' && !a.checkOutAt);
      if (open) {
        throw new ServiceError('This employee has an open shift. Close the shift before changing their status.');
      }
    }
    const previous = employee.status;
    employee.status = status;
    employee.updatedAt = nowIso();
    if (status === 'archived') {
      draft.projects.forEach((p) => {
        if (p.assignedEmployeeIds.includes(id) && ASSIGNABLE_PROJECT_STATUSES.includes(p.status)) {
          p.assignedEmployeeIds = p.assignedEmployeeIds.filter((eid) => eid !== id);
        }
      });
      employee.assignedProjectIds = draft.projects.filter((p) => p.assignedEmployeeIds.includes(id)).map((p) => p.id);
    }
    logActivity(draft, {
      action: 'employee.status_changed',
      entityType: 'employee',
      entityId: id,
      summary: `Set ${employee.fullName} to ${status}`,
      previousValues: { status: previous },
      newValues: { status },
      reason,
    });
    return employee;
  });
}

/** Hard delete is only allowed for employees without any attendance history. */
export function deleteEmployee(id) {
  return mutate((draft) => {
    const employee = findOrThrow(draft.employees, id, 'Employee');
    if (draft.attendance.some((a) => a.employeeId === id)) {
      throw new ServiceError('This employee has attendance history and cannot be deleted. Archive the employee instead.', {
        code: 'referenced',
      });
    }
    draft.projects.forEach((p) => {
      p.assignedEmployeeIds = p.assignedEmployeeIds.filter((eid) => eid !== id);
    });
    draft.employees = draft.employees.filter((e) => e.id !== id);
    logActivity(draft, {
      action: 'employee.deleted',
      entityType: 'employee',
      entityId: id,
      summary: `Deleted employee ${employee.fullName} (no history)`,
      previousValues: { fullName: employee.fullName, employeeNumber: employee.employeeNumber },
    });
    return true;
  });
}

/** Suggests the next free employee number, e.g. EMP-1013. */
export function suggestEmployeeNumber(employees) {
  const max = employees.reduce((m, e) => {
    const n = Number(/(\d+)$/.exec(e.employeeNumber)?.[1] ?? 0);
    return Math.max(m, n);
  }, 1000);
  return `EMP-${max + 1}`;
}
