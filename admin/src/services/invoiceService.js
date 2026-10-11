/**
 * Invoice lifecycle
 * -----------------
 *   draft  → finalized → (sent) → partially paid → paid
 *                                 ↘ overdue (unpaid after due date)
 *   finalized/sent/overdue → void (no payments recorded)
 *
 * Drafts can be edited and recalculated. Finalizing assigns a unique number,
 * freezes customer details, lines, rates, quantities and totals, and marks the
 * included attendance records as billed so they cannot be billed twice.
 * Voiding keeps the records linked until an administrator explicitly
 * releases them for re-billing (controlled correction).
 */
import { snapshotCustomer } from '../data/demoData';
import { createId, currentActor, findOrThrow, logActivity, mutate, notify, ServiceError } from './db';
import { getBillingRows } from './billingService';
import {
  calculateDueDate,
  calculateInvoiceTotals,
  calculateLineAmount,
  computeInvoiceStatus,
  groupBillingRowsIntoLines,
  INVOICE_STATUS,
  isLineAdjusted,
  summarizeBillingRows,
} from '../utils/calculations';
import { formatMoney, toMinor } from '../utils/currency';
import { addDaysKey, formatDate, nowIso, todayKey, toDate, toDateKey } from '../utils/dateUtils';
import { endOfMonth } from 'date-fns';
import { allocateInvoiceNumber, draftLabel } from '../utils/invoiceNumber';

export const PAYMENT_METHODS = [
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'other', label: 'Other' },
];

export function invoiceLabel(invoice) {
  return invoice?.invoiceNumber || (invoice ? draftLabel(invoice.id) : '');
}

/** Due date according to the configured rule. */
export function dueDateFor(issueDate, terms, rule = 'issue_plus_terms') {
  if (rule === 'end_of_month_plus_terms') {
    const eom = toDateKey(endOfMonth(toDate(issueDate)));
    return addDaysKey(eom, Number(terms) || 0);
  }
  return calculateDueDate(issueDate, terms);
}

/* -------------------------------- Selectors -------------------------------- */

/**
 * Builds the billing rows and suggested invoice lines for a selection.
 * Used by the invoice wizard and by draft recalculation.
 */
export function prepareInvoiceLines(db, selection, { idFactory } = {}) {
  const rows = getBillingRows(db, {
    customerId: selection.customerId,
    from: selection.billingPeriodStart,
    to: selection.billingPeriodEnd,
    projectId: selection.projectId || '',
    employeeId: selection.employeeId || '',
    currency: selection.currency,
    excludeInvoiceId: selection.excludeInvoiceId,
  });
  const employeesById = Object.fromEntries(db.employees.map((e) => [e.id, e]));
  const projectsById = Object.fromEntries(db.projects.map((p) => [p.id, p]));
  const lines = groupBillingRowsIntoLines(rows, selection.grouping || 'employee_project', {
    employeesById,
    projectsById,
    idFactory: idFactory ?? (() => createId('line')),
  });
  return { rows, lines, summary: summarizeBillingRows(rows) };
}

/* ------------------------------- Validation -------------------------------- */

function normalizeLines(lines) {
  return lines.map((line) => {
    const quantityHours = Math.round((Number(line.quantityHours) || 0) * 100) / 100;
    const hourlyRate = Math.round(Number(line.hourlyRate) || 0);
    const computed = calculateLineAmount(quantityHours, hourlyRate);
    const amount = line.amountOverridden ? Math.round(Number(line.amount) || 0) : computed;
    return {
      ...line,
      description: (line.description ?? '').trim(),
      quantityHours,
      hourlyRate,
      amount,
      adjustmentReason: (line.adjustmentReason ?? '').trim(),
    };
  });
}

