import { getCurrentRate, isInvoiceOutstanding } from '../../utils/calculations';
import { sumRecorded } from '../../services/reportService';

/** '' = active and inactive customers (archived hidden by default). */
export const CUSTOMER_STATUS_FILTERS = [
  { value: '', label: 'Active & inactive' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'archived', label: 'Archived' },
];

export const CUSTOMER_STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

export function matchesCustomerStatus(status, filter) {
  if (!filter) return status !== 'archived';
  return status === filter;
}

/** List metrics per customer. All amounts stay in the customer's own currency. */
export function buildCustomerRows({ customers, projects, attendance, invoices, hourlyRates }) {
  const projectsByCustomer = {};
  projects.forEach((p) => {
    (projectsByCustomer[p.customerId] = projectsByCustomer[p.customerId] ?? []).push(p);
  });
  const recordsByCustomer = {};
  attendance.forEach((a) => {
    (recordsByCustomer[a.customerId] = recordsByCustomer[a.customerId] ?? []).push(a);
  });
  return customers.map((c) => {
    const own = projectsByCustomer[c.id] ?? [];
    const outstanding = invoices.filter((inv) => inv.customerId === c.id && isInvoiceOutstanding(inv));
    return {
      ...c,
      projectIds: own.map((p) => p.id),
      activeProjects: own.filter((p) => p.status === 'active').length,
      recordedMinutes: sumRecorded(recordsByCustomer[c.id] ?? []),
      currentRate: getCurrentRate(hourlyRates, c.id, c.currency),
      outstanding: outstanding.reduce((s, inv) => s + inv.balanceDue, 0),
      outstandingCount: outstanding.length,
    };
  });
}

/** Effective tax rate label: customer override or invoice-settings default. */
export function taxRateLabel(customer, defaultTaxRate) {
  if (customer.taxRate === null || customer.taxRate === undefined) return `${defaultTaxRate}% (default from invoice settings)`;
  if (customer.taxRate === 0) return '0% (override — e.g. reverse charge)';
  return `${customer.taxRate}% (customer override)`;
}
