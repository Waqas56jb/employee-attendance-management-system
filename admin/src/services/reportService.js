/**
 * Read-only analytics shared by the dashboard, detail pages and reports.
 *
 * Vocabulary (kept strict so revenue is never overstated):
 *   recorded hours  — closed, non-cancelled attendance (any review state)
 *   billable hours  — approved, not excluded, not awaiting review
 *   invoiced        — totals of finalized (non-void) invoices
 *   collected       — payments actually recorded
 *   outstanding     — balance due on finalized, non-void invoices
 */
import { eachDayOfInterval, eachMonthOfInterval, eachWeekOfInterval, format, startOfMonth, subMonths, differenceInCalendarDays } from 'date-fns';
import {
  APPROVED_ATTENDANCE,
  ATTENDANCE_STATUS,
  buildBillingRows,
  elapsedMinutes,
  getBillableMinutes,
  INVOICE_STATUS,
  ISSUED_INVOICE_STATUSES,
  isInvoiceOutstanding,
  isMissingCheckout,
  isShiftOpen,
  requiresReview,
} from '../utils/calculations';
import { isInDateRange, toDate, toDateKey, todayKey, WEEK_OPTIONS } from '../utils/dateUtils';

export function isClosedRecord(record) {
  return Boolean(record.checkOutAt) && record.status !== ATTENDANCE_STATUS.CANCELLED && record.recordedDurationMinutes > 0;
}

export function isApprovedBillable(record, settings) {
  return (
    isClosedRecord(record) &&
    APPROVED_ATTENDANCE.includes(record.status) &&
    !record.billingExclusion &&
    !requiresReview(record, settings)
  );
}

export function recordsInRange(db, { from, to, employeeId, customerId, projectId } = {}) {
  return db.attendance.filter(
    (a) =>
      (!employeeId || a.employeeId === employeeId) &&
      (!customerId || a.customerId === customerId) &&
      (!projectId || a.projectId === projectId) &&
      isInDateRange(a.checkInAt, from, to),
  );
}

export function sumRecorded(records) {
  return records.filter(isClosedRecord).reduce((s, r) => s + r.recordedDurationMinutes, 0);
}

export function sumBillable(records, settings) {
  return records.filter((r) => isApprovedBillable(r, settings)).reduce((s, r) => s + getBillableMinutes(r), 0);
}

export function issuedInvoices(db) {
  return db.invoices.filter((inv) => ISSUED_INVOICE_STATUSES.includes(inv.status));
}

/* -------------------------------- Dashboard -------------------------------- */

export function getAttendanceToday(db, now = new Date()) {
  const today = toDateKey(now);
  const todays = db.attendance.filter((a) => toDateKey(a.checkInAt) === today && a.status !== ATTENDANCE_STATUS.CANCELLED);
  const open = db.attendance.filter(isShiftOpen);
  const working = open.filter((a) => !isMissingCheckout(a, { now, openShiftAlertHours: db.workingHours.openShiftAlertHours }));
  const missing = open.filter((a) => isMissingCheckout(a, { now, openShiftAlertHours: db.workingHours.openShiftAlertHours }));
  const completed = todays.filter((a) => a.checkOutAt);
  const seen = new Set(todays.map((a) => a.employeeId));
  const scheduled = db.employees.filter(
    (e) => e.status === 'active' && db.projects.some((p) => p.status === 'active' && p.assignedEmployeeIds.includes(e.id)),
  );
  const notCheckedIn = scheduled.filter((e) => !seen.has(e.id));
  const minutes =
    completed.reduce((s, a) => s + (a.recordedDurationMinutes ?? 0), 0) +
    todays.filter(isShiftOpen).reduce((s, a) => s + elapsedMinutes(a.checkInAt, now), 0);
  return { working, missing, completed, notCheckedIn, minutes, scheduledCount: scheduled.length };
}

