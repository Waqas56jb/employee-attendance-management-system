import { createId, diffFields, findOrThrow, logActivity, mutate, notify, ServiceError } from './db';
import { nowIso } from '../utils/dateUtils';

const AUDITED_FIELDS = ['name', 'projectNumber', 'customerId', 'description', 'address', 'startDate', 'endDate', 'status', 'instructions', 'targetHours', 'internalNotes', 'assignedEmployeeIds'];

export const PROJECT_STATUSES = [
  { value: 'planned', label: 'Planned' },
  { value: 'active', label: 'Active' },
  { value: 'on_hold', label: 'On hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
];

function normalize(data) {
  return {
    name: data.name.trim(),
    projectNumber: data.projectNumber.trim().toUpperCase(),
    customerId: data.customerId,
    description: data.description?.trim() ?? '',
    address: data.address.trim(),
    startDate: data.startDate,
    endDate: data.endDate || '',
    status: data.status,
    instructions: data.instructions?.trim() ?? '',
    targetHours: data.targetHours === '' || data.targetHours === undefined || data.targetHours === null ? null : Number(data.targetHours),
    internalNotes: data.internalNotes?.trim() ?? '',
  };
}

function validate(draft, data, existing) {
  const number = data.projectNumber.trim().toUpperCase();
  if (draft.projects.some((p) => p.id !== existing?.id && p.projectNumber.toUpperCase() === number)) {
    throw new ServiceError(`Project reference ${number} is already in use.`, { field: 'projectNumber' });
  }
  const customer = draft.customers.find((c) => c.id === data.customerId);
  if (!customer) throw new ServiceError('Select a valid customer.', { field: 'customerId' });
  if (customer.status === 'archived' && existing?.customerId !== customer.id) {
    throw new ServiceError('Archived customers cannot receive new projects.', { field: 'customerId' });
  }
  if (existing && existing.customerId !== data.customerId && draft.attendance.some((a) => a.projectId === existing.id)) {
    throw new ServiceError('This project already has attendance records, so its customer cannot be changed.', {
      field: 'customerId',
    });
  }
  const previous = existing?.assignedEmployeeIds ?? [];
  (data.assignedEmployeeIds ?? []).forEach((eid) => {
    const employee = draft.employees.find((e) => e.id === eid);
    if (!employee) throw new ServiceError('One of the selected employees no longer exists.', { field: 'assignedEmployeeIds' });
    if (employee.status !== 'active' && !previous.includes(eid)) {
      throw new ServiceError(`${employee.fullName} is ${employee.status} and cannot be assigned.`, { field: 'assignedEmployeeIds' });
    }
  });
}

/** Keeps employee.assignedProjectIds in sync with project.assignedEmployeeIds. */
function syncEmployees(draft, project, employeeIds) {
  const unique = [...new Set(employeeIds)];
  project.assignedEmployeeIds = unique;
  draft.employees.forEach((employee) => {
    const has = employee.assignedProjectIds.includes(project.id);
    const should = unique.includes(employee.id);
    if (should && !has) employee.assignedProjectIds.push(project.id);
    if (!should && has) employee.assignedProjectIds = employee.assignedProjectIds.filter((pid) => pid !== project.id);
  });
}

export function createProject(data) {
  return mutate((draft) => {
    validate(draft, data);
    const project = { id: createId('prj'), ...normalize(data), geo: null, assignedEmployeeIds: [], createdAt: nowIso(), updatedAt: nowIso() };
    syncEmployees(draft, project, data.assignedEmployeeIds ?? []);
    draft.projects.push(project);
    const customer = draft.customers.find((c) => c.id === project.customerId);
    logActivity(draft, {
      action: 'project.created',
      entityType: 'project',
      entityId: project.id,
      summary: `Created project ${project.name} for ${customer.companyName}`,
      newValues: { ...normalize(data), assignedEmployeeIds: project.assignedEmployeeIds },
    });
    if (project.assignedEmployeeIds.length) {
      notify(draft, {
        title: 'Project assignment updated',
        message: `${project.assignedEmployeeIds.length} employee(s) assigned to ${project.name}.`,
        type: 'project',
        relatedEntityType: 'project',
        relatedEntityId: project.id,
      });
    }
    return project;
  });
}

export function updateProject(id, data) {
  return mutate((draft) => {
    const project = findOrThrow(draft.projects, id, 'Project');
    validate(draft, data, project);
    const before = { ...project, assignedEmployeeIds: [...project.assignedEmployeeIds] };
    Object.assign(project, normalize(data), { updatedAt: nowIso() });
    if (data.assignedEmployeeIds) syncEmployees(draft, project, data.assignedEmployeeIds);
    const diff = diffFields(before, project, AUDITED_FIELDS);
    if (diff) {
      logActivity(draft, {
        action: diff.next.assignedEmployeeIds ? 'project.assigned' : 'project.updated',
        entityType: 'project',
        entityId: id,
        summary: `Updated project ${project.name}`,
        previousValues: diff.previous,
        newValues: diff.next,
      });
    }
    if (diff?.next.assignedEmployeeIds) {
      notify(draft, {
        title: 'Project assignment updated',
        message: `${project.name} now has ${project.assignedEmployeeIds.length} assigned employee(s).`,
        type: 'project',
        relatedEntityType: 'project',
        relatedEntityId: id,
      });
    }
    return project;
  });
}

export function updateProjectAssignments(id, employeeIds) {
  return mutate((draft) => {
    const project = findOrThrow(draft.projects, id, 'Project');
    validate(draft, { ...project, assignedEmployeeIds: employeeIds }, project);
    const previous = [...project.assignedEmployeeIds];
    syncEmployees(draft, project, employeeIds);
    project.updatedAt = nowIso();
    const names = (ids) => ids.map((eid) => draft.employees.find((e) => e.id === eid)?.fullName).filter(Boolean);
    logActivity(draft, {
      action: 'project.assigned',
      entityType: 'project',
      entityId: id,
      summary: `Updated team for ${project.name}`,
      previousValues: { employees: names(previous) },
      newValues: { employees: names(project.assignedEmployeeIds) },
    });
    notify(draft, {
      title: 'Project assignment updated',
      message: `${project.name} now has ${project.assignedEmployeeIds.length} assigned employee(s).`,
      type: 'project',
      relatedEntityType: 'project',
      relatedEntityId: id,
    });
    return project;
  });
}

/** Completing or archiving keeps every attendance record and invoice line. */
export function setProjectStatus(id, status, reason = '') {
  return mutate((draft) => {
    const project = findOrThrow(draft.projects, id, 'Project');
    if (['completed', 'archived'].includes(status)) {
      const open = draft.attendance.find((a) => a.projectId === id && a.status === 'active' && !a.checkOutAt);
      if (open) throw new ServiceError('An employee is currently checked in on this project. Close the shift first.');
    }
    const previous = project.status;
    project.status = status;
    project.updatedAt = nowIso();
    logActivity(draft, {
      action: 'project.status_changed',
      entityType: 'project',
      entityId: id,
      summary: `Set project ${project.name} to ${status.replace('_', ' ')}`,
      previousValues: { status: previous },
      newValues: { status },
      reason,
    });
    return project;
  });
}

export function suggestProjectNumber(projects) {
  const max = projects.reduce((m, p) => Math.max(m, Number(/(\d+)$/.exec(p.projectNumber)?.[1] ?? 0)), 2400);
  return `PRJ-${max + 1}`;
}