function validateDraft(draft, payload, invoiceId) {
  const customer = draft.customers.find((c) => c.id === payload.customerId);
  if (!customer) throw new ServiceError('Select a valid customer.', { field: 'customerId' });
  if (!payload.billingPeriodStart || !payload.billingPeriodEnd || payload.billingPeriodEnd < payload.billingPeriodStart) {
    throw new ServiceError('Select a valid billing period.', { field: 'billingPeriodEnd' });
  }
  if (!payload.issueDate) throw new ServiceError('Issue date is required.', { field: 'issueDate' });
  if (!payload.dueDate || payload.dueDate < payload.issueDate) {
    throw new ServiceError('Due date must be on or after the issue date.', { field: 'dueDate' });
  }
  const lines = normalizeLines(payload.lineItems ?? []);
  if (lines.length === 0) throw new ServiceError('Add at least one invoice line.', { field: 'lineItems' });

  const seen = new Set();
  const rows = getBillingRows(draft, {
    customerId: customer.id,
    from: '',
    to: '',
    currency: payload.currency,
    excludeInvoiceId: invoiceId,
  });
  const rowsById = Object.fromEntries(rows.map((r) => [r.record.id, r]));

  lines.forEach((line, index) => {
    const label = `Line ${index + 1}`;
    if (!line.description) throw new ServiceError(`${label}: a description is required.`, { field: 'lineItems' });
    if (line.quantityHours < 0 || line.hourlyRate < 0 || line.amount < 0) {
      throw new ServiceError(`${label}: quantities and amounts cannot be negative. Use the discount for reductions.`, { field: 'lineItems' });
    }
    if (line.type === 'hours') {
      (line.attendanceRecordIds ?? []).forEach((rid) => {
        if (seen.has(rid)) throw new ServiceError(`${label}: an attendance record appears on more than one line.`, { field: 'lineItems' });
        seen.add(rid);
        const row = rowsById[rid];
        if (!row) throw new ServiceError(`${label}: an included attendance record does not belong to this customer.`, { field: 'lineItems' });
        if (!row.eligible) {
          throw new ServiceError(`${label}: a record from ${formatDate(row.workDate)} can no longer be billed (${row.reason}). Recalculate the draft.`, {
            field: 'lineItems',
            code: 'ineligible',
          });
        }
      });
      if (isLineAdjusted(line) && !line.adjustmentReason) {
        throw new ServiceError(`${label}: enter a reason for changing the attendance-derived quantity or amount.`, { field: 'lineItems' });
      }
    } else if (!line.adjustmentReason) {
      throw new ServiceError(`${label}: additional lines need a reason (e.g. "Materials agreed by email").`, { field: 'lineItems' });
    }
  });

  if (payload.discountType !== 'none' && Number(payload.discountValue) > 0 && !payload.discountReason?.trim()) {
    throw new ServiceError('Enter a reason for the discount.', { field: 'discountReason' });
  }
  const taxRate = Number(payload.taxRate);
  if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) throw new ServiceError('Tax rate must be between 0 and 100 %.', { field: 'taxRate' });

  const discountValue =
    payload.discountType === 'fixed' ? toMinor(payload.discountValue, payload.currency) : Number(payload.discountValue) || 0;
  if (payload.discountType === 'percent' && (discountValue < 0 || discountValue > 100)) {
    throw new ServiceError('Discount percentage must be between 0 and 100.', { field: 'discountValue' });
  }
  const totals = calculateInvoiceTotals({
    lineItems: lines,
    discountType: payload.discountType,
    discountValue,
    taxRate,
  });
  if (payload.discountType === 'fixed' && discountValue > totals.subtotal) {
    throw new ServiceError('The discount cannot exceed the subtotal.', { field: 'discountValue' });
  }
  return { customer, lines, discountValue, taxRate, totals };
}

/* -------------------------------- Mutations -------------------------------- */

