/**
 * Calculation engine
 * ------------------
 * Pure functions shared by services, pages and the demo-data generator so every
 * screen derives hours and money the same way.
 *
 * Units:
 *   - durations: integer minutes
 *   - quantities on invoices: decimal hours with two places (e.g. 7.42)
 *   - money: integer minor units (cents)
 *   - tax / discount percentages: decimal numbers (19 = 19 %)
 */
import { addDays, differenceInMinutes, format } from 'date-fns';
import { toDate, toDateKey } from './dateUtils';
import { draftLabel } from './invoiceNumber';

/* ------------------------------------------------------------------------- */
/* Status vocabularies                                                        */
/* ------------------------------------------------------------------------- */

export const ATTENDANCE_STATUS = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  NEEDS_REVIEW: 'needs_review',
  CORRECTED: 'corrected',
  CANCELLED: 'cancelled',
};

/** Statuses that count as approved, closed work. */
export const APPROVED_ATTENDANCE = [ATTENDANCE_STATUS.COMPLETED, ATTENDANCE_STATUS.CORRECTED];

export const INVOICE_STATUS = {
  DRAFT: 'draft',
  FINALIZED: 'finalized',
  SENT: 'sent',
  PARTIALLY_PAID: 'partially_paid',
  PAID: 'paid',
  OVERDUE: 'overdue',
  VOID: 'void',
};

/** Invoices that are binding financial documents (count toward invoiced revenue). */
export const ISSUED_INVOICE_STATUSES = [
  INVOICE_STATUS.FINALIZED,
  INVOICE_STATUS.SENT,
  INVOICE_STATUS.PARTIALLY_PAID,
  INVOICE_STATUS.PAID,
  INVOICE_STATUS.OVERDUE,
];

/* ------------------------------------------------------------------------- */
/* Attendance durations                                                       */
/* ------------------------------------------------------------------------- */

/**
 * Minutes between check-in and check-out.
 * Returns null when the shift is still open, or when either timestamp is
 * invalid or the duration would be zero/negative.
 */
export function calculateRecordedMinutes(checkInAt, checkOutAt) {
  const start = toDate(checkInAt);
  const end = toDate(checkOutAt);
  if (!start || !end) return null;
  const minutes = differenceInMinutes(end, start);
  return minutes > 0 ? minutes : null;
}

/** Validates a pair of timestamps; returns an error message or null. */
export function validateShiftTimes(checkInAt, checkOutAt, { now = new Date(), maxHours = 24 } = {}) {
  const start = toDate(checkInAt);
  const end = toDate(checkOutAt);
  if (!start) return 'A valid check-in time is required.';
  if (start > now) return 'Check-in cannot be in the future.';
  if (!checkOutAt) return null;
  if (!end) return 'Check-out time is not a valid date.';
  if (end <= start) return 'Check-out must be after check-in.';
  if (end > now) return 'Check-out cannot be in the future.';
  if (differenceInMinutes(end, start) > maxHours * 60) {
    return `A single shift cannot exceed ${maxHours} hours.`;
  }
  return null;
}

/** Minutes elapsed for an open shift (for live "active shift" timers). */
export function elapsedMinutes(checkInAt, now = new Date()) {
  const start = toDate(checkInAt);
  return start ? Math.max(0, differenceInMinutes(now, start)) : 0;
}

/** Billable minutes = admin-adjusted value when present, otherwise recorded duration. */
export function getBillableMinutes(record) {
  if (!record) return 0;
  if (record.billableDurationMinutes !== null && record.billableDurationMinutes !== undefined) {
    return record.billableDurationMinutes;
  }
  return record.recordedDurationMinutes ?? 0;
}

export function isShiftOpen(record) {
  return record?.status === ATTENDANCE_STATUS.ACTIVE && !record.checkOutAt;
}

/**
 * An open shift is "missing a check-out" when it started on a previous day or
 * has run longer than the configured alert threshold.
 */
export function isMissingCheckout(record, { now = new Date(), openShiftAlertHours = 14 } = {}) {
  if (!isShiftOpen(record)) return false;
  const start = toDate(record.checkInAt);
  if (!start) return true;
  return toDateKey(start) !== toDateKey(now) || differenceInMinutes(now, start) > openShiftAlertHours * 60;
}

/**
 * Whether a closed record needs an administrator's review before billing.
 * Explicit "needs_review" status always counts. A completed shift longer than
 * the configured threshold is also flagged (an admin-corrected record is
 * considered reviewed).
 */
