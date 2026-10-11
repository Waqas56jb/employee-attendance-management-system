/**
 * Hourly rates and billable-hours selection.
 *
 * Rates are a dated history per customer. A work date is billed at the rate
 * effective on that date. Changing rates never touches finalized invoices,
 * which store their own frozen line rates.
 */
import { createId, findOrThrow, logActivity, mutate, notify, ServiceError } from './db';
import {
  buildBillingRows,
  findApplicableRate,
  findOverlappingRates,
  getBillableMinutes,
  getRateStatus,
  INVOICE_STATUS,
  minutesToHours,
  calculateLineAmount,
  RATE_STATUS,
} from '../utils/calculations';
import { formatMoney, toMinor } from '../utils/currency';
import { addDaysKey, formatDate, isInDateRange, nowIso, todayKey } from '../utils/dateUtils';

function customerName(draft, id) {
  return draft.customers.find((c) => c.id === id)?.companyName ?? 'Customer';
}

/**
 * Creates or schedules a rate. If an open-ended rate is currently in force
 * and the new one starts later, the open-ended rate is ended the day before
 * (a "scheduled rate change"). Any other overlap is rejected.
 */
export function createRate(data) {
  return mutate((draft) => {
    const customer = findOrThrow(draft.customers, data.customerId, 'Customer');
    const candidate = {
      id: createId('rate'),
      customerId: customer.id,
      amount: toMinor(data.amount, data.currency),
      currency: data.currency,
      effectiveFrom: data.effectiveFrom,
      effectiveTo: data.effectiveTo || null,
      status: RATE_STATUS.ACTIVE,
      notes: data.notes?.trim() ?? '',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    if (candidate.currency !== customer.currency) {
      throw new ServiceError(`Rates for ${customer.companyName} must be in ${customer.currency}.`, { field: 'currency' });
    }
    if (!candidate.effectiveTo) {
      // An open-ended rate stops the day before the next already-scheduled rate.
      const later = draft.hourlyRates
        .filter((r) => r.customerId === customer.id && r.currency === candidate.currency && r.status !== RATE_STATUS.INACTIVE && r.effectiveFrom > candidate.effectiveFrom)
        .sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom))[0];
      if (later) candidate.effectiveTo = addDaysKey(later.effectiveFrom, -1);
    }
    const overlaps = findOverlappingRates(draft.hourlyRates, candidate);
    const closed = [];
    overlaps.forEach((rate) => {
      // A rate that started earlier is shortened to end the day before the new one,
      // provided it would not otherwise continue after the new rate ends.
      const rateEnd = rate.effectiveTo || '9999-12-31';
      const candidateEnd = candidate.effectiveTo || '9999-12-31';
      const canSplit = rate.effectiveFrom < candidate.effectiveFrom && rateEnd <= candidateEnd;
      if (!canSplit) {
        throw new ServiceError(
          `Overlaps the ${formatMoney(rate.amount, rate.currency)}/h rate (${formatDate(rate.effectiveFrom)} – ${rate.effectiveTo ? formatDate(rate.effectiveTo) : 'open'}). Adjust the dates or deactivate that rate.`,
          { field: 'effectiveFrom' },
        );
      }
      closed.push(rate);
    });
    closed.forEach((rate) => {
      rate.effectiveTo = addDaysKey(candidate.effectiveFrom, -1);
      rate.updatedAt = nowIso();
    });
    draft.hourlyRates.push(candidate);
    const previous = closed[0];
    const scheduled = candidate.effectiveFrom > todayKey();
    logActivity(draft, {
      action: 'rate.created',
      entityType: 'customer',
      entityId: customer.id,
      summary: `${scheduled ? 'Scheduled' : 'Set'} ${formatMoney(candidate.amount, candidate.currency)}/h for ${customer.companyName} from ${formatDate(candidate.effectiveFrom)}`,
      previousValues: previous ? { amount: previous.amount, effectiveTo: previous.effectiveTo } : null,
      newValues: { amount: candidate.amount, effectiveFrom: candidate.effectiveFrom, effectiveTo: candidate.effectiveTo },
      reason: candidate.notes,
    });
    notify(draft, {
      title: scheduled ? 'Hourly rate scheduled' : 'Hourly rate updated',
      message: `${customer.companyName}: ${previous ? `${formatMoney(previous.amount, previous.currency)}/h → ` : ''}${formatMoney(candidate.amount, candidate.currency)}/h from ${formatDate(candidate.effectiveFrom)}.`,
      type: 'billing',
      relatedEntityType: 'customer',
      relatedEntityId: customer.id,
    });
    return candidate;
  });
}

/**
 * Only rates that have not taken effect yet can be edited freely. Rates that
 * are (or were) in force may only have their end date set, so historical
 * billing calculations never change retroactively.
 */
