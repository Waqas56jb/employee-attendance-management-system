/**
 * One definition per report type: which filters apply, how rows are selected
 * (reportService selectors), table + CSV columns, and the totals that feed the
 * summary cards, the table footer and the CSV totals row — all from the same
 * filtered rows, so the three always agree.
 */
import { Link } from 'react-router-dom';
import { getStatusMeta, StatusBadge } from '../common/StatusBadge';
import { MoneyDisplay } from '../common/MoneyDisplay';
import {
  attendanceHistoryReport,
  customerBillableReport,
  employeeHoursReport,
  invoiceSummaryReport,
  isApprovedBillable,
  isClosedRecord,
  monthlyBillingReport,
  outstandingInvoicesReport,
  projectHoursReport,
  revenueByCustomerReport,
} from '../../services/reportService';
import { invoiceLabel } from '../../services/invoiceService';
import { displayAttendanceStatus, getBillableMinutes, ISSUED_INVOICE_STATUSES } from '../../utils/calculations';
import { formatMoney, formatMoneyPlain } from '../../utils/currency';
import { formatDate, formatTime } from '../../utils/dateUtils';
import { formatHours, formatNumber, formatPercent } from '../../utils/formatters';

/* --------------------------------- helpers --------------------------------- */

const sum = (rows, get) => rows.reduce((s, r) => s + (Number(get(r)) || 0), 0);

/** Sums money only in the reporting currency; other currencies are counted separately. */
function moneyTotals(rows, fields, currency, getCurrency = (r) => r.currency ?? currency) {
  const same = rows.filter((r) => getCurrency(r) === currency);
  const out = { otherCurrencyRows: rows.length - same.length };
  fields.forEach((f) => {
    out[f] = sum(same, (r) => r[f]);
  });
  return out;
}

const hoursCell = (minutes) => <span className="tabular">{formatHours(minutes)}</span>;
const money = (amount, currency) => <MoneyDisplay amount={amount} currency={currency} />;
const strong = (node) => <span className="font-semibold text-ink">{node}</span>;

function otherCurrencyHint(totals) {
  return totals.otherCurrencyRows ? `Excludes ${totals.otherCurrencyRows} row(s) in other currencies` : undefined;
}

const nameOf = {
  employee: (ctx, id) => ctx.employeesById[id]?.fullName ?? '—',
  customer: (ctx, id) => ctx.customersById[id]?.companyName ?? '—',
  project: (ctx, id) => ctx.projectsById[id]?.name ?? '—',
};

function invoiceLink(inv) {
  return (
    <Link to={`/invoices/${inv.id}`} className="font-medium text-ink hover:text-brand-700">
      {invoiceLabel(inv)}
    </Link>
  );
}

/* --------------------------------- reports --------------------------------- */

const employeeHours = {
  filters: ['range', 'employee', 'customer', 'project'],
  noun: 'employee',
  getRows: employeeHoursReport,
  totals: (rows) => ({
    count: rows.length,
    completedShifts: sum(rows, (r) => r.completedShifts),
    recordedMinutes: sum(rows, (r) => r.recordedMinutes),
    billableMinutes: sum(rows, (r) => r.billableMinutes),
    reviewCount: sum(rows, (r) => r.reviewCount),
  }),
  summary: (t) => [
    { label: 'Employees', value: formatNumber(t.count) },
    { label: 'Completed shifts', value: formatNumber(t.completedShifts) },
    { label: 'Recorded hours', value: formatHours(t.recordedMinutes, { suffix: true }) },
    { label: 'Billable hours (approved)', value: formatHours(t.billableMinutes, { suffix: true }), hint: t.reviewCount ? `${t.reviewCount} shift(s) awaiting review` : 'Nothing awaiting review' },
  ],
  columns: () => [
    {
      key: 'employee',
      header: 'Employee',
      primary: true,
      sortValue: (r) => r.employee,
      render: (r) => (
        <Link to={`/employees/${r.id}`} className="hover:text-brand-700">
          <span className="block font-medium text-ink">{r.employee}</span>
          <span className="block text-xs text-ink-muted">{r.employeeNumber}</span>
        </Link>
      ),
      footer: () => strong('Total'),
    },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge kind="employee" status={r.status} /> },
    { key: 'completedShifts', header: 'Shifts', align: 'right', sortValue: (r) => r.completedShifts, footer: (t) => strong(formatNumber(t.completedShifts)) },
    { key: 'recordedMinutes', header: 'Recorded h', align: 'right', sortValue: (r) => r.recordedMinutes, render: (r) => hoursCell(r.recordedMinutes), footer: (t) => strong(formatHours(t.recordedMinutes)) },
    { key: 'billableMinutes', header: 'Billable h', align: 'right', sortValue: (r) => r.billableMinutes, render: (r) => hoursCell(r.billableMinutes), footer: (t) => strong(formatHours(t.billableMinutes)) },
    { key: 'reviewCount', header: 'Needs review', align: 'right', sortValue: (r) => r.reviewCount, footer: (t) => strong(formatNumber(t.reviewCount)) },
  ],
  csv: () => [
    { header: 'Employee', value: (r) => r.employee, total: () => 'TOTAL' },
    { header: 'Employee no.', value: (r) => r.employeeNumber },
    { header: 'Status', value: (r) => getStatusMeta('employee', r.status).label },
    { header: 'Completed shifts', value: (r) => r.completedShifts, total: (t) => t.completedShifts },
    { header: 'Recorded hours', value: (r) => formatHours(r.recordedMinutes), total: (t) => formatHours(t.recordedMinutes) },
    { header: 'Billable hours (approved)', value: (r) => formatHours(r.billableMinutes), total: (t) => formatHours(t.billableMinutes) },
    { header: 'Shifts needing review', value: (r) => r.reviewCount, total: (t) => t.reviewCount },
  ],
};