export function getDashboardMetrics(db, { from, to }) {
  const currency = db.business.currency;
  const records = recordsInRange(db, { from, to });
  const rows = buildBillingRows(
    records.filter((r) => isClosedRecord(r)),
    { rates: db.hourlyRates, invoices: [], currency, reviewShiftsOverHours: db.workingHours.reviewShiftsOverHours },
  );
  const billableValue = rows.filter((r) => r.eligible).reduce((s, r) => s + r.amount, 0);
  const outstandingInvoices = db.invoices.filter((inv) => isInvoiceOutstanding(inv) && inv.currency === currency);
  return {
    totalEmployees: db.employees.filter((e) => e.status !== 'archived').length,
    activeEmployees: db.employees.filter((e) => e.status === 'active').length,
    activeProjects: db.projects.filter((p) => p.status === 'active').length,
    recordedMinutes: sumRecorded(records),
    billableMinutes: sumBillable(records, db.workingHours),
    billableValue,
    outstanding: outstandingInvoices.reduce((s, inv) => s + inv.balanceDue, 0),
    outstandingCount: outstandingInvoices.length,
    overdueCount: outstandingInvoices.filter((inv) => inv.status === INVOICE_STATUS.OVERDUE).length,
    currency,
  };
}

/** Recorded vs billable hours per day (≤ 45 days) or per week. */
export function getHoursTrend(db, { from, to }) {
  const start = toDate(from);
  const end = toDate(to);
  if (!start || !end || end < start) return [];
  const records = recordsInRange(db, { from, to }).filter(isClosedRecord);
  const days = differenceInCalendarDays(end, start) + 1;
  const weekly = days > 45;
  const buckets = weekly
    ? eachWeekOfInterval({ start, end }, WEEK_OPTIONS).map((d) => ({ key: toDateKey(d), label: format(d, 'dd MMM') }))
    : eachDayOfInterval({ start, end }).map((d) => ({ key: toDateKey(d), label: format(d, days > 14 ? 'dd MMM' : 'EEE dd') }));
  const index = Object.fromEntries(buckets.map((b) => [b.key, { ...b, recorded: 0, billable: 0 }]));
  records.forEach((r) => {
    const date = toDate(r.checkInAt);
    let bucketKey = toDateKey(date);
    if (weekly) {
      const d = new Date(date);
      const dow = (d.getDay() + 6) % 7;
      d.setDate(d.getDate() - dow);
      bucketKey = toDateKey(d);
      if (!index[bucketKey]) bucketKey = buckets[0].key;
    }
    const bucket = index[bucketKey];
    if (!bucket) return;
    bucket.recorded += r.recordedDurationMinutes;
    if (isApprovedBillable(r, db.workingHours)) bucket.billable += getBillableMinutes(r);
  });
  return Object.values(index).map((b) => ({
    ...b,
    recordedHours: Math.round(b.recorded / 6) / 10,
    billableHours: Math.round(b.billable / 6) / 10,
  }));
}

export function getBillableByCustomer(db, { from, to }) {
  const records = recordsInRange(db, { from, to });
  return db.customers
    .map((c) => {
      const own = records.filter((r) => r.customerId === c.id);
      return {
        id: c.id,
        name: c.companyName,
        billableHours: Math.round(sumBillable(own, db.workingHours) / 6) / 10,
        recordedHours: Math.round(sumRecorded(own) / 6) / 10,
      };
    })
    .filter((c) => c.recordedHours > 0)
    .sort((a, b) => b.billableHours - a.billableHours);
}

/** Invoiced (by issue month) and collected (by payment month), last N months. */
export function getMonthlyInvoiced(db, months = 6, reference = new Date()) {
  const currency = db.business.currency;
  const start = startOfMonth(subMonths(reference, months - 1));
  const list = eachMonthOfInterval({ start, end: reference }).map((d) => ({
    key: format(d, 'yyyy-MM'),
    label: format(d, 'MMM yy'),
    invoiced: 0,
    collected: 0,
  }));
  const byKey = Object.fromEntries(list.map((m) => [m.key, m]));
  issuedInvoices(db)
    .filter((inv) => inv.currency === currency)
    .forEach((inv) => {
      const m = byKey[inv.issueDate.slice(0, 7)];
      if (m) m.invoiced += inv.total;
    });
  const invoiceCurrency = Object.fromEntries(db.invoices.map((i) => [i.id, i.currency]));
  db.payments.forEach((p) => {
    if (invoiceCurrency[p.invoiceId] !== currency) return;
    const m = byKey[p.paymentDate.slice(0, 7)];
    if (m) m.collected += p.amount;
  });
  return list.map((m) => ({ ...m, invoicedMajor: m.invoiced / 100, collectedMajor: m.collected / 100 }));
}

