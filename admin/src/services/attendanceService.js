/**
 * Attendance administration.
 *
 * Employees create check-in/check-out records in the employee app (client/).
 * Administrators can review, correct, close abandoned shifts, cancel
 * duplicates and add manual records. Every change keeps an audit entry with
 * the original values, new values, reason, timestamp and administrator.
 */
import { createId, currentActor, findOrThrow, logActivity, mutate, notify, ServiceError } from './db';
import { ATTENDANCE_STATUS, calculateRecordedMinutes, getBillableMinutes, INVOICE_STATUS, validateShiftTimes } from '../utils/calculations';
import { formatDateTime, nowIso, toDate } from '../utils/dateUtils';
import { formatDuration } from '../utils/formatters';

const TRACKED = ['checkInAt', 'checkOutAt', 'recordedDurationMinutes', 'billableDurationMinutes', 'customerId', 'projectId', 'checkInNote', 'checkOutNote', 'status'];

function snapshot(record) {
  return Object.fromEntries(TRACKED.map((k) => [k, record[k] ?? null]));
}

function employeeName(draft, id) {
  return draft.employees.find((e) => e.id === id)?.fullName ?? 'Employee';
}

/** Ensures the project exists and belongs to the selected customer. */
function assertProjectCustomer(draft, customerId, projectId) {
  const project = draft.projects.find((p) => p.id === projectId);
  if (!project) throw new ServiceError('Select a valid project.', { field: 'projectId' });
  if (project.customerId !== customerId) {
    throw new ServiceError('The selected project does not belong to the selected customer.', { field: 'projectId' });
  }
  return project;
}

/** Blocks overlapping shifts and a second simultaneous active shift. */
function assertNoOverlap(draft, { id, employeeId, checkInAt, checkOutAt }) {
  const start = toDate(checkInAt).getTime();
  const end = checkOutAt ? toDate(checkOutAt).getTime() : Number.POSITIVE_INFINITY;
  draft.attendance.forEach((other) => {
    if (other.id === id || other.employeeId !== employeeId || other.status === ATTENDANCE_STATUS.CANCELLED) return;
    const oStart = toDate(other.checkInAt).getTime();
    const oEnd = other.checkOutAt ? toDate(other.checkOutAt).getTime() : Number.POSITIVE_INFINITY;
    if (!checkOutAt && !other.checkOutAt) {
      throw new ServiceError(`${employeeName(draft, employeeId)} already has an active shift. An employee cannot have two simultaneous active shifts.`, {
        field: 'checkOutAt',
      });
    }
    if (start < oEnd && oStart < end) {
      throw new ServiceError(
        `This overlaps another shift for ${employeeName(draft, employeeId)} (${formatDateTime(other.checkInAt)}${other.checkOutAt ? ` – ${formatDateTime(other.checkOutAt)}` : ', still open'}).`,
        { field: 'checkInAt' },
      );
    }
  });
}

/**
 * Finds the invoice (draft or finalized) that contains a record and flags it:
 * drafts are marked for recalculation; finalized invoices keep their frozen
 * snapshot but receive an audit note.
 */
function flagAffectedInvoices(draft, record, description) {
  const affected = [];
  draft.invoices.forEach((invoice) => {
    const contains = invoice.lineItems.some((l) => (l.attendanceRecordIds ?? []).includes(record.id));
    if (!contains) return;
    affected.push(invoice);
    if (invoice.status === INVOICE_STATUS.DRAFT) {
      invoice.needsRecalculation = true;
      invoice.updatedAt = nowIso();
      notify(draft, {
        title: 'Draft invoice needs recalculation',
        message: `An attendance record on draft invoice for ${draft.customers.find((c) => c.id === invoice.customerId)?.companyName ?? 'customer'} was changed.`,
        type: 'invoice',
        relatedEntityType: 'invoice',
        relatedEntityId: invoice.id,
      });
    } else {
      invoice.auditTrail.push({
        at: nowIso(),
        by: currentActor().name,
        action: `Attendance record changed after finalization (${description}). Invoice snapshot unchanged — issue a correction if needed.`,
      });
      invoice.hasPostFinalizationChanges = true;
    }
  });
  return affected;
}