export function requiresReview(record, { reviewShiftsOverHours = 12 } = {}) {
  if (!record) return false;
  if (record.status === ATTENDANCE_STATUS.NEEDS_REVIEW) return true;
  if (record.reviewedAt) return false; // an administrator already approved it
  if (record.status === ATTENDANCE_STATUS.COMPLETED && reviewShiftsOverHours > 0) {
    return (record.recordedDurationMinutes ?? 0) > reviewShiftsOverHours * 60;
  }
  return false;
}

/* ------------------------------------------------------------------------- */
/* Hours and money                                                            */
/* ------------------------------------------------------------------------- */

/** Minutes → hundredths of an hour (integer), e.g. 445 → 742 (7.42 h). */
export function minutesToHundredths(minutes) {
  return Math.round(((Number(minutes) || 0) * 100) / 60);
}

/** Decimal hours → hundredths of an hour (integer), e.g. 7.42 → 742. */
export function hoursToHundredths(hours) {
  return Math.round((Number(hours) || 0) * 100 + Number.EPSILON);
}

/** Minutes → decimal hours with two places (number). */
export function minutesToHours(minutes) {
  return minutesToHundredths(minutes) / 100;
}

/** Decimal hours → whole minutes. */
export function hoursToMinutes(hours) {
  return Math.round((Number(hours) || 0) * 60);
}

/** Line amount in minor units: quantity (hours, 2 dp) × hourly rate (minor units). */
export function calculateLineAmount(quantityHours, hourlyRateMinor) {
  return Math.round((hoursToHundredths(quantityHours) * (Number(hourlyRateMinor) || 0)) / 100);
}

/** Percentage of an amount in minor units (19 % of 10000 → 1900). Percent may have 2 decimals. */
export function percentOf(amountMinor, percent) {
  const basisPoints = Math.round((Number(percent) || 0) * 100);
  return Math.round((amountMinor * basisPoints) / 10000);
}

/* ------------------------------------------------------------------------- */
/* Hourly rates                                                               */
/* ------------------------------------------------------------------------- */

export const RATE_STATUS = { ACTIVE: 'active', SCHEDULED: 'scheduled', EXPIRED: 'expired', INACTIVE: 'inactive' };

/** Display status of a rate relative to today. "inactive" is a manual administrator state. */
export function getRateStatus(rate, today = toDateKey(new Date())) {
  if (rate.status === RATE_STATUS.INACTIVE) return RATE_STATUS.INACTIVE;
  if (rate.effectiveFrom > today) return RATE_STATUS.SCHEDULED;
  if (rate.effectiveTo && rate.effectiveTo < today) return RATE_STATUS.EXPIRED;
  return RATE_STATUS.ACTIVE;
}

/**
 * Picks the rate in force for a customer on a work date.
 * Inactive rates are ignored. When ranges overlap, the most recently
 * effective rate wins. Returns null if no rate applies (hours are then
 * flagged for review rather than billed at a guessed rate).
 */
export function findApplicableRate(rates, customerId, dateKey, currency) {
  const candidates = rates.filter(
    (r) =>
      r.customerId === customerId &&
      r.status !== RATE_STATUS.INACTIVE &&
      (!currency || r.currency === currency) &&
      r.effectiveFrom <= dateKey &&
      (!r.effectiveTo || r.effectiveTo >= dateKey),
  );
  if (candidates.length === 0) return null;
  return candidates.reduce((best, r) => (r.effectiveFrom > best.effectiveFrom ? r : best));
}

/** The rate a customer is charged today (for list views). */
export function getCurrentRate(rates, customerId, currency, today = toDateKey(new Date())) {
  return findApplicableRate(rates, customerId, today, currency);
}

/** Returns rates of the same customer/currency whose effective range overlaps the given one. */
export function findOverlappingRates(rates, candidate) {
  const end = candidate.effectiveTo || '9999-12-31';
  return rates.filter(
    (r) =>
      r.id !== candidate.id &&
      r.customerId === candidate.customerId &&
      r.currency === candidate.currency &&
      r.status !== RATE_STATUS.INACTIVE &&
      r.effectiveFrom <= end &&
      (r.effectiveTo || '9999-12-31') >= candidate.effectiveFrom,
  );
}

/* ------------------------------------------------------------------------- */
/* Billing eligibility                                                        */
/* ------------------------------------------------------------------------- */