export function getInvoiceStatusDistribution(db, { from, to } = {}) {
  const counts = {};
  db.invoices
    .filter((inv) => (!from && !to) || isInDateRange(inv.issueDate, from, to))
    .forEach((inv) => {
      counts[inv.status] = counts[inv.status] ?? { status: inv.status, count: 0, total: 0 };
      counts[inv.status].count += 1;
      counts[inv.status].total += inv.total;
    });
  return Object.values(counts);
}

/* --------------------------------- Reports --------------------------------- */

export const REPORT_TYPES = [
  { value: 'employee_hours', label: 'Employee working hours', description: 'Shifts, recorded and approved billable hours per employee.' },
  { value: 'customer_billable', label: 'Customer billable hours', description: 'Hours, rates used, amounts billed and outstanding per customer.' },
  { value: 'project_hours', label: 'Project hours', description: 'Recorded and billable hours per project against target.' },
  { value: 'attendance_history', label: 'Attendance history', description: 'Every attendance record matching the filters.' },
  { value: 'invoice_summary', label: 'Invoice summary', description: 'Invoices issued in the period with payments and balances.' },
  { value: 'outstanding_invoices', label: 'Outstanding invoices', description: 'Unpaid balances with days past due.' },
  { value: 'revenue_by_customer', label: 'Revenue by customer', description: 'Invoiced, collected and outstanding amounts per customer.' },
  { value: 'monthly_billing', label: 'Monthly billing summary', description: 'Net, tax, invoiced totals and payments per month.' },
];

export function employeeHoursReport(db, f) {
  const records = recordsInRange(db, f);
  return db.employees
    .filter((e) => !f.employeeId || e.id === f.employeeId)
    .map((e) => {
      const own = records.filter((r) => r.employeeId === e.id);
      const closed = own.filter(isClosedRecord);
      return {
        id: e.id,
        employee: e.fullName,
        employeeNumber: e.employeeNumber,
        status: e.status,
        completedShifts: closed.length,
        recordedMinutes: sumRecorded(own),
        billableMinutes: sumBillable(own, db.workingHours),
        reviewCount: closed.filter((r) => requiresReview(r, db.workingHours)).length,
      };
    })
    .filter((r) => r.completedShifts > 0 || f.employeeId);
}

function ratesUsed(db, customerId, from, to, currency) {
  const used = db.hourlyRates.filter(
    (r) =>
      r.customerId === customerId &&
      r.currency === currency &&
      r.status !== 'inactive' &&
      (!to || r.effectiveFrom <= to) &&
      (!from || !r.effectiveTo || r.effectiveTo >= from),
  );
  return used.sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
}

export function customerBillableReport(db, f) {
  const records = recordsInRange(db, f);
  return db.customers
    .filter((c) => !f.customerId || c.id === f.customerId)
    .map((c) => {
      const own = records.filter((r) => r.customerId === c.id);
      const invoices = issuedInvoices(db).filter((inv) => inv.customerId === c.id && isInDateRange(inv.issueDate, f.from, f.to));
      return {
        id: c.id,
        customer: c.companyName,
        currency: c.currency,
        recordedMinutes: sumRecorded(own),
        billableMinutes: sumBillable(own, db.workingHours),
        rates: ratesUsed(db, c.id, f.from, f.to, c.currency),
        amountBilled: invoices.reduce((s, inv) => s + inv.total, 0),
        outstanding: db.invoices.filter((inv) => inv.customerId === c.id && isInvoiceOutstanding(inv)).reduce((s, inv) => s + inv.balanceDue, 0),
      };
    })
    .filter((r) => r.recordedMinutes > 0 || r.amountBilled > 0 || r.outstanding > 0 || f.customerId);
}