/** Describes whether a record is already part of an invoice (for UI warnings). */
export function getBillingImpact(db, recordId) {
  const record = db.attendance.find((a) => a.id === recordId);
  if (!record) return null;
  const invoice = db.invoices.find((inv) => inv.lineItems.some((l) => (l.attendanceRecordIds ?? []).includes(recordId)) && inv.status !== INVOICE_STATUS.VOID);
  if (!invoice) return null;
  return {
    invoice,
    finalized: invoice.status !== INVOICE_STATUS.DRAFT,
    message:
      invoice.status === INVOICE_STATUS.DRAFT
        ? 'This record is included in a draft invoice. The draft will be flagged for recalculation.'
        : `This record is billed on finalized invoice ${invoice.invoiceNumber}. The invoice will not change; issue a correction if the billed hours are wrong.`,
  };
}

function pushHistory(draft, record, { type, reason, previous }) {
  const actor = currentActor();
  const entry = {
    id: createId('cor'),
    at: nowIso(),
    by: actor.name,
    byId: actor.id,
    type,
    reason,
    previous,
    next: snapshot(record),
  };
  record.correctionHistory = [...(record.correctionHistory ?? []), entry];
  record.updatedAt = entry.at;
  record.updatedBy = actor.name;
  return entry;
}

/**
 * Manual correction of times, customer/project and notes.
 * A correction reason is mandatory. Recorded duration is recalculated from
 * the timestamps; any previous billable adjustment is cleared when times
 * change (the old value stays in the audit history).
 */
export function correctAttendance(id, values) {
  return mutate((draft) => {
    const record = findOrThrow(draft.attendance, id, 'Attendance record');
    if (record.status === ATTENDANCE_STATUS.CANCELLED) {
      throw new ServiceError('Cancelled records cannot be corrected. Restore the record first.');
    }
    const checkOutAt = values.checkOutAt || null;
    const timeError = validateShiftTimes(values.checkInAt, checkOutAt);
    if (timeError) throw new ServiceError(timeError, { field: checkOutAt && timeError.includes('Check-out') ? 'checkOutAt' : 'checkInAt' });
    if (record.checkOutAt && !checkOutAt) {
      throw new ServiceError('A completed shift cannot be reopened. Enter a check-out time.', { field: 'checkOutAt' });
    }
    assertProjectCustomer(draft, values.customerId, values.projectId);
    assertNoOverlap(draft, { id, employeeId: record.employeeId, checkInAt: values.checkInAt, checkOutAt });

    const previous = snapshot(record);
    const timesChanged = previous.checkInAt !== values.checkInAt || previous.checkOutAt !== checkOutAt;
    Object.assign(record, {
      checkInAt: values.checkInAt,
      checkOutAt,
      customerId: values.customerId,
      projectId: values.projectId,
      checkInNote: values.checkInNote ?? record.checkInNote,
      checkOutNote: values.checkOutNote ?? record.checkOutNote,
      recordedDurationMinutes: calculateRecordedMinutes(values.checkInAt, checkOutAt),
    });
    if (timesChanged && record.billableDurationMinutes !== null) record.billableDurationMinutes = null;
    record.status = checkOutAt ? ATTENDANCE_STATUS.CORRECTED : ATTENDANCE_STATUS.ACTIVE;
    if (checkOutAt) {
      record.reviewedAt = nowIso();
      record.reviewedBy = currentActor().name;
    }
    const entry = pushHistory(draft, record, { type: 'correction', reason: values.reason.trim(), previous });
    const affected = flagAffectedInvoices(draft, record, values.reason.trim());
    logActivity(draft, {
      action: 'attendance.corrected',
      entityType: 'attendance',
      entityId: id,
      summary: `Corrected attendance for ${employeeName(draft, record.employeeId)} (${formatDuration(previous.recordedDurationMinutes)} → ${formatDuration(record.recordedDurationMinutes)})`,
      previousValues: entry.previous,
      newValues: entry.next,
      reason: entry.reason,
    });
    return { record, affectedInvoices: affected.map((i) => i.id) };
  });
}