const customerBillable = {
  filters: ['range', 'customer'],
  noun: 'customer',
  money: true,
  getRows: customerBillableReport,
  totals: (rows, ctx) => ({
    count: rows.length,
    recordedMinutes: sum(rows, (r) => r.recordedMinutes),
    billableMinutes: sum(rows, (r) => r.billableMinutes),
    ...moneyTotals(rows, ['amountBilled', 'outstanding'], ctx.currency),
  }),
  summary: (t, ctx) => [
    { label: 'Recorded hours', value: formatHours(t.recordedMinutes, { suffix: true }) },
    { label: 'Billable hours (approved)', value: formatHours(t.billableMinutes, { suffix: true }) },
    { label: 'Invoiced in period', value: formatMoney(t.amountBilled, ctx.currency), hint: otherCurrencyHint(t) ?? 'Finalized invoices, incl. tax' },
    { label: 'Outstanding balance', value: formatMoney(t.outstanding, ctx.currency), hint: 'Current unpaid balance, all periods', tone: t.outstanding ? 'warning' : undefined },
  ],
  columns: (ctx) => [
    {
      key: 'customer',
      header: 'Customer',
      primary: true,
      sortValue: (r) => r.customer,
      render: (r) => (
        <Link to={`/customers/${r.id}`} className="font-medium text-ink hover:text-brand-700">
          {r.customer}
        </Link>
      ),
      footer: () => strong('Total'),
    },
    { key: 'recordedMinutes', header: 'Recorded h', align: 'right', sortValue: (r) => r.recordedMinutes, render: (r) => hoursCell(r.recordedMinutes), footer: (t) => strong(formatHours(t.recordedMinutes)) },
    { key: 'billableMinutes', header: 'Billable h', align: 'right', sortValue: (r) => r.billableMinutes, render: (r) => hoursCell(r.billableMinutes), footer: (t) => strong(formatHours(t.billableMinutes)) },
    {
      key: 'rates',
      header: 'Rates used',
      render: (r) =>
        r.rates.length ? (
          <span className="tabular text-xs text-ink-secondary">{r.rates.map((rate) => `${formatMoney(rate.amount, rate.currency)}/h`).join(', ')}</span>
        ) : (
          <span className="text-xs text-ink-muted">No rate</span>
        ),
    },
    { key: 'amountBilled', header: 'Invoiced', align: 'right', sortValue: (r) => r.amountBilled, render: (r) => money(r.amountBilled, r.currency), footer: (t) => strong(money(t.amountBilled, ctx.currency)) },
    { key: 'outstanding', header: 'Outstanding', align: 'right', sortValue: (r) => r.outstanding, render: (r) => money(r.outstanding, r.currency), footer: (t) => strong(money(t.outstanding, ctx.currency)) },
  ],
  csv: (ctx) => [
    { header: 'Customer', value: (r) => r.customer, total: () => `TOTAL (${ctx.currency})` },
    { header: 'Currency', value: (r) => r.currency, total: () => ctx.currency },
    { header: 'Recorded hours', value: (r) => formatHours(r.recordedMinutes), total: (t) => formatHours(t.recordedMinutes) },
    { header: 'Billable hours (approved)', value: (r) => formatHours(r.billableMinutes), total: (t) => formatHours(t.billableMinutes) },
    { header: 'Rates used', value: (r) => r.rates.map((rate) => `${formatMoneyPlain(rate.amount, rate.currency)}/h`).join(' | ') },
    { header: 'Invoiced in period', value: (r) => formatMoneyPlain(r.amountBilled, r.currency), total: (t) => formatMoneyPlain(t.amountBilled, ctx.currency) },
    { header: 'Outstanding balance', value: (r) => formatMoneyPlain(r.outstanding, r.currency), total: (t) => formatMoneyPlain(t.outstanding, ctx.currency) },
  ],
};