export function projectHoursReport(db, f) {
  const records = recordsInRange(db, f);
  return db.projects
    .filter((p) => (!f.projectId || p.id === f.projectId) && (!f.customerId || p.customerId === f.customerId))
    .map((p) => {
      const own = records.filter((r) => r.projectId === p.id && (!f.employeeId || r.employeeId === f.employeeId));
      const allTime = sumRecorded(db.attendance.filter((r) => r.projectId === p.id));
      return {
        id: p.id,
        project: p.name,
        projectNumber: p.projectNumber,
        customerId: p.customerId,
        status: p.status,
        recordedMinutes: sumRecorded(own),
        billableMinutes: sumBillable(own, db.workingHours),
        allTimeMinutes: allTime,
        targetHours: p.targetHours,
      };
    })
    .filter((r) => r.recordedMinutes > 0 || f.projectId);
}

export function attendanceHistoryReport(db, f) {
  return recordsInRange(db, f).sort((a, b) => b.checkInAt.localeCompare(a.checkInAt));
}

export function invoiceSummaryReport(db, f) {
  return db.invoices
    .filter(
      (inv) =>
        (!f.customerId || inv.customerId === f.customerId) &&
        (!f.invoiceStatus || inv.status === f.invoiceStatus) &&
        (!f.projectId || inv.lineItems.some((l) => l.projectId === f.projectId)) &&
        isInDateRange(inv.issueDate, f.from, f.to),
    )
    .sort((a, b) => b.issueDate.localeCompare(a.issueDate));
}

export function outstandingInvoicesReport(db, f) {
  const today = todayKey();
  return db.invoices
    .filter((inv) => isInvoiceOutstanding(inv) && (!f.customerId || inv.customerId === f.customerId) && isInDateRange(inv.issueDate, f.from, f.to))
    .map((inv) => ({ ...inv, daysPastDue: inv.dueDate < today ? differenceInCalendarDays(toDate(today), toDate(inv.dueDate)) : 0 }))
    .sort((a, b) => b.daysPastDue - a.daysPastDue);
}

export function revenueByCustomerReport(db, f) {
  return db.customers
    .filter((c) => !f.customerId || c.id === f.customerId)
    .map((c) => {
      const invoices = issuedInvoices(db).filter((inv) => inv.customerId === c.id && isInDateRange(inv.issueDate, f.from, f.to));
      const ids = new Set(db.invoices.filter((i) => i.customerId === c.id).map((i) => i.id));
      const collected = db.payments.filter((p) => ids.has(p.invoiceId) && isInDateRange(p.paymentDate, f.from, f.to)).reduce((s, p) => s + p.amount, 0);
      return {
        id: c.id,
        customer: c.companyName,
        currency: c.currency,
        invoiceCount: invoices.length,
        netInvoiced: invoices.reduce((s, inv) => s + inv.taxableAmount, 0),
        tax: invoices.reduce((s, inv) => s + inv.taxAmount, 0),
        invoiced: invoices.reduce((s, inv) => s + inv.total, 0),
        collected,
        outstanding: invoices.reduce((s, inv) => s + Math.max(inv.balanceDue, 0), 0),
      };
    })
    .filter((r) => r.invoiceCount > 0 || r.collected > 0);
}

export function monthlyBillingReport(db, f) {
  const months = {};
  const ensure = (k) => {
    months[k] = months[k] ?? { month: k, invoiceCount: 0, netInvoiced: 0, tax: 0, invoiced: 0, collected: 0, outstanding: 0 };
    return months[k];
  };
  issuedInvoices(db)
    .filter((inv) => (!f.customerId || inv.customerId === f.customerId) && isInDateRange(inv.issueDate, f.from, f.to))
    .forEach((inv) => {
      const m = ensure(inv.issueDate.slice(0, 7));
      m.invoiceCount += 1;
      m.netInvoiced += inv.taxableAmount;
      m.tax += inv.taxAmount;
      m.invoiced += inv.total;
      m.outstanding += Math.max(inv.balanceDue, 0);
    });
  const invById = Object.fromEntries(db.invoices.map((i) => [i.id, i]));
  db.payments
    .filter((p) => (!f.customerId || invById[p.invoiceId]?.customerId === f.customerId) && isInDateRange(p.paymentDate, f.from, f.to))
    .forEach((p) => {
      ensure(p.paymentDate.slice(0, 7)).collected += p.amount;
    });
  return Object.values(months)
    .sort((a, b) => b.month.localeCompare(a.month))
    .map((m) => ({ ...m, label: format(toDate(`${m.month}-01`), 'MMMM yyyy') }));
}