export const EXCLUSION_CODE = {
  ACTIVE: 'active',
  CANCELLED: 'cancelled',
  NEEDS_REVIEW: 'needs_review',
  INVALID: 'invalid',
  EXCLUDED: 'excluded',
  BILLED: 'billed',
  IN_DRAFT: 'in_draft',
  NO_RATE: 'no_rate',
};

/**
 * Decides whether an attendance record can be billed, and why not.
 *
 * ctx.invoices         all invoices (to detect finalized billing and draft reservations)
 * ctx.excludeInvoiceId the draft being edited (its own records are not "reserved")
 * ctx.rate             the applicable rate (or null)
 * ctx.reviewShiftsOverHours  review threshold from working-hours settings
 */
export function classifyForBilling(record, ctx = {}) {
  const invoicesById = ctx.invoicesById ?? {};
  if (record.status === ATTENDANCE_STATUS.CANCELLED) {
    return { eligible: false, code: EXCLUSION_CODE.CANCELLED, reason: 'Record was cancelled' };
  }
  if (isShiftOpen(record)) {
    return { eligible: false, code: EXCLUSION_CODE.ACTIVE, reason: 'Shift is still active (no check-out)' };
  }
  if (record.invoiceId && invoicesById[record.invoiceId]) {
    const inv = invoicesById[record.invoiceId];
    return {
      eligible: false,
      code: EXCLUSION_CODE.BILLED,
      reason: `Already billed on ${inv.invoiceNumber}${inv.status === INVOICE_STATUS.VOID ? ' (void — release required)' : ''}`,
    };
  }
  if (record.billingExclusion) {
    return {
      eligible: false,
      code: EXCLUSION_CODE.EXCLUDED,
      reason: `Excluded from billing: ${record.billingExclusion.reason}`,
    };
  }
  if (requiresReview(record, ctx)) {
    return { eligible: false, code: EXCLUSION_CODE.NEEDS_REVIEW, reason: 'Marked for review' };
  }
  if (!record.checkOutAt || calculateRecordedMinutes(record.checkInAt, record.checkOutAt) === null) {
    return { eligible: false, code: EXCLUSION_CODE.INVALID, reason: 'Invalid or missing timestamps' };
  }
  const draft = ctx.draftReservations?.[record.id];
  if (draft && draft.id !== ctx.excludeInvoiceId) {
    return {
      eligible: false,
      code: EXCLUSION_CODE.IN_DRAFT,
      reason: `Included in draft ${draftLabel(draft.id)}`,
    };
  }
  if (!ctx.rate) {
    return { eligible: false, code: EXCLUSION_CODE.NO_RATE, reason: 'No valid hourly rate for this work date' };
  }
  return { eligible: true, code: null, reason: null };
}

/** Map of attendanceId → draft invoice for records already placed on a draft. */
export function buildDraftReservations(invoices) {
  const map = {};
  invoices
    .filter((inv) => inv.status === INVOICE_STATUS.DRAFT)
    .forEach((inv) => {
      inv.lineItems.forEach((line) => {
        (line.attendanceRecordIds ?? []).forEach((id) => {
          map[id] = inv;
        });
      });
    });
  return map;
}

/**
 * Builds the billing rows (one per attendance record) for a selection, each
 * with its applicable rate, billable quantity, amount and eligibility.
 */
export function buildBillingRows(records, { rates, invoices, currency, excludeInvoiceId, reviewShiftsOverHours }) {
  const invoicesById = Object.fromEntries(invoices.map((inv) => [inv.id, inv]));
  const draftReservations = buildDraftReservations(invoices);
  return records.map((record) => {
    const workDate = toDateKey(record.checkInAt);
    const rate = findApplicableRate(rates, record.customerId, workDate, currency);
    const billableMinutes = getBillableMinutes(record);
    const quantityHours = minutesToHours(billableMinutes);
    const eligibility = classifyForBilling(record, {
      invoicesById,
      draftReservations,
      excludeInvoiceId,
      rate,
      reviewShiftsOverHours,
    });
    return {
      record,
      workDate,
      rate,
      recordedMinutes: record.recordedDurationMinutes ?? null,
      billableMinutes,
      quantityHours,
      amount: rate ? calculateLineAmount(quantityHours, rate.amount) : 0,
      isAdjusted:
        record.billableDurationMinutes !== null &&
        record.billableDurationMinutes !== undefined &&
        record.billableDurationMinutes !== record.recordedDurationMinutes,
      ...eligibility,
    };
  });
}