const projectHours = {
  filters: ['range', 'customer', 'project', 'employee'],
  noun: 'project',
  getRows: projectHoursReport,
  totals: (rows) => ({
    count: rows.length,
    recordedMinutes: sum(rows, (r) => r.recordedMinutes),
    billableMinutes: sum(rows, (r) => r.billableMinutes),
    allTimeMinutes: sum(rows, (r) => r.allTimeMinutes),
  }),
  summary: (t) => [
    { label: 'Projects', value: formatNumber(t.count) },
    { label: 'Recorded hours', value: formatHours(t.recordedMinutes, { suffix: true }) },
    { label: 'Billable hours (approved)', value: formatHours(t.billableMinutes, { suffix: true }) },
    { label: 'All-time recorded', value: formatHours(t.allTimeMinutes, { suffix: true }), hint: 'All employees, all dates' },
  ],
  columns: (ctx) => [
    {
      key: 'project',
      header: 'Project',
      primary: true,
      sortValue: (r) => r.project,
      render: (r) => (
        <Link to={`/projects/${r.id}`} className="hover:text-brand-700">
          <span className="block font-medium text-ink">{r.project}</span>
          <span className="block text-xs text-ink-muted">{r.projectNumber}</span>
        </Link>
      ),
      footer: () => strong('Total'),
    },
    { key: 'customer', header: 'Customer', sortValue: (r) => nameOf.customer(ctx, r.customerId), render: (r) => nameOf.customer(ctx, r.customerId) },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge kind="project" status={r.status} /> },
    { key: 'recordedMinutes', header: 'Recorded h', align: 'right', sortValue: (r) => r.recordedMinutes, render: (r) => hoursCell(r.recordedMinutes), footer: (t) => strong(formatHours(t.recordedMinutes)) },
    { key: 'billableMinutes', header: 'Billable h', align: 'right', sortValue: (r) => r.billableMinutes, render: (r) => hoursCell(r.billableMinutes), footer: (t) => strong(formatHours(t.billableMinutes)) },
    { key: 'allTimeMinutes', header: 'All-time h', align: 'right', sortValue: (r) => r.allTimeMinutes, render: (r) => hoursCell(r.allTimeMinutes), footer: (t) => strong(formatHours(t.allTimeMinutes)) },
    {
      key: 'target',
      header: 'Target',
      align: 'right',
      sortValue: (r) => (r.targetHours ? r.allTimeMinutes / 60 / r.targetHours : -1),
      render: (r) =>
        r.targetHours ? (
          <span className="tabular">
            {formatNumber(r.targetHours)} h <span className="text-xs text-ink-muted">({formatPercent((r.allTimeMinutes / 60 / r.targetHours) * 100)})</span>
          </span>
        ) : (
          <span className="text-ink-muted">—</span>
        ),
    },
  ],
  csv: (ctx) => [
    { header: 'Project', value: (r) => r.project, total: () => 'TOTAL' },
    { header: 'Project no.', value: (r) => r.projectNumber },
    { header: 'Customer', value: (r) => nameOf.customer(ctx, r.customerId) },
    { header: 'Status', value: (r) => getStatusMeta('project', r.status).label },
    { header: 'Recorded hours', value: (r) => formatHours(r.recordedMinutes), total: (t) => formatHours(t.recordedMinutes) },
    { header: 'Billable hours (approved)', value: (r) => formatHours(r.billableMinutes), total: (t) => formatHours(t.billableMinutes) },
    { header: 'All-time recorded hours', value: (r) => formatHours(r.allTimeMinutes), total: (t) => formatHours(t.allTimeMinutes) },
    { header: 'Target hours', value: (r) => r.targetHours ?? '' },
  ],
};

const recordedOf = (r) => (isClosedRecord(r) ? r.recordedDurationMinutes : 0);
const billableOf = (r, ctx) => (isApprovedBillable(r, ctx.workingHours) ? getBillableMinutes(r) : 0);
const attendanceStatusOf = (r, ctx) =>
  displayAttendanceStatus(r, {
    now: ctx.now,
    openShiftAlertHours: ctx.workingHours.openShiftAlertHours,
    reviewShiftsOverHours: ctx.workingHours.reviewShiftsOverHours,
  });