/** Administrative closing of an abandoned (open) shift. Never silent: reason required. */
export function closeOpenShift(id, { checkOutAt, reason }) {
  return mutate((draft) => {
    const record = findOrThrow(draft.attendance, id, 'Attendance record');
    if (record.checkOutAt || record.status !== ATTENDANCE_STATUS.ACTIVE) {
      throw new ServiceError('This shift is already closed.');
    }
    const timeError = validateShiftTimes(record.checkInAt, checkOutAt);
    if (timeError) throw new ServiceError(timeError, { field: 'checkOutAt' });
    assertNoOverlap(draft, { id, employeeId: record.employeeId, checkInAt: record.checkInAt, checkOutAt });
    const previous = snapshot(record);
    record.checkOutAt = checkOutAt;
    record.recordedDurationMinutes = calculateRecordedMinutes(record.checkInAt, checkOutAt);
    record.status = ATTENDANCE_STATUS.CORRECTED;
    record.checkOutNote = `[Closed by administrator] ${record.checkOutNote ?? ''}`.trim();
    record.reviewedAt = nowIso();
    record.reviewedBy = currentActor().name;
    const entry = pushHistory(draft, record, { type: 'admin_checkout', reason: reason.trim(), previous });
    logActivity(draft, {
      action: 'attendance.shift_closed',
      entityType: 'attendance',
      entityId: id,
      summary: `Closed open shift for ${employeeName(draft, record.employeeId)} at ${formatDateTime(checkOutAt)} (administrative correction)`,
      previousValues: entry.previous,
      newValues: entry.next,
      reason: entry.reason,
    });
    return record;
  });
}

/** Approves a record that needed review so it can be billed. */
export function approveAttendance(id, note = '') {
  return mutate((draft) => {
    const record = findOrThrow(draft.attendance, id, 'Attendance record');
    if (!record.checkOutAt) throw new ServiceError('Open shifts cannot be approved. Close the shift first.');
    if (record.status === ATTENDANCE_STATUS.CANCELLED) throw new ServiceError('Cancelled records cannot be approved.');
    const previous = snapshot(record);
    record.status = ATTENDANCE_STATUS.COMPLETED;
    record.reviewedAt = nowIso();
    record.reviewedBy = currentActor().name;
    const entry = pushHistory(draft, record, { type: 'approval', reason: note.trim() || 'Reviewed and approved', previous });
    logActivity(draft, {
      action: 'attendance.approved',
      entityType: 'attendance',
      entityId: id,
      summary: `Approved attendance for ${employeeName(draft, record.employeeId)} (${formatDuration(record.recordedDurationMinutes)})`,
      previousValues: { status: previous.status },
      newValues: { status: record.status },
      reason: entry.reason,
    });
    return record;
  });
}

export function markForReview(id, reason) {
  return mutate((draft) => {
    const record = findOrThrow(draft.attendance, id, 'Attendance record');
    if (!record.checkOutAt) throw new ServiceError('Open shifts are already excluded from billing.');
    if (record.invoiceId) {
      const inv = draft.invoices.find((i) => i.id === record.invoiceId);
      throw new ServiceError(`This record is already billed on ${inv?.invoiceNumber ?? 'an invoice'} and cannot be put back into review.`);
    }
    const previous = snapshot(record);
    record.status = ATTENDANCE_STATUS.NEEDS_REVIEW;
    record.reviewedAt = null;
    pushHistory(draft, record, { type: 'flagged', reason: reason.trim(), previous });
    flagAffectedInvoices(draft, record, 'flagged for review');
    logActivity(draft, {
      action: 'attendance.flagged',
      entityType: 'attendance',
      entityId: id,
      summary: `Flagged attendance of ${employeeName(draft, record.employeeId)} for review`,
      reason: reason.trim(),
    });
    notify(draft, {
      title: 'Attendance record needs review',
      message: `${employeeName(draft, record.employeeId)} — ${formatDateTime(record.checkInAt)}: ${reason.trim()}`,
      type: 'attendance',
      relatedEntityType: 'attendance',
      relatedEntityId: id,
    });
    return record;
  });
}

