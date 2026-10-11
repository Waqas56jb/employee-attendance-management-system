import { apiClient } from './apiClient';
import { requireEmployeeId } from './authService';
import { config } from './config';
import { ERROR_CODES, ServiceError } from './errors';
import { getCollection, simulateLatency } from './mockDb';

export const PROJECT_STATUS = {
  active: { label: 'Active', tone: 'success' },
  upcoming: { label: 'Upcoming', tone: 'info' },
  completed: { label: 'Completed', tone: 'neutral' },
  'on-hold': { label: 'On Hold', tone: 'warning' },
};

/**
 * Shapes a project for the signed-in employee: other employees' assignments
 * are removed, and only this employee's assignment detail is returned.
 */
function toEmployeeProject(project, employeeId, customersById) {
  const customer = customersById[project.customerId];
  return {
    id: project.id,
    name: project.name,
    customerId: project.customerId,
    customerName: customer?.companyName ?? 'Unknown customer',
    description: project.description,
    location: project.location,
    startDate: project.startDate,
    endDate: project.endDate,
    status: project.status,
    instructions: project.instructions ?? [],
    contact: project.contact ?? null,
    assignment: project.assignments?.[employeeId] ?? null,
  };
}

function loadMyProjects(employeeId) {
  const customersById = Object.fromEntries(getCollection('customers').map((c) => [c.id, c]));
  return getCollection('projects')
    .filter((p) => p.assignedEmployeeIds?.includes(employeeId))
    .map((p) => toEmployeeProject(p, employeeId, customersById));
}

export async function getMyProjects() {
  if (!config.useMockApi) return apiClient.get('/me/projects');
  const employeeId = requireEmployeeId();
  await simulateLatency(300);
  return loadMyProjects(employeeId);
}

/** Unassigned and non-existent projects are both reported as "not found" so existence is not leaked. */
export async function getMyProjectById(projectId) {
  if (!config.useMockApi) return apiClient.get(`/me/projects/${encodeURIComponent(projectId)}`);
  const employeeId = requireEmployeeId();
  await simulateLatency(250);
  const project = loadMyProjects(employeeId).find((p) => p.id === projectId);
  if (!project) throw new ServiceError('This project does not exist or is not assigned to you.', ERROR_CODES.NOT_FOUND, 404);
  return project;
}