const attendanceHistory = {
  filters: ['range', 'employee', 'customer', 'project'],
  noun: 'record',
  getRows: attendanceHistoryReport,
  rowLink: (r) => `/attendance/${r.id}`,
  totals: (rows, ctx) => ({
    count: rows.length,
    closed: rows.filter(isClosedRecord).length,
    recordedMinutes: sum(rows, recordedOf),
    billableMinutes: sum(rows, (r) => billableOf(r, ctx)),
    review: rows.filter((r) => attendanceStatusOf(r, ctx) === 'needs_review').length,
  }),
  summary: (t) => [
    { label: 'Records', value: formatNumber(t.count), hint: `${formatNumber(t.closed)} completed shifts` },
    { label: 'Recorded hours', value: formatHours(t.recordedMinutes, { suffix: true }), hint: 'Closed, non-cancelled shifts' },
    { label: 'Billable hours (approved)', value: formatHours(t.billableMinutes, { suffix: true }) },
    { label: 'Needs review', value: formatNumber(t.review), tone: t.review ? 'warning' : undefined, hint: 'Not billable until approved' },
  ],
  columns: (ctx) => [
    {
      key: 'date',
      header: 'Date',
      primary: true,
      sortValue: (r) => r.checkInAt,
      render: (r) => (
        <Link to={`/attendance/${r.id}`} className="font-medium text-ink hover:text-brand-700">
          {formatDate(r.checkInAt)}
        </Link>
      ),
      footer: () => strong('Total'),
    },
    { key: 'employee', header: 'Employee', sortValue: (r) => nameOf.employee(ctx, r.employeeId), render: (r) => nameOf.employee(ctx, r.employeeId) },
    {
      key: 'project',
      header: 'Customer / project',
      render: (r) => (
        <span className="block max-w-[14rem]">
          <span className="block truncate">{nameOf.customer(ctx, r.customerId)}</span>
          <span className="block truncate text-xs text-ink-muted">{nameOf.project(ctx, r.projectId)}</span>
        </span>
      ),
    },
    { key: 'time', header: 'Shift', render: (r) => <span className="tabular whitespace-nowrap">{formatTime(r.checkInAt)} – {r.checkOutAt ? formatTime(r.checkOutAt) : 'open'}</span> },
    { key: 'recorded', header: 'Recorded h', align: 'right', sortValue: recordedOf, render: (r) => (isClosedRecord(r) ? hoursCell(r.recordedDurationMinutes) : '—'), footer: (t) => strong(formatHours(t.recordedMinutes)) },
    {
      key: 'billable',
      header: 'Billable h',
      align: 'right',
      sortValue: (r) => billableOf(r, ctx),
      render: (r) => (isApprovedBillable(r, ctx.workingHours) ? hoursCell(getBillableMinutes(r)) : <span className="text-ink-muted">—</span>),
      footer: (t) => strong(formatHours(t.billableMinutes)),
    },
    { key: 'status', header: 'Status', sortValue: (r) => attendanceStatusOf(r, ctx), render: (r) => <StatusBadge kind="attendance" status={attendanceStatusOf(r, ctx)} /> },
  ],
  csv: (ctx) => [
    { header: 'Date', value: (r) => formatDate(r.checkInAt, 'yyyy-MM-dd'), total: () => 'TOTAL' },
    { header: 'Employee', value: (r) => nameOf.employee(ctx, r.employeeId) },
    { header: 'Employee no.', value: (r) => ctx.employeesById[r.employeeId]?.employeeNumber ?? '' },
    { header: 'Customer', value: (r) => nameOf.customer(ctx, r.customerId) },
    { header: 'Project', value: (r) => nameOf.project(ctx, r.projectId) },
    { header: 'Check-in', value: (r) => formatDate(r.checkInAt, 'yyyy-MM-dd HH:mm') },
    { header: 'Check-out', value: (r) => (r.checkOutAt ? formatDate(r.checkOutAt, 'yyyy-MM-dd HH:mm') : '') },
    { header: 'Recorded hours', value: (r) => (isClosedRecord(r) ? formatHours(r.recordedDurationMinutes) : ''), total: (t) => formatHours(t.recordedMinutes) },
    { header: 'Billable hours (approved)', value: (r) => (isApprovedBillable(r, ctx.workingHours) ? formatHours(getBillableMinutes(r)) : ''), total: (t) => formatHours(t.billableMinutes) },
    { header: 'Status', value: (r) => getStatusMeta('attendance', attendanceStatusOf(r, ctx)).label },
  ],
};

