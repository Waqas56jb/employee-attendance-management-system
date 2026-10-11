import { createId, diffFields, findOrThrow, logActivity, mutate, notify, ServiceError } from './db';
import { formatMoney, toMinor } from '../utils/currency';
import { nowIso, todayKey } from '../utils/dateUtils';

const AUDITED_FIELDS = ['companyName', 'customerNumber', 'contactPerson', 'email', 'phone', 'billingAddress', 'serviceAddress', 'taxId', 'currency', 'paymentTerms', 'taxRate', 'status', 'notes'];

function assertUnique(draft, data, ignoreId) {
  const number = data.customerNumber.trim().toUpperCase();
  if (draft.customers.some((c) => c.id !== ignoreId && c.customerNumber.toUpperCase() === number)) {
    throw new ServiceError(`Customer reference ${number} is already in use.`, { field: 'customerNumber' });
  }
  const name = data.companyName.trim().toLowerCase();
  if (draft.customers.some((c) => c.id !== ignoreId && c.companyName.toLowerCase() === name)) {
    throw new ServiceError('A customer with this company name already exists.', { field: 'companyName' });
  }
}

function normalize(data) {
  return {
    companyName: data.companyName.trim(),
    customerNumber: data.customerNumber.trim().toUpperCase(),
    contactPerson: data.contactPerson.trim(),
    email: data.email.trim().toLowerCase(),
    phone: data.phone.trim(),
    billingAddress: {
      street: data.billingStreet.trim(),
      postalCode: data.postalCode.trim(),
      city: data.city.trim(),
      country: data.country.trim(),
    },
    serviceAddress: data.serviceStreet?.trim() ?? '',
    taxId: data.taxId?.trim() ?? '',
    currency: data.currency,
    paymentTerms: Number(data.paymentTerms),
    // Empty means "use the default tax rate from invoice settings".
    taxRate: data.taxRate === '' || data.taxRate === undefined || data.taxRate === null ? null : Number(data.taxRate),
    status: data.status,
    notes: data.notes?.trim() ?? '',
  };
}

/** Form values for editing an existing customer. */
export function customerToForm(customer, currentRate) {
  return {
    companyName: customer.companyName,
    customerNumber: customer.customerNumber,
    contactPerson: customer.contactPerson,
    email: customer.email,
    phone: customer.phone,
    billingStreet: customer.billingAddress?.street ?? '',
    serviceStreet: customer.serviceAddress ?? '',
    postalCode: customer.billingAddress?.postalCode ?? '',
    city: customer.billingAddress?.city ?? '',
    country: customer.billingAddress?.country ?? '',
    taxId: customer.taxId ?? '',
    paymentTerms: customer.paymentTerms,
    currency: customer.currency,
    defaultHourlyRate: currentRate ? currentRate.amount / 100 : '',
    taxRate: customer.taxRate ?? '',
    notes: customer.notes ?? '',
    status: customer.status,
  };
}

/** Creates the customer and its initial hourly rate (effective today). */
export function createCustomer(data) {
  return mutate((draft) => {
    assertUnique(draft, data);
    const customer = { id: createId('cus'), ...normalize(data), createdAt: nowIso(), updatedAt: nowIso() };
    draft.customers.push(customer);
    const amount = toMinor(data.defaultHourlyRate, customer.currency);
    draft.hourlyRates.push({
      id: createId('rate'),
      customerId: customer.id,
      amount,
      currency: customer.currency,
      effectiveFrom: todayKey(),
      effectiveTo: null,
      status: 'active',
      notes: 'Initial rate',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
    logActivity(draft, {
      action: 'customer.created',
      entityType: 'customer',
      entityId: customer.id,
      summary: `Added customer ${customer.companyName} at ${formatMoney(amount, customer.currency)}/h`,
      newValues: normalize(data),
    });
    notify(draft, {
      title: 'Customer added',
      message: `${customer.companyName} was added with a default rate of ${formatMoney(amount, customer.currency)}/h.`,
      type: 'customer',
      relatedEntityType: 'customer',
      relatedEntityId: customer.id,
    });
    return customer;
  });
}

/**
 * Updates customer details. Finalized invoices keep their own snapshot of the
 * billing details, so edits here never rewrite issued invoices.
 * Rates are managed separately (rate history) and are not changed here.
 */
export function updateCustomer(id, data) {
  return mutate((draft) => {
    const customer = findOrThrow(draft.customers, id, 'Customer');
    assertUnique(draft, data, id);
    const next = normalize(data);
    if (next.currency !== customer.currency) {
      const hasInvoices = draft.invoices.some((inv) => inv.customerId === id);
      if (hasInvoices) {
        throw new ServiceError('The currency cannot be changed after invoices exist for this customer.', { field: 'currency' });
      }
      draft.hourlyRates.forEach((r) => {
        if (r.customerId === id) r.currency = next.currency;
      });
    }
    const before = { ...customer };
    // Status changes go through setCustomerStatus (archive rules, audit reason).
    Object.assign(customer, next, { status: before.status, updatedAt: nowIso() });
    const diff = diffFields(before, customer, AUDITED_FIELDS);
    if (diff) {
      logActivity(draft, {
        action: 'customer.updated',
        entityType: 'customer',
        entityId: id,
        summary: `Updated customer ${customer.companyName}`,
        previousValues: diff.previous,
        newValues: diff.next,
      });
    }
    return customer;
  });
}

export function setCustomerStatus(id, status, reason = '') {
  return mutate((draft) => {
    const customer = findOrThrow(draft.customers, id, 'Customer');
    if (status === 'archived') {
      const activeProjects = draft.projects.filter((p) => p.customerId === id && ['active', 'planned'].includes(p.status));
      if (activeProjects.length) {
        throw new ServiceError(
          `Complete or archive ${activeProjects.length} active/planned project(s) before archiving this customer.`,
        );
      }
    }
    const previous = customer.status;
    customer.status = status;
    customer.updatedAt = nowIso();
    logActivity(draft, {
      action: 'customer.status_changed',
      entityType: 'customer',
      entityId: id,
      summary: `Set ${customer.companyName} to ${status}`,
      previousValues: { status: previous },
      newValues: { status },
      reason,
    });
    return customer;
  });
}

export function suggestCustomerNumber(customers) {
  const max = customers.reduce((m, c) => Math.max(m, Number(/(\d+)$/.exec(c.customerNumber)?.[1] ?? 0)), 1000);
  return `CUS-${max + 1}`;
}