/** Cancels a duplicate or invalid record. Billed records cannot be cancelled. */
export function cancelAttendance(id, reason) {
  return mutate((draft) => {
    const record = findOrThrow(draft.attendance, id, 'Attendance record');
    if (record.invoiceId) {
      throw new ServiceError('This record is billed on a finalized invoice and cannot be cancelled.');
    }
    if (record.status === ATTENDANCE_STATUS.CANCELLED) throw new ServiceError('This record is already cancelled.');
    const previous = snapshot(record);
    record.status = ATTENDANCE_STATUS.CANCELLED;
    pushHistory(draft, record, { type: 'cancellation', reason: reason.trim(), previous });
    flagAffectedInvoices(draft, record, 'record cancelled');
    logActivity(draft, {
      action: 'attendance.cancelled',
      entityType: 'attendance',
      entityId: id,
      summary: `Cancelled attendance record of ${employeeName(draft, record.employeeId)} (${formatDateTime(record.checkInAt)})`,
      reason: reason.trim(),
    });
    return record;
  });
}

export function restoreAttendance(id, reason) {
  return mutate((draft) => {
    const record = findOrThrow(draft.attendance, id, 'Attendance record');
    if (record.status !== ATTENDANCE_STATUS.CANCELLED) throw new ServiceError('Only cancelled records can be restored.');
    assertNoOverlap(draft, record);
    const previous = snapshot(record);
    record.status = record.checkOutAt ? ATTENDANCE_STATUS.NEEDS_REVIEW : ATTENDANCE_STATUS.ACTIVE;
    pushHistory(draft, record, { type: 'restore', reason: reason.trim(), previous });
    logActivity(draft, {
      action: 'attendance.restored',
      entityType: 'attendance',
      entityId: id,
      summary: `Restored attendance record of ${employeeName(draft, record.employeeId)}`,
      reason: reason.trim(),
    });
    return record;
  });
}

/**
 * Creates a record on behalf of an employee (e.g. the app was unavailable).
 * Marked as source "admin" and stored with an audit entry.
 */
export function createManualAttendance(values) {
  return mutate((draft) => {
    const employee = findOrThrow(draft.employees, values.employeeId, 'Employee');
    if (employee.status === 'archived') throw new ServiceError('Archived employees cannot receive new attendance records.', { field: 'employeeId' });
    const checkOutAt = values.checkOutAt || null;
    const timeError = validateShiftTimes(values.checkInAt, checkOutAt);
    if (timeError) throw new ServiceError(timeError, { field: 'checkInAt' });
    assertProjectCustomer(draft, values.customerId, values.projectId);
    assertNoOverlap(draft, { id: null, employeeId: employee.id, checkInAt: values.checkInAt, checkOutAt });
    const actor = currentActor();
    const record = {
      id: createId('att'),
      employeeId: employee.id,
      customerId: values.customerId,
      projectId: values.projectId,
      checkInAt: values.checkInAt,
      checkOutAt,
      recordedDurationMinutes: calculateRecordedMinutes(values.checkInAt, checkOutAt),
      billableDurationMinutes: null,
      status: checkOutAt ? ATTENDANCE_STATUS.CORRECTED : ATTENDANCE_STATUS.ACTIVE,
      checkInNote: values.checkInNote ?? '',
      checkOutNote: values.checkOutNote ?? '',
      checkInLocation: null,
      checkOutLocation: null,
      correctionHistory: [],
      billingAdjustments: [],
      billingExclusion: null,
      invoiceId: null,
      source: 'admin',
      reviewedAt: checkOutAt ? nowIso() : null,
      reviewedBy: checkOutAt ? actor.name : null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      updatedBy: actor.name,
    };
    pushHistory(draft, record, { type: 'manual_entry', reason: values.reason.trim(), previous: null });
    draft.attendance.push(record);
    logActivity(draft, {
      action: 'attendance.created',
      entityType: 'attendance',
      entityId: record.id,
      summary: `Added manual attendance for ${employee.fullName} (${formatDuration(record.recordedDurationMinutes)})`,
      newValues: snapshot(record),
      reason: values.reason.trim(),
    });
    return record;
  });
}

/* ------------------------- Billing-side adjustments ------------------------ */