const isIssued = (inv) => ISSUED_INVOICE_STATUSES.includes(inv.status);

const invoiceSummary = {
  filters: ['range', 'customer', 'project', 'status'],
  noun: 'invoice',
  money: true,
  getRows: invoiceSummaryReport,
  rowLink: (r) => `/invoices/${r.id}`,
  totals: (rows, ctx) => {
    const issued = rows.filter(isIssued);
    return {
      count: rows.length,
      issuedCount: issued.length,
      draftCount: rows.filter((r) => r.status === 'draft').length,
      voidCount: rows.filter((r) => r.status === 'void').length,
      ...moneyTotals(issued, ['taxableAmount', 'taxAmount', 'total', 'amountPaid', 'balanceDue'], ctx.currency),
      draftTotal: moneyTotals(rows.filter((r) => r.status === 'draft'), ['total'], ctx.currency).total,
    };
  },
  summary: (t, ctx) => [
    { label: 'Invoiced (finalized)', value: formatMoney(t.total, ctx.currency), hint: otherCurrencyHint(t) ?? `${t.issuedCount} invoice(s), incl. tax` },
    { label: 'Collected', value: formatMoney(t.amountPaid, ctx.currency), tone: 'success', hint: 'Payments recorded on these invoices' },
    { label: 'Outstanding', value: formatMoney(t.balanceDue, ctx.currency), tone: t.balanceDue ? 'warning' : undefined, hint: 'Balance still due' },
    { label: 'Drafts (not invoiced)', value: formatMoney(t.draftTotal, ctx.currency), hint: `${t.draftCount} draft(s) · ${t.voidCount} void excluded` },
  ],
  columns: (ctx) => [
    { key: 'number', header: 'Invoice', primary: true, sortValue: (r) => invoiceLabel(r), render: invoiceLink, footer: () => strong('Total (finalized)') },
    { key: 'customer', header: 'Customer', sortValue: (r) => nameOf.customer(ctx, r.customerId), render: (r) => <span className="block max-w-[12rem] truncate">{nameOf.customer(ctx, r.customerId)}</span> },
    { key: 'issueDate', header: 'Invoice date', sortValue: (r) => r.issueDate, render: (r) => formatDate(r.issueDate) },
    { key: 'dueDate', header: 'Due date', sortValue: (r) => r.dueDate, render: (r) => formatDate(r.dueDate) },
    { key: 'taxableAmount', header: 'Net', align: 'right', sortValue: (r) => r.taxableAmount, render: (r) => money(r.taxableAmount, r.currency), footer: (t) => strong(money(t.taxableAmount, ctx.currency)) },
    { key: 'taxAmount', header: 'Tax', align: 'right', sortValue: (r) => r.taxAmount, render: (r) => money(r.taxAmount, r.currency), footer: (t) => strong(money(t.taxAmount, ctx.currency)) },
    { key: 'total', header: 'Total', align: 'right', sortValue: (r) => r.total, render: (r) => money(r.total, r.currency), footer: (t) => strong(money(t.total, ctx.currency)) },
    { key: 'amountPaid', header: 'Paid', align: 'right', sortValue: (r) => r.amountPaid, render: (r) => money(r.amountPaid, r.currency), footer: (t) => strong(money(t.amountPaid, ctx.currency)) },
    { key: 'balanceDue', header: 'Balance', align: 'right', sortValue: (r) => r.balanceDue, render: (r) => (isIssued(r) ? money(r.balanceDue, r.currency) : <span className="text-ink-muted">—</span>), footer: (t) => strong(money(t.balanceDue, ctx.currency)) },
    { key: 'status', header: 'Status', sortValue: (r) => r.status, render: (r) => <StatusBadge kind="invoice" status={r.status} /> },
  ],
  csv: (ctx) => [
    { header: 'Invoice', value: (r) => invoiceLabel(r), total: () => `TOTAL finalized (${ctx.currency}, excl. drafts & void)` },
    { header: 'Customer', value: (r) => nameOf.customer(ctx, r.customerId) },
    { header: 'Invoice date', value: (r) => r.issueDate },
    { header: 'Due date', value: (r) => r.dueDate },
    { header: 'Currency', value: (r) => r.currency, total: () => ctx.currency },
    { header: 'Net amount', value: (r) => formatMoneyPlain(r.taxableAmount, r.currency), total: (t) => formatMoneyPlain(t.taxableAmount, ctx.currency) },
    { header: 'Tax', value: (r) => formatMoneyPlain(r.taxAmount, r.currency), total: (t) => formatMoneyPlain(t.taxAmount, ctx.currency) },
    { header: 'Total', value: (r) => formatMoneyPlain(r.total, r.currency), total: (t) => formatMoneyPlain(t.total, ctx.currency) },
    { header: 'Paid', value: (r) => formatMoneyPlain(r.amountPaid, r.currency), total: (t) => formatMoneyPlain(t.amountPaid, ctx.currency) },
    { header: 'Balance due', value: (r) => (isIssued(r) ? formatMoneyPlain(r.balanceDue, r.currency) : ''), total: (t) => formatMoneyPlain(t.balanceDue, ctx.currency) },
    { header: 'Status', value: (r) => getStatusMeta('invoice', r.status).label },
  ],
};