export function updateRate(id, data) {
  return mutate((draft) => {
    const rate = findOrThrow(draft.hourlyRates, id, 'Rate');
    const status = getRateStatus(rate);
    const before = { ...rate };
    if (status === RATE_STATUS.SCHEDULED) {
      Object.assign(rate, {
        amount: toMinor(data.amount, rate.currency),
        effectiveFrom: data.effectiveFrom,
        effectiveTo: data.effectiveTo || null,
        notes: data.notes?.trim() ?? rate.notes,
      });
      if (rate.effectiveFrom <= todayKey()) {
        throw new ServiceError('A scheduled rate must start in the future. Create a new rate to change the current one.', { field: 'effectiveFrom' });
      }
    } else {
      if (toMinor(data.amount, rate.currency) !== rate.amount || data.effectiveFrom !== rate.effectiveFrom) {
        throw new ServiceError('This rate is already in force. Schedule a new rate instead of changing its amount or start date.', { field: 'amount' });
      }
      const end = data.effectiveTo || null;
      if (end && end < rate.effectiveFrom) throw new ServiceError('End date must be on or after the start date.', { field: 'effectiveTo' });
      rate.effectiveTo = end;
      rate.notes = data.notes?.trim() ?? rate.notes;
    }
    const overlaps = findOverlappingRates(draft.hourlyRates, rate);
    if (overlaps.length) {
      throw new ServiceError('These dates overlap another active rate for this customer.', { field: 'effectiveFrom' });
    }
    rate.updatedAt = nowIso();
    logActivity(draft, {
      action: 'rate.updated',
      entityType: 'customer',
      entityId: rate.customerId,
      summary: `Updated ${formatMoney(rate.amount, rate.currency)}/h rate for ${customerName(draft, rate.customerId)}`,
      previousValues: { amount: before.amount, effectiveFrom: before.effectiveFrom, effectiveTo: before.effectiveTo },
      newValues: { amount: rate.amount, effectiveFrom: rate.effectiveFrom, effectiveTo: rate.effectiveTo },
    });
    return rate;
  });
}

/** Deactivating a rate leaves its work dates without a rate → flagged for review, never guessed. */
export function deactivateRate(id, reason) {
  return mutate((draft) => {
    const rate = findOrThrow(draft.hourlyRates, id, 'Rate');
    if (rate.status === RATE_STATUS.INACTIVE) throw new ServiceError('This rate is already inactive.');
    rate.status = RATE_STATUS.INACTIVE;
    rate.inactiveReason = reason.trim();
    rate.updatedAt = nowIso();
    draft.invoices
      .filter((inv) => inv.status === INVOICE_STATUS.DRAFT && inv.lineItems.some((l) => l.rateId === id))
      .forEach((inv) => {
        inv.needsRecalculation = true;
      });
    logActivity(draft, {
      action: 'rate.deactivated',
      entityType: 'customer',
      entityId: rate.customerId,
      summary: `Deactivated ${formatMoney(rate.amount, rate.currency)}/h rate for ${customerName(draft, rate.customerId)}`,
      reason: reason.trim(),
    });
    notify(draft, {
      title: 'Hourly rate deactivated',
      message: `${customerName(draft, rate.customerId)}: ${formatMoney(rate.amount, rate.currency)}/h is no longer applied. Affected hours will need a valid rate.`,
      type: 'billing',
      relatedEntityType: 'customer',
      relatedEntityId: rate.customerId,
    });
    return rate;
  });
}

/* --------------------------------- Selectors -------------------------------- */

/** Rates with their derived display status, newest first. */
export function listRates(db, customerId) {
  return db.hourlyRates
    .filter((r) => !customerId || r.customerId === customerId)
    .map((r) => ({ ...r, displayStatus: getRateStatus(r) }))
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
}

/**
 * Attendance records for a billing selection with eligibility, rate and amounts.
 * filters: { customerId, from, to, projectId, employeeId, currency, excludeInvoiceId }
 */
export function getBillingRows(db, filters) {
  const records = db.attendance.filter(
    (a) =>
      (!filters.customerId || a.customerId === filters.customerId) &&
      (!filters.projectId || a.projectId === filters.projectId) &&
      (!filters.employeeId || a.employeeId === filters.employeeId) &&
      isInDateRange(a.checkInAt, filters.from, filters.to),
  );
  const currency = filters.currency || db.customers.find((c) => c.id === filters.customerId)?.currency;
  return buildBillingRows(records, {
    rates: db.hourlyRates,
    invoices: db.invoices,
    currency,
    excludeInvoiceId: filters.excludeInvoiceId,
    reviewShiftsOverHours: db.workingHours.reviewShiftsOverHours,
  }).sort((a, b) => a.record.checkInAt.localeCompare(b.record.checkInAt));
}

/**
 * Effect of a proposed rate on not-yet-invoiced, approved work from its start date.
 * Finalized invoices are listed separately because they will not change.
 */
export function previewRateImpact(db, { customerId, amount, effectiveFrom, effectiveTo, currency }) {
  if (!customerId || !effectiveFrom || !amount) return null;
  const amountMinor = toMinor(amount, currency);
  const rows = getBillingRows(db, { customerId, from: effectiveFrom, to: effectiveTo || '', currency });
  const affected = rows.filter((r) => !r.record.invoiceId && r.record.checkOutAt && r.record.status !== 'cancelled');
  const minutes = affected.reduce((s, r) => s + getBillableMinutes(r.record), 0);
  const currentAmount = affected.reduce((s, r) => s + (r.rate ? r.amount : 0), 0);
  const newAmount = affected.reduce((s, r) => s + calculateLineAmount(minutesToHours(getBillableMinutes(r.record)), amountMinor), 0);
  const billedRecords = rows.filter((r) => r.record.invoiceId).length;
  const draftInvoices = db.invoices.filter(
    (inv) => inv.customerId === customerId && inv.status === INVOICE_STATUS.DRAFT && inv.billingPeriodEnd >= effectiveFrom,
  );
  const current = findApplicableRate(db.hourlyRates, customerId, effectiveFrom, currency);
  return {
    unbilledRecords: affected.length,
    unbilledHours: minutesToHours(minutes),
    currentAmount,
    newAmount,
    difference: newAmount - currentAmount,
    billedRecords,
    draftInvoices,
    currentRate: current,
    isFuture: effectiveFrom > todayKey(),
  };
}