export function summarizeBillingRows(rows) {
  const eligible = rows.filter((r) => r.eligible);
  return {
    totalRecords: rows.length,
    eligibleRecords: eligible.length,
    excludedRecords: rows.length - eligible.length,
    recordedMinutes: eligible.reduce((s, r) => s + (r.recordedMinutes ?? 0), 0),
    billableMinutes: eligible.reduce((s, r) => s + r.billableMinutes, 0),
    billableHours: minutesToHours(eligible.reduce((s, r) => s + r.billableMinutes, 0)),
    amount: eligible.reduce((s, r) => s + r.amount, 0),
    excludedMinutes: rows.filter((r) => !r.eligible).reduce((s, r) => s + (r.recordedMinutes ?? 0), 0),
  };
}

/* ------------------------------------------------------------------------- */
/* Invoice line items                                                         */
/* ------------------------------------------------------------------------- */

export const LINE_GROUPING = [
  { value: 'employee_project', label: 'Employee & project' },
  { value: 'project', label: 'Project' },
  { value: 'employee', label: 'Employee' },
  { value: 'day', label: 'Work date' },
];

/**
 * Groups eligible billing rows into invoice lines. Rows billed at different
 * rates are never merged, so quantity × rate always equals the line amount.
 */
export function groupBillingRowsIntoLines(rows, groupBy, { employeesById = {}, projectsById = {}, idFactory }) {
  const groups = new Map();
  rows
    .filter((r) => r.eligible)
    .forEach((row) => {
      const { record } = row;
      const keyParts = {
        employee_project: [record.employeeId, record.projectId],
        project: [record.projectId],
        employee: [record.employeeId],
        day: [row.workDate, record.projectId],
      }[groupBy] ?? [record.employeeId, record.projectId];
      const key = [...keyParts, row.rate.id].join('|');
      if (!groups.has(key)) groups.set(key, { rows: [], rate: row.rate, record });
      groups.get(key).rows.push(row);
    });

  return [...groups.values()].map((group, index) => {
    const dates = group.rows.map((r) => r.workDate).sort();
    const employee = employeesById[group.record.employeeId];
    const project = projectsById[group.record.projectId];
    const projectIds = [...new Set(group.rows.map((r) => r.record.projectId))];
    const employeeIds = [...new Set(group.rows.map((r) => r.record.employeeId))];
    // Sum minutes first, then convert once, so 10170 min bills as 169.50 h (not Σ rounded rows).
    const quantityHours = minutesToHours(group.rows.reduce((s, r) => s + r.billableMinutes, 0));
    const recordedMinutes = group.rows.reduce((s, r) => s + (r.recordedMinutes ?? 0), 0);
    const period =
      dates[0] === dates[dates.length - 1]
        ? format(toDate(dates[0]), 'dd MMM yyyy')
        : `${format(toDate(dates[0]), 'dd MMM')} – ${format(toDate(dates[dates.length - 1]), 'dd MMM yyyy')}`;

    let description;
    if (groupBy === 'project') {
      description = `${project?.name ?? 'Project'} — labour (${employeeIds.length} staff), ${period}`;
    } else if (groupBy === 'employee') {
      description = `${employee?.fullName ?? 'Employee'} — ${projectIds.length > 1 ? `${projectIds.length} projects` : project?.name ?? 'Project'}, ${period}`;
    } else if (groupBy === 'day') {
      description = `${project?.name ?? 'Project'} — ${period} (${employeeIds.length} staff)`;
    } else {
      description = `${employee?.fullName ?? 'Employee'} — ${project?.name ?? 'Project'}, ${period}`;
    }

    const amount = calculateLineAmount(quantityHours, group.rate.amount);
    return {
      id: idFactory ? idFactory() : `line_${index}`,
      type: 'hours',
      description,
      employeeId: employeeIds.length === 1 ? employeeIds[0] : null,
      projectId: projectIds.length === 1 ? projectIds[0] : null,
      attendanceRecordIds: group.rows.map((r) => r.record.id),
      workDateFrom: dates[0],
      workDateTo: dates[dates.length - 1],
      recordedMinutes,
      rateId: group.rate.id,
      originalQuantityHours: quantityHours,
      quantityHours,
      hourlyRate: group.rate.amount,
      originalAmount: amount,
      amount,
      amountOverridden: false,
      adjustmentReason: '',
    };
  });
}