const outstandingInvoices = {
  filters: ['range', 'customer'],
  noun: 'invoice',
  money: true,
  getRows: outstandingInvoicesReport,
  rowLink: (r) => `/invoices/${r.id}`,
  totals: (rows, ctx) => {
    const overdue = rows.filter((r) => r.daysPastDue > 0);
    return {
      count: rows.length,
      overdueCount: overdue.length,
      ...moneyTotals(rows, ['total', 'amountPaid', 'balanceDue'], ctx.currency),
      overdueBalance: moneyTotals(overdue, ['balanceDue'], ctx.currency).balanceDue,
    };
  },
  summary: (t, ctx) => [
    { label: 'Open invoices', value: formatNumber(t.count) },
    { label: 'Outstanding balance', value: formatMoney(t.balanceDue, ctx.currency), tone: t.balanceDue ? 'warning' : undefined, hint: otherCurrencyHint(t) ?? 'Not yet collected' },
    { label: 'Past due', value: formatMoney(t.overdueBalance, ctx.currency), tone: t.overdueBalance ? 'danger' : undefined, hint: `${t.overdueCount} invoice(s) past due date` },
    { label: 'Already collected on these', value: formatMoney(t.amountPaid, ctx.currency), tone: 'success', hint: 'Partial payments received' },
  ],
  columns: (ctx) => [
    { key: 'number', header: 'Invoice', primary: true, sortValue: (r) => invoiceLabel(r), render: invoiceLink, footer: () => strong('Total') },
    { key: 'customer', header: 'Customer', sortValue: (r) => nameOf.customer(ctx, r.customerId), render: (r) => <span className="block max-w-[12rem] truncate">{nameOf.customer(ctx, r.customerId)}</span> },
    { key: 'issueDate', header: 'Invoice date', sortValue: (r) => r.issueDate, render: (r) => formatDate(r.issueDate) },
    { key: 'dueDate', header: 'Due date', sortValue: (r) => r.dueDate, render: (r) => formatDate(r.dueDate) },
    {
      key: 'daysPastDue',
      header: 'Days past due',
      align: 'right',
      sortValue: (r) => r.daysPastDue,
      render: (r) => (r.daysPastDue > 0 ? <span className="font-medium text-danger-ink">{r.daysPastDue}</span> : <span className="text-ink-muted">Not due</span>),
    },
    { key: 'total', header: 'Total', align: 'right', sortValue: (r) => r.total, render: (r) => money(r.total, r.currency), footer: (t) => strong(money(t.total, ctx.currency)) },
    { key: 'amountPaid', header: 'Paid', align: 'right', sortValue: (r) => r.amountPaid, render: (r) => money(r.amountPaid, r.currency), footer: (t) => strong(money(t.amountPaid, ctx.currency)) },
    { key: 'balanceDue', header: 'Balance due', align: 'right', sortValue: (r) => r.balanceDue, render: (r) => money(r.balanceDue, r.currency), footer: (t) => strong(money(t.balanceDue, ctx.currency)) },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge kind="invoice" status={r.status} /> },
  ],
  csv: (ctx) => [
    { header: 'Invoice', value: (r) => invoiceLabel(r), total: () => `TOTAL (${ctx.currency})` },
    { header: 'Customer', value: (r) => nameOf.customer(ctx, r.customerId) },
    { header: 'Invoice date', value: (r) => r.issueDate },
    { header: 'Due date', value: (r) => r.dueDate },
    { header: 'Days past due', value: (r) => r.daysPastDue },
    { header: 'Currency', value: (r) => r.currency, total: () => ctx.currency },
    { header: 'Total', value: (r) => formatMoneyPlain(r.total, r.currency), total: (t) => formatMoneyPlain(t.total, ctx.currency) },
    { header: 'Paid', value: (r) => formatMoneyPlain(r.amountPaid, r.currency), total: (t) => formatMoneyPlain(t.amountPaid, ctx.currency) },
    { header: 'Balance due', value: (r) => formatMoneyPlain(r.balanceDue, r.currency), total: (t) => formatMoneyPlain(t.balanceDue, ctx.currency) },
    { header: 'Status', value: (r) => getStatusMeta('invoice', r.status).label },
  ],
};

