import { apiClient } from './apiClient';
import { requireEmployeeId } from './authService';
import { config } from './config';
import { ERROR_CODES, ServiceError } from './errors';
import { getCollection, simulateLatency } from './mockDb';

/**
 * Only fields an employee needs on site are returned. Commercial data
 * (billing rates, invoices, margins) belongs to the admin API and must never
 * be sent to the employee client.
 */
const toEmployeeCustomer = (customer, projectIds) => ({
  id: customer.id,
  companyName: customer.companyName,
  industry: customer.industry ?? null,
  contactPerson: customer.contactPerson ?? null,
  contactRole: customer.contactRole ?? null,
  email: customer.email ?? null,
  phone: customer.phone ?? null,
  address: customer.address ?? null,
  description: customer.description ?? '',
  projectIds,
});

function loadMyCustomers(employeeId) {
  const myProjects = getCollection('projects').filter((p) => p.assignedEmployeeIds?.includes(employeeId));
  const projectIdsByCustomer = myProjects.reduce((acc, p) => {
    (acc[p.customerId] ||= []).push(p.id);
    return acc;
  }, {});
  return getCollection('customers')
    .filter((c) => projectIdsByCustomer[c.id])
    .map((c) => toEmployeeCustomer(c, projectIdsByCustomer[c.id]));
}

export async function getMyCustomers() {
  if (!config.useMockApi) return apiClient.get('/me/customers');
  const employeeId = requireEmployeeId();
  await simulateLatency(300);
  return loadMyCustomers(employeeId);
}

export async function getMyCustomerById(customerId) {
  if (!config.useMockApi) return apiClient.get(`/me/customers/${encodeURIComponent(customerId)}`);
  const employeeId = requireEmployeeId();
  await simulateLatency(250);
  const customer = loadMyCustomers(employeeId).find((c) => c.id === customerId);
  if (!customer) {
    throw new ServiceError('This customer does not exist or is not linked to your assignments.', ERROR_CODES.NOT_FOUND, 404);
  }
  return customer;
}