/** payload: customer, period, filters, grouping, lines, discount, tax, dates, notes. */
export function saveDraft(payload, invoiceId = null) {
  return mutate((draft) => {
    const { customer, lines, discountValue, taxRate, totals } = validateDraft(draft, payload, invoiceId);
    const actor = currentActor();
    const fields = {
      customerId: customer.id,
      issueDate: payload.issueDate,
      dueDate: payload.dueDate,
      paymentTerms: Number(payload.paymentTerms) || 0,
      billingPeriodStart: payload.billingPeriodStart,
      billingPeriodEnd: payload.billingPeriodEnd,
      projectId: payload.projectId || null,
      employeeId: payload.employeeId || null,
      currency: payload.currency,
      grouping: payload.grouping,
      lineItems: lines,
      discountType: payload.discountType,
      discountValue,
      discountReason: payload.discountReason?.trim() ?? '',
      taxRate,
      taxLabel: payload.taxLabel?.trim() || 'VAT',
      notes: payload.notes?.trim() ?? '',
      ...totals,
      amountPaid: 0,
      balanceDue: totals.total,
      needsRecalculation: false,
      updatedAt: nowIso(),
    };
    let invoice;
    if (invoiceId) {
      invoice = findOrThrow(draft.invoices, invoiceId, 'Invoice');
      if (invoice.status !== INVOICE_STATUS.DRAFT) throw new ServiceError('Only draft invoices can be edited.');
      Object.assign(invoice, fields);
      invoice.auditTrail.push({ at: nowIso(), by: actor.name, action: 'Draft updated' });
    } else {
      invoice = {
        id: createId('inv'),
        invoiceNumber: null,
        customerSnapshot: null,
        status: INVOICE_STATUS.DRAFT,
        createdAt: nowIso(),
        finalizedAt: null,
        sentAt: null,
        voidedAt: null,
        voidReason: '',
        auditTrail: [{ at: nowIso(), by: actor.name, action: 'Draft created from attendance' }],
        ...fields,
      };
      draft.invoices.push(invoice);
      logActivity(draft, {
        action: 'invoice.draft_created',
        entityType: 'invoice',
        entityId: invoice.id,
        summary: `Created draft invoice for ${customer.companyName} (${formatMoney(invoice.total, invoice.currency)})`,
      });
      notify(draft, {
        title: 'Invoice draft created',
        message: `Draft for ${customer.companyName}, ${formatDate(invoice.billingPeriodStart)} – ${formatDate(invoice.billingPeriodEnd)}: ${formatMoney(invoice.total, invoice.currency)}.`,
        type: 'invoice',
        relatedEntityType: 'invoice',
        relatedEntityId: invoice.id,
      });
    }
    const adjustedLines = lines.filter((l) => isLineAdjusted(l) || l.type !== 'hours');
    if (adjustedLines.length) {
      logActivity(draft, {
        action: 'invoice.adjusted',
        entityType: 'invoice',
        entityId: invoice.id,
        summary: `${adjustedLines.length} adjusted/additional line(s) on draft for ${customer.companyName}`,
        previousValues: Object.fromEntries(adjustedLines.map((l) => [l.description, { quantityHours: l.originalQuantityHours ?? null, amount: l.originalAmount ?? null }])),
        newValues: Object.fromEntries(adjustedLines.map((l) => [l.description, { quantityHours: l.quantityHours, amount: l.amount }])),
        reason: adjustedLines.map((l) => l.adjustmentReason).join('; '),
      });
    }
    return invoice;
  });
}

/** Rebuilds attendance-derived lines from current data; additional (custom) lines are kept. */
export function recalculateDraft(id) {
  return mutate((draft) => {
    const invoice = findOrThrow(draft.invoices, id, 'Invoice');
    if (invoice.status !== INVOICE_STATUS.DRAFT) throw new ServiceError('Only drafts can be recalculated.');
    const { lines } = prepareInvoiceLines(draft, { ...invoice, excludeInvoiceId: id });
    const custom = invoice.lineItems.filter((l) => l.type !== 'hours');
    const lostAdjustments = invoice.lineItems.filter((l) => l.type === 'hours' && isLineAdjusted(l)).length;
    invoice.lineItems = [...lines, ...custom];
    Object.assign(
      invoice,
      calculateInvoiceTotals({ lineItems: invoice.lineItems, discountType: invoice.discountType, discountValue: invoice.discountValue, taxRate: invoice.taxRate }),
    );
    invoice.balanceDue = invoice.total;
    invoice.needsRecalculation = false;
    invoice.updatedAt = nowIso();
    invoice.auditTrail.push({
      at: nowIso(),
      by: currentActor().name,
      action: `Recalculated from current attendance${lostAdjustments ? ` (${lostAdjustments} manual line adjustment(s) reset)` : ''}`,
    });
    return { invoice, lostAdjustments };
  });
}

export function deleteDraft(id) {
  return mutate((draft) => {
    const invoice = findOrThrow(draft.invoices, id, 'Invoice');
    if (invoice.status !== INVOICE_STATUS.DRAFT) {
      throw new ServiceError('Finalized invoices are financial records and cannot be deleted. Void the invoice instead.');
    }
    draft.invoices = draft.invoices.filter((i) => i.id !== id);
    logActivity(draft, {
      action: 'invoice.draft_deleted',
      entityType: 'invoice',
      entityId: id,
      summary: `Deleted draft invoice (${formatMoney(invoice.total, invoice.currency)})`,
    });
    return true;
  });
}

/**
 * Finalization: re-validates every included record, assigns the next unique
 * invoice number, freezes the customer snapshot and marks records as billed.
 */