const revenueByCustomer = {
  filters: ['range', 'customer'],
  noun: 'customer',
  money: true,
  getRows: revenueByCustomerReport,
  totals: (rows, ctx) => ({
    count: rows.length,
    invoiceCount: sum(rows, (r) => r.invoiceCount),
    ...moneyTotals(rows, ['netInvoiced', 'tax', 'invoiced', 'collected', 'outstanding'], ctx.currency),
  }),
  summary: (t, ctx) => [
    { label: 'Invoiced (incl. tax)', value: formatMoney(t.invoiced, ctx.currency), hint: otherCurrencyHint(t) ?? `${t.invoiceCount} finalized invoice(s)` },
    { label: 'Net revenue invoiced', value: formatMoney(t.netInvoiced, ctx.currency), hint: `Tax ${formatMoney(t.tax, ctx.currency)}` },
    { label: 'Collected', value: formatMoney(t.collected, ctx.currency), tone: 'success', hint: 'Payments dated in period' },
    { label: 'Outstanding', value: formatMoney(t.outstanding, ctx.currency), tone: t.outstanding ? 'warning' : undefined, hint: 'Unpaid on invoices in period' },
  ],
  columns: (ctx) => [
    {
      key: 'customer',
      header: 'Customer',
      primary: true,
      sortValue: (r) => r.customer,
      render: (r) => (
        <Link to={`/customers/${r.id}`} className="font-medium text-ink hover:text-brand-700">
          {r.customer}
        </Link>
      ),
      footer: () => strong('Total'),
    },
    { key: 'invoiceCount', header: 'Invoices', align: 'right', sortValue: (r) => r.invoiceCount, footer: (t) => strong(formatNumber(t.invoiceCount)) },
    { key: 'netInvoiced', header: 'Net', align: 'right', sortValue: (r) => r.netInvoiced, render: (r) => money(r.netInvoiced, r.currency), footer: (t) => strong(money(t.netInvoiced, ctx.currency)) },
    { key: 'tax', header: 'Tax', align: 'right', sortValue: (r) => r.tax, render: (r) => money(r.tax, r.currency), footer: (t) => strong(money(t.tax, ctx.currency)) },
    { key: 'invoiced', header: 'Invoiced', align: 'right', sortValue: (r) => r.invoiced, render: (r) => money(r.invoiced, r.currency), footer: (t) => strong(money(t.invoiced, ctx.currency)) },
    { key: 'collected', header: 'Collected', align: 'right', sortValue: (r) => r.collected, render: (r) => money(r.collected, r.currency), footer: (t) => strong(money(t.collected, ctx.currency)) },
    { key: 'outstanding', header: 'Outstanding', align: 'right', sortValue: (r) => r.outstanding, render: (r) => money(r.outstanding, r.currency), footer: (t) => strong(money(t.outstanding, ctx.currency)) },
  ],
  csv: (ctx) => [
    { header: 'Customer', value: (r) => r.customer, total: () => `TOTAL (${ctx.currency})` },
    { header: 'Currency', value: (r) => r.currency, total: () => ctx.currency },
    { header: 'Finalized invoices', value: (r) => r.invoiceCount, total: (t) => t.invoiceCount },
    { header: 'Net invoiced', value: (r) => formatMoneyPlain(r.netInvoiced, r.currency), total: (t) => formatMoneyPlain(t.netInvoiced, ctx.currency) },
    { header: 'Tax', value: (r) => formatMoneyPlain(r.tax, r.currency), total: (t) => formatMoneyPlain(t.tax, ctx.currency) },
    { header: 'Invoiced (incl. tax)', value: (r) => formatMoneyPlain(r.invoiced, r.currency), total: (t) => formatMoneyPlain(t.invoiced, ctx.currency) },
    { header: 'Collected', value: (r) => formatMoneyPlain(r.collected, r.currency), total: (t) => formatMoneyPlain(t.collected, ctx.currency) },
    { header: 'Outstanding', value: (r) => formatMoneyPlain(r.outstanding, r.currency), total: (t) => formatMoneyPlain(t.outstanding, ctx.currency) },
  ],
};