/** Recomputes a line's amount from quantity × rate unless the amount was deliberately overridden. */
export function recalculateLine(line) {
  if (line.amountOverridden) return line;
  return { ...line, amount: calculateLineAmount(line.quantityHours, line.hourlyRate) };
}

/** True when an administrator changed a line away from the attendance-derived values. */
export function isLineAdjusted(line) {
  if (line.type !== 'hours') return false;
  return (
    hoursToHundredths(line.quantityHours) !== hoursToHundredths(line.originalQuantityHours) ||
    line.amount !== line.originalAmount
  );
}

/* ------------------------------------------------------------------------- */
/* Invoice totals                                                             */
/* ------------------------------------------------------------------------- */

/**
 * subtotal        = Σ line amounts
 * discountAmount  = fixed amount or % of subtotal (capped at subtotal)
 * taxableAmount   = subtotal − discount
 * taxAmount       = taxableAmount × taxRate %
 * total           = taxableAmount + taxAmount
 * balanceDue      = total − payments
 */
export function calculateInvoiceTotals({ lineItems = [], discountType = 'none', discountValue = 0, taxRate = 0, amountPaid = 0 }) {
  const subtotal = lineItems.reduce((s, line) => s + (Number(line.amount) || 0), 0);
  let discountAmount = 0;
  if (discountType === 'percent') discountAmount = percentOf(subtotal, discountValue);
  if (discountType === 'fixed') discountAmount = Math.round(Number(discountValue) || 0);
  discountAmount = Math.max(0, Math.min(discountAmount, Math.max(subtotal, 0)));
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = percentOf(taxableAmount, taxRate);
  const total = taxableAmount + taxAmount;
  return {
    subtotal,
    discountAmount,
    taxableAmount,
    taxAmount,
    total,
    amountPaid,
    balanceDue: total - amountPaid,
    billableHours: lineItems.filter((l) => l.type === 'hours').reduce((s, l) => s + hoursToHundredths(l.quantityHours), 0) / 100,
    recordedMinutes: lineItems.reduce((s, l) => s + (l.recordedMinutes ?? 0), 0),
  };
}

/** Due date = issue date + payment-term days. */
export function calculateDueDate(issueDate, paymentTermsDays) {
  const date = toDate(issueDate);
  if (!date) return '';
  return toDateKey(addDays(date, Number(paymentTermsDays) || 0));
}

/**
 * Invoice status rules (evaluated in order):
 *   void → draft → paid (balance ≤ 0) → partially paid → overdue (unpaid, past due) → sent → finalized
 * A fully paid invoice is never shown as overdue.
 */
export function computeInvoiceStatus(invoice, today = toDateKey(new Date())) {
  if (invoice.voidedAt) return INVOICE_STATUS.VOID;
  if (!invoice.finalizedAt) return INVOICE_STATUS.DRAFT;
  if (invoice.balanceDue <= 0) return INVOICE_STATUS.PAID;
  if (invoice.amountPaid > 0) return INVOICE_STATUS.PARTIALLY_PAID;
  if (invoice.dueDate && invoice.dueDate < today) return INVOICE_STATUS.OVERDUE;
  if (invoice.sentAt) return INVOICE_STATUS.SENT;
  return INVOICE_STATUS.FINALIZED;
}

export function isInvoiceOutstanding(invoice) {
  return ISSUED_INVOICE_STATUSES.includes(invoice.status) && invoice.balanceDue > 0;
}

/** A partially paid invoice past its due date is still flagged for attention. */
export function isPastDue(invoice, today = toDateKey(new Date())) {
  return isInvoiceOutstanding(invoice) && invoice.dueDate < today;
}

/**
 * Status shown in attendance tables. An open shift past the alert threshold
 * is displayed as "missing_checkout"; a long completed shift that still needs
 * approval is displayed as "needs_review".
 */
export function displayAttendanceStatus(record, { now = new Date(), openShiftAlertHours = 14, reviewShiftsOverHours = 12 } = {}) {
  if (isMissingCheckout(record, { now, openShiftAlertHours })) return 'missing_checkout';
  if (record.checkOutAt && record.status === ATTENDANCE_STATUS.COMPLETED && requiresReview(record, { reviewShiftsOverHours })) {
    return ATTENDANCE_STATUS.NEEDS_REVIEW;
  }
  return record.status;
}
