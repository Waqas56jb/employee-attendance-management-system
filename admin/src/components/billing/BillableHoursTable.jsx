import { Link } from 'react-router-dom';
import { ExternalLink, History, MinusCircle, PencilLine, PlusCircle, Timer } from 'lucide-react';
import clsx from 'clsx';
import { EXCLUSION_CODE } from '../../utils/calculations';
import { formatMoney } from '../../utils/currency';
import { formatDate, formatTime } from '../../utils/dateUtils';
import { formatHours } from '../../utils/formatters';
import { invoiceLabel } from '../../services/invoiceService';
import { DataTable } from '../common/DataTable';
import { StatusBadge } from '../common/StatusBadge';
import { Button } from '../common/Button';
import { EmptyState } from '../common/EmptyState';
import { canEditBilling, rowStatus } from './billingHelpers';

/**
 * One row per attendance record in the billing selection, with recorded vs
 * billable time, the rate applied on that work date and the review status.
 */
export function BillableHoursTable({ rows, lookups, currency, onAdjust, onExclude, onInclude, onHistory, emptyState }) {
  const { employeesById, customersById, projectsById, invoicesById } = lookups;

  const columns = [
    {
      key: 'date',
      header: 'Date',
      sortValue: (r) => r.record.checkInAt,
      render: (r) => <span className="tabular whitespace-nowrap">{formatDate(r.workDate)}</span>,
    },
    {
      key: 'employee',
      header: 'Employee',
      primary: true,
      sortValue: (r) => employeesById[r.record.employeeId]?.fullName ?? '',
      render: (r) => (
        <span className="whitespace-nowrap font-medium text-ink">
          {employeesById[r.record.employeeId]?.fullName ?? 'Unknown employee'}
          <span className="font-normal text-ink-muted md:hidden"> · {formatDate(r.workDate)}</span>
        </span>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      mobile: false,
      sortValue: (r) => customersById[r.record.customerId]?.companyName ?? '',
      render: (r) => <span className="whitespace-nowrap text-ink-secondary">{customersById[r.record.customerId]?.companyName ?? '—'}</span>,
    },
    {
      key: 'project',
      header: 'Project',
      sortValue: (r) => projectsById[r.record.projectId]?.name ?? '',
      render: (r) => <span className="text-ink-secondary">{projectsById[r.record.projectId]?.name ?? '—'}</span>,
    },
    {
      key: 'checkIn',
      header: 'Check-in',
      render: (r) => <span className="tabular">{formatTime(r.record.checkInAt)}</span>,
    },
    {
      key: 'checkOut',
      header: 'Check-out',
      render: (r) => (r.record.checkOutAt ? <span className="tabular">{formatTime(r.record.checkOutAt)}</span> : <span className="text-ink-muted">Open</span>),
    },
    {
      key: 'recorded',
      header: 'Recorded h',
      align: 'right',
      sortValue: (r) => r.recordedMinutes ?? -1,
      render: (r) => <span className="text-ink-secondary">{formatHours(r.recordedMinutes)}</span>,
    },
    {
      key: 'billable',
      header: 'Billable h',
      align: 'right',
      sortValue: (r) => r.billableMinutes,
      render: (r) =>
        r.isAdjusted ? (
          <span className="inline-flex items-center gap-1 rounded bg-warning-soft px-1.5 py-0.5 font-medium text-warning-ink" title="Adjusted by an administrator">
            <PencilLine size={12} aria-hidden />
            {formatHours(r.billableMinutes)}
            <span className="sr-only"> (adjusted)</span>
          </span>
        ) : (
          <span className="font-medium text-ink">{formatHours(r.billableMinutes)}</span>
        ),
    },
    {
      key: 'rate',
      header: 'Rate',
      align: 'right',
      sortValue: (r) => r.rate?.amount ?? -1,
      render: (r) =>
        r.rate ? (
          <span className="whitespace-nowrap">{formatMoney(r.rate.amount, r.rate.currency)}/h</span>
        ) : (
          <span className="font-medium text-danger-ink">No rate</span>
        ),
    },
    {
      key: 'amount',
      header: 'Line total',
      align: 'right',
      sortValue: (r) => r.amount,
      render: (r) => <span className={clsx('whitespace-nowrap', r.eligible ? 'font-medium text-ink' : 'text-ink-muted')}>{r.rate ? formatMoney(r.amount, currency) : '—'}</span>,
    },
    {
      key: 'status',
      header: 'Review status',
      sortValue: (r) => rowStatus(r),
      render: (r) => (
        <div className="min-w-[8rem]">
          <StatusBadge kind="billing" status={rowStatus(r)} title={r.reason ?? undefined} />
          {r.reason && r.code !== EXCLUSION_CODE.BILLED && <p className="mt-0.5 max-w-[14rem] text-2xs leading-snug text-ink-muted">{r.reason}</p>}
        </div>
      ),
    },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      align: 'right',
      render: (r) => {
        const name = employeesById[r.record.employeeId]?.fullName ?? 'employee';
        const label = `${name}, ${formatDate(r.workDate)}`;
        const hasHistory = (r.record.billingAdjustments ?? []).length > 0;
        if (r.code === EXCLUSION_CODE.BILLED) {
          const invoice = invoicesById[r.record.invoiceId];
          return (
            <div className="flex flex-wrap items-center justify-end gap-1">
              <Link to={`/invoices/${r.record.invoiceId}`} className="whitespace-nowrap text-xs font-medium text-brand-700 hover:underline">
                Billed on {invoiceLabel(invoice) || 'invoice'}
              </Link>
              {hasHistory && (
                <Button variant="ghost" size="icon-sm" icon={History} onClick={() => onHistory(r)} aria-label={`Adjustment history for ${label}`} title="Adjustment history" />
              )}
            </div>
          );
        }
        return (
          <div className="flex flex-wrap items-center justify-end gap-1">
            {canEditBilling(r) && (
              <>
                <Button variant="ghost" size="icon-sm" icon={Timer} onClick={() => onAdjust(r)} aria-label={`Adjust billable hours for ${label}`} title="Adjust billable hours" />
                {r.record.billingExclusion ? (
                  <Button variant="ghost" size="icon-sm" icon={PlusCircle} onClick={() => onInclude(r)} aria-label={`Include again: ${label}`} title="Include again" />
                ) : (
                  <Button variant="ghost" size="icon-sm" icon={MinusCircle} onClick={() => onExclude(r)} aria-label={`Exclude from billing: ${label}`} title="Exclude from billing" />
                )}
              </>
            )}
            {!canEditBilling(r) && hasHistory && (
              <Button variant="ghost" size="icon-sm" icon={History} onClick={() => onHistory(r)} aria-label={`Adjustment history for ${label}`} title="Adjustment history" />
            )}
            <Button variant="ghost" size="icon-sm" icon={ExternalLink} to={`/attendance/${r.record.id}`} aria-label={`Open attendance record: ${label}`} title="Open attendance record" />
          </div>
        );
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      getRowId={(r) => r.record.id}
      pageSize={25}
      dense
      caption="Billable hours"
      rowClassName={(r) => (!r.eligible && r.code !== EXCLUSION_CODE.BILLED ? 'bg-subtle' : undefined)}
      emptyState={emptyState ?? <EmptyState compact title="No records" />}
    />
  );
}