const monthlyBilling = {
  filters: ['range', 'customer'],
  noun: 'month',
  money: true,
  getRows: monthlyBillingReport,
  rowId: (r) => r.month,
  totals: (rows, ctx) => ({
    count: rows.length,
    invoiceCount: sum(rows, (r) => r.invoiceCount),
    ...moneyTotals(rows, ['netInvoiced', 'tax', 'invoiced', 'collected', 'outstanding'], ctx.currency, () => ctx.currency),
  }),
  summary: (t, ctx) => [
    { label: 'Invoiced (incl. tax)', value: formatMoney(t.invoiced, ctx.currency), hint: `${t.invoiceCount} finalized invoice(s)` },
    { label: 'Net invoiced', value: formatMoney(t.netInvoiced, ctx.currency), hint: `Tax ${formatMoney(t.tax, ctx.currency)}` },
    { label: 'Collected', value: formatMoney(t.collected, ctx.currency), tone: 'success', hint: 'By payment date' },
    { label: 'Outstanding', value: formatMoney(t.outstanding, ctx.currency), tone: t.outstanding ? 'warning' : undefined, hint: 'Unpaid, by invoice month' },
  ],
  columns: (ctx) => [
    { key: 'label', header: 'Month', primary: true, sortValue: (r) => r.month, render: (r) => <span className="font-medium text-ink">{r.label}</span>, footer: () => strong('Total') },
    { key: 'invoiceCount', header: 'Invoices', align: 'right', sortValue: (r) => r.invoiceCount, footer: (t) => strong(formatNumber(t.invoiceCount)) },
    { key: 'netInvoiced', header: 'Net', align: 'right', sortValue: (r) => r.netInvoiced, render: (r) => money(r.netInvoiced, ctx.currency), footer: (t) => strong(money(t.netInvoiced, ctx.currency)) },
    { key: 'tax', header: 'Tax', align: 'right', sortValue: (r) => r.tax, render: (r) => money(r.tax, ctx.currency), footer: (t) => strong(money(t.tax, ctx.currency)) },
    { key: 'invoiced', header: 'Invoiced', align: 'right', sortValue: (r) => r.invoiced, render: (r) => money(r.invoiced, ctx.currency), footer: (t) => strong(money(t.invoiced, ctx.currency)) },
    { key: 'collected', header: 'Collected', align: 'right', sortValue: (r) => r.collected, render: (r) => money(r.collected, ctx.currency), footer: (t) => strong(money(t.collected, ctx.currency)) },
    { key: 'outstanding', header: 'Outstanding', align: 'right', sortValue: (r) => r.outstanding, render: (r) => money(r.outstanding, ctx.currency), footer: (t) => strong(money(t.outstanding, ctx.currency)) },
  ],
  csv: (ctx) => [
    { header: 'Month', value: (r) => r.month, total: () => `TOTAL (${ctx.currency})` },
    { header: 'Finalized invoices', value: (r) => r.invoiceCount, total: (t) => t.invoiceCount },
    { header: 'Net invoiced', value: (r) => formatMoneyPlain(r.netInvoiced, ctx.currency), total: (t) => formatMoneyPlain(t.netInvoiced, ctx.currency) },
    { header: 'Tax', value: (r) => formatMoneyPlain(r.tax, ctx.currency), total: (t) => formatMoneyPlain(t.tax, ctx.currency) },
    { header: 'Invoiced (incl. tax)', value: (r) => formatMoneyPlain(r.invoiced, ctx.currency), total: (t) => formatMoneyPlain(t.invoiced, ctx.currency) },
    { header: 'Collected', value: (r) => formatMoneyPlain(r.collected, ctx.currency), total: (t) => formatMoneyPlain(t.collected, ctx.currency) },
    { header: 'Outstanding', value: (r) => formatMoneyPlain(r.outstanding, ctx.currency), total: (t) => formatMoneyPlain(t.outstanding, ctx.currency) },
  ],
};

export const REPORT_DEFINITIONS = {
  employee_hours: employeeHours,
  customer_billable: customerBillable,
  project_hours: projectHours,
  attendance_history: attendanceHistory,
  invoice_summary: invoiceSummary,
  outstanding_invoices: outstandingInvoices,
  revenue_by_customer: revenueByCustomer,
  monthly_billing: monthlyBilling,
};

/** Maps URL filter values to the selector filter shape, keeping only filters the report supports. */
export function toSelectorFilters(definition, values) {
  const has = (k) => definition.filters.includes(k);
  return {
    from: has('range') ? values.from : '',
    to: has('range') ? values.to : '',
    employeeId: has('employee') ? values.employee : '',
    customerId: has('customer') ? values.customer : '',
    projectId: has('project') ? values.project : '',
    invoiceStatus: has('status') ? values.status : '',
  };
}