function assertNotBilled(draft, record) {
  if (record.invoiceId) {
    const inv = draft.invoices.find((i) => i.id === record.invoiceId);
    throw new ServiceError(`This record is billed on ${inv?.invoiceNumber ?? 'a finalized invoice'}. Billing values are frozen.`);
  }
}

/** Sets admin-adjusted billable minutes; the recorded duration stays untouched. */
export function adjustBillableMinutes(id, minutes, reason) {
  return mutate((draft) => {
    const record = findOrThrow(draft.attendance, id, 'Attendance record');
    assertNotBilled(draft, record);
    if (!record.checkOutAt) throw new ServiceError('Open shifts cannot be adjusted.');
    if (!Number.isFinite(minutes) || minutes < 0) throw new ServiceError('Billable time cannot be negative.', { field: 'billableHours' });
    const previous = getBillableMinutes(record);
    const next = minutes === record.recordedDurationMinutes ? null : Math.round(minutes);
    record.billableDurationMinutes = next;
    const actor = currentActor();
    record.billingAdjustments = [
      ...(record.billingAdjustments ?? []),
      { id: createId('adj'), at: nowIso(), by: actor.name, field: 'billableDurationMinutes', previous, next: next ?? record.recordedDurationMinutes, reason: reason.trim() },
    ];
    record.updatedAt = nowIso();
    record.updatedBy = actor.name;
    flagAffectedInvoices(draft, record, 'billable hours adjusted');
    logActivity(draft, {
      action: 'billing.adjusted',
      entityType: 'attendance',
      entityId: id,
      summary: `Adjusted billable time for ${employeeName(draft, record.employeeId)}: ${formatDuration(previous)} → ${formatDuration(next ?? record.recordedDurationMinutes)}`,
      previousValues: { billableMinutes: previous },
      newValues: { billableMinutes: next ?? record.recordedDurationMinutes },
      reason: reason.trim(),
    });
    return record;
  });
}

/** Excludes a record from billing with a reason. Hours are kept, never discarded. */
export function excludeFromBilling(id, reason) {
  return mutate((draft) => {
    const record = findOrThrow(draft.attendance, id, 'Attendance record');
    assertNotBilled(draft, record);
    record.billingExclusion = { reason: reason.trim(), at: nowIso(), by: currentActor().name };
    record.updatedAt = nowIso();
    flagAffectedInvoices(draft, record, 'excluded from billing');
    logActivity(draft, {
      action: 'billing.excluded',
      entityType: 'attendance',
      entityId: id,
      summary: `Excluded ${formatDuration(record.recordedDurationMinutes)} of ${employeeName(draft, record.employeeId)} from billing`,
      reason: reason.trim(),
    });
    return record;
  });
}

export function includeInBilling(id, reason) {
  return mutate((draft) => {
    const record = findOrThrow(draft.attendance, id, 'Attendance record');
    if (!record.billingExclusion) throw new ServiceError('This record is not excluded.');
    const previous = record.billingExclusion;
    record.billingExclusion = null;
    record.billingAdjustments = [
      ...(record.billingAdjustments ?? []),
      { id: createId('adj'), at: nowIso(), by: currentActor().name, field: 'billingExclusion', previous: previous.reason, next: null, reason: reason.trim() },
    ];
    record.updatedAt = nowIso();
    logActivity(draft, {
      action: 'billing.included',
      entityType: 'attendance',
      entityId: id,
      summary: `Re-included attendance of ${employeeName(draft, record.employeeId)} in billing`,
      previousValues: { exclusion: previous.reason },
      reason: reason.trim(),
    });
    return record;
  });
}

export const ATTENDANCE_STATUS_OPTIONS = [
  { value: ATTENDANCE_STATUS.ACTIVE, label: 'Active' },
  { value: ATTENDANCE_STATUS.COMPLETED, label: 'Completed' },
  { value: ATTENDANCE_STATUS.NEEDS_REVIEW, label: 'Needs review' },
  { value: ATTENDANCE_STATUS.CORRECTED, label: 'Corrected' },
  { value: ATTENDANCE_STATUS.CANCELLED, label: 'Cancelled' },
];