export function finalizeInvoice(id) {
  return mutate((draft) => {
    const invoice = findOrThrow(draft.invoices, id, 'Invoice');
    if (invoice.status !== INVOICE_STATUS.DRAFT) throw new ServiceError('This invoice is already finalized.');
    if (invoice.needsRecalculation) {
      throw new ServiceError('Attendance on this draft changed. Recalculate the draft before finalizing.', { code: 'needs_recalculation' });
    }
    const { customer } = validateDraft(draft, { ...invoice, discountValue: invoice.discountType === 'fixed' ? invoice.discountValue / 100 : invoice.discountValue }, id);
    const ids = invoice.lineItems.flatMap((l) => l.attendanceRecordIds ?? []);
    const alreadyBilled = draft.attendance.filter((a) => ids.includes(a.id) && a.invoiceId && a.invoiceId !== id);
    if (alreadyBilled.length) {
      throw new ServiceError(`${alreadyBilled.length} record(s) are already billed on another invoice.`, { code: 'duplicate_billing' });
    }
    const { invoiceNumber, nextSequence } = allocateInvoiceNumber(
      draft.invoiceSettings,
      draft.invoices.map((i) => i.invoiceNumber),
      toDate(invoice.issueDate)?.getFullYear() ?? new Date().getFullYear(),
    );
    draft.invoiceSettings.nextSequence = nextSequence;
    const actor = currentActor();
    invoice.invoiceNumber = invoiceNumber;
    invoice.customerSnapshot = snapshotCustomer(customer);
    invoice.finalizedAt = nowIso();
    invoice.finalizedBy = actor.name;
    invoice.amountPaid = 0;
    invoice.balanceDue = invoice.total;
    invoice.status = computeInvoiceStatus(invoice);
    invoice.auditTrail.push({ at: invoice.finalizedAt, by: actor.name, action: `Invoice finalized as ${invoiceNumber}` });
    draft.attendance.forEach((a) => {
      if (ids.includes(a.id)) {
        a.invoiceId = invoice.id;
        a.billingHistory = [...(a.billingHistory ?? []), { at: invoice.finalizedAt, invoiceId: invoice.id, action: 'billed' }];
      }
    });
    logActivity(draft, {
      action: 'invoice.finalized',
      entityType: 'invoice',
      entityId: invoice.id,
      summary: `Finalized ${invoiceNumber} for ${customer.companyName} (${formatMoney(invoice.total, invoice.currency)})`,
      newValues: { total: invoice.total, records: ids.length },
    });
    return invoice;
  });
}

/** Records that the invoice was delivered outside the app. No email is sent. */
export function markInvoiceSent(id) {
  return mutate((draft) => {
    const invoice = findOrThrow(draft.invoices, id, 'Invoice');
    if (!invoice.finalizedAt || invoice.voidedAt) throw new ServiceError('Only finalized invoices can be marked as sent.');
    if (invoice.sentAt) throw new ServiceError('This invoice is already marked as sent.');
    invoice.sentAt = nowIso();
    invoice.status = computeInvoiceStatus(invoice);
    invoice.auditTrail.push({ at: invoice.sentAt, by: currentActor().name, action: 'Marked as sent (delivered outside the app)' });
    logActivity(draft, { action: 'invoice.sent', entityType: 'invoice', entityId: id, summary: `Marked ${invoice.invoiceNumber} as sent` });
    return invoice;
  });
}

/** Accounting record of a payment received. No payment is processed. */
export function recordPayment(invoiceId, data) {
  return mutate((draft) => {
    const invoice = findOrThrow(draft.invoices, invoiceId, 'Invoice');
    if (!invoice.finalizedAt) throw new ServiceError('Finalize the invoice before recording payments.');
    if (invoice.voidedAt) throw new ServiceError('Payments cannot be recorded on a void invoice.');
    const amount = toMinor(data.amount, invoice.currency);
    if (amount <= 0) throw new ServiceError('Payment amount must be positive.', { field: 'amount' });
    if (amount > invoice.balanceDue) {
      throw new ServiceError(`Amount exceeds the outstanding balance of ${formatMoney(invoice.balanceDue, invoice.currency)}. Overpayments are not supported.`, {
        field: 'amount',
      });
    }
    if (data.paymentDate > todayKey()) throw new ServiceError('Payment date cannot be in the future.', { field: 'paymentDate' });
    if (data.paymentDate < invoice.issueDate) throw new ServiceError('Payment date cannot be before the invoice date.', { field: 'paymentDate' });
    const actor = currentActor();
    const payment = {
      id: createId('pay'),
      invoiceId,
      paymentDate: data.paymentDate,
      amount,
      method: data.method,
      reference: data.reference?.trim() ?? '',
      notes: data.notes?.trim() ?? '',
      recordedAt: nowIso(),
      recordedBy: actor.name,
    };
    draft.payments.push(payment);
    const previousStatus = invoice.status;
    invoice.amountPaid += amount;
    invoice.balanceDue = invoice.total - invoice.amountPaid;
    invoice.status = computeInvoiceStatus(invoice);
    invoice.updatedAt = nowIso();
    invoice.auditTrail.push({ at: payment.recordedAt, by: actor.name, action: `Payment recorded: ${formatMoney(amount, invoice.currency)} (${data.method.replace('_', ' ')})` });
    logActivity(draft, {
      action: 'invoice.payment_recorded',
      entityType: 'invoice',
      entityId: invoiceId,
      summary: `Recorded ${formatMoney(amount, invoice.currency)} payment on ${invoice.invoiceNumber}`,
      previousValues: { status: previousStatus, amountPaid: invoice.amountPaid - amount },
      newValues: { status: invoice.status, amountPaid: invoice.amountPaid },
    });
    const customer = draft.customers.find((c) => c.id === invoice.customerId);
    notify(draft, {
      title: invoice.status === INVOICE_STATUS.PAID ? 'Invoice paid' : 'Payment recorded',
      message:
        invoice.status === INVOICE_STATUS.PAID
          ? `${invoice.invoiceNumber} from ${customer?.companyName} is paid in full.`
          : `${formatMoney(amount, invoice.currency)} received for ${invoice.invoiceNumber}; ${formatMoney(invoice.balanceDue, invoice.currency)} outstanding.`,
      type: 'payment',
      relatedEntityType: 'invoice',
      relatedEntityId: invoiceId,
    });
    return { invoice, payment };
  });
}

/**
 * Voids a finalized invoice. Its number and history stay on record and its
 * attendance remains linked — use releaseVoidedRecords to re-bill.
 */
export function voidInvoice(id, reason) {
  return mutate((draft) => {
    const invoice = findOrThrow(draft.invoices, id, 'Invoice');
    if (!invoice.finalizedAt) throw new ServiceError('Drafts are deleted, not voided.');
    if (invoice.voidedAt) throw new ServiceError('This invoice is already void.');
    if (invoice.amountPaid > 0) {
      throw new ServiceError('Invoices with recorded payments cannot be voided. A credit note or refund process is required (backend accounting).');
    }
    invoice.voidedAt = nowIso();
    invoice.voidReason = reason.trim();
    invoice.status = INVOICE_STATUS.VOID;
    invoice.auditTrail.push({ at: invoice.voidedAt, by: currentActor().name, action: `Invoice voided: ${invoice.voidReason}` });
    logActivity(draft, {
      action: 'invoice.voided',
      entityType: 'invoice',
      entityId: id,
      summary: `Voided ${invoice.invoiceNumber} (${formatMoney(invoice.total, invoice.currency)})`,
      reason: invoice.voidReason,
    });
    return invoice;
  });
}

/** Controlled correction: makes a void invoice's attendance billable again. */
export function releaseVoidedRecords(id, reason) {
  return mutate((draft) => {
    const invoice = findOrThrow(draft.invoices, id, 'Invoice');
    if (!invoice.voidedAt) throw new ServiceError('Only records from void invoices can be released.');
    if (invoice.billingReleasedAt) throw new ServiceError('Records of this invoice were already released.');
    const at = nowIso();
    const released = [];
    draft.attendance.forEach((a) => {
      if (a.invoiceId === id) {
        a.invoiceId = null;
        a.billingHistory = [...(a.billingHistory ?? []), { at, invoiceId: id, action: 'released', reason: reason.trim() }];
        released.push(a.id);
      }
    });
    invoice.billingReleasedAt = at;
    invoice.billingReleaseReason = reason.trim();
    invoice.releasedAttendanceIds = released;
    invoice.auditTrail.push({ at, by: currentActor().name, action: `${released.length} attendance record(s) released for re-billing: ${reason.trim()}` });
    logActivity(draft, {
      action: 'invoice.records_released',
      entityType: 'invoice',
      entityId: id,
      summary: `Released ${released.length} record(s) from void ${invoice.invoiceNumber} for re-billing`,
      reason: reason.trim(),
    });
    return { invoice, released: released.length };
  });
}

/** Pre-filled form values for a new invoice. */
export function newInvoiceDefaults(db, customerId) {
  const customer = db.customers.find((c) => c.id === customerId);
  const settings = db.invoiceSettings;
  const issueDate = todayKey();
  const terms = customer?.paymentTerms ?? settings.defaultPaymentTerms;
  const taxRate = customer?.taxRate ?? settings.defaultTaxRate;
  return {
    issueDate,
    paymentTerms: terms,
    dueDate: dueDateFor(issueDate, terms, settings.dueDateRule),
    currency: customer?.currency ?? settings.currency,
    taxRate,
    taxLabel: taxRate === 0 ? 'VAT (reverse charge)' : 'VAT',
    notes: settings.defaultNotes,
    grouping: settings.defaultGrouping,
    discountType: 'none',
    discountValue: 0,
    discountReason: '',
  };
}
