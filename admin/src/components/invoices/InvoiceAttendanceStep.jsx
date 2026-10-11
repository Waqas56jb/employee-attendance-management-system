import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarSearch, ClipboardList } from 'lucide-react';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { DataTable } from '../common/DataTable';
import { EmptyState } from '../common/EmptyState';
import { StatusBadge } from '../common/StatusBadge';
import { Tabs } from '../common/Tabs';
import { INVOICE_STATUS } from '../../utils/calculations';
import { formatMoney } from '../../utils/currency';
import { formatDate, formatTime } from '../../utils/dateUtils';
import { formatDuration, formatHoursValue, formatNumber } from '../../utils/formatters';
import { invoiceLabel } from '../../services/invoiceService';

function Stat({ label, value }) {
  return (
    <div className="min-w-0 bg-surface px-4 py-3">
      <p className="text-xs text-ink-muted">{label}</p>
      <p className="tabular mt-0.5 truncate text-base font-semibold text-ink">{value}</p>
    </div>
  );
}

/** Step 3 — billable vs excluded attendance for the selection, with reasons. */
export function InvoiceAttendanceStep({ prepared, currency, employeesById, projectsById, invoices }) {
  const [tab, setTab] = useState('eligible');
  const { rows, summary } = prepared;
  const eligible = useMemo(() => rows.filter((r) => r.eligible), [rows]);
  const excluded = useMemo(() => rows.filter((r) => !r.eligible), [rows]);

  // Which draft reserves a record (for links in the "excluded" tab).
  const draftByRecord = useMemo(() => {
    const map = {};
    invoices
      .filter((inv) => inv.status === INVOICE_STATUS.DRAFT)
      .forEach((inv) => inv.lineItems.forEach((l) => (l.attendanceRecordIds ?? []).forEach((id) => (map[id] = inv))));
    return map;
  }, [invoices]);

  const baseColumns = [
    {
      key: 'date',
      header: 'Work date',
      primary: true,
      sortValue: (r) => r.record.checkInAt,
      render: (r) => (
        <Link to={`/attendance/${r.record.id}`} className="whitespace-nowrap font-medium text-brand-700 hover:underline">
          {formatDate(r.workDate)}
        </Link>
      ),
    },
    {
      key: 'employee',
      header: 'Employee',
      sortValue: (r) => employeesById[r.record.employeeId]?.fullName ?? '',
      render: (r) => employeesById[r.record.employeeId]?.fullName ?? 'Unknown',
    },
    {
      key: 'project',
      header: 'Project',
      sortValue: (r) => projectsById[r.record.projectId]?.name ?? '',
      render: (r) => <span className="block max-w-[12rem] truncate">{projectsById[r.record.projectId]?.name ?? '—'}</span>,
    },
    {
      key: 'shift',
      header: 'Shift',
      mobile: false,
      render: (r) => (
        <span className="tabular whitespace-nowrap text-ink-secondary">
          {formatTime(r.record.checkInAt)} – {r.record.checkOutAt ? formatTime(r.record.checkOutAt) : 'open'}
        </span>
      ),
    },
    {
      key: 'recorded',
      header: 'Recorded',
      align: 'right',
      sortValue: (r) => r.recordedMinutes ?? 0,
      render: (r) => formatDuration(r.recordedMinutes),
    },
  ];

  const eligibleColumns = [
    ...baseColumns,
    {
      key: 'billable',
      header: 'Billable',
      align: 'right',
      sortValue: (r) => r.billableMinutes,
      render: (r) => (
        <span className="inline-flex items-center gap-1.5">
          {r.isAdjusted && <Badge tone="warning">Adjusted</Badge>}
          {formatHoursValue(r.quantityHours)}
        </span>
      ),
    },
    { key: 'rate', header: 'Rate', align: 'right', render: (r) => (r.rate ? `${formatMoney(r.rate.amount, currency)}/h` : '—') },
    { key: 'amount', header: 'Amount', align: 'right', sortValue: (r) => r.amount, render: (r) => formatMoney(r.amount, currency) },
  ];

  const excludedColumns = [
    ...baseColumns,
    {
      key: 'status',
      header: 'Status',
      sortValue: (r) => r.code,
      render: (r) => <StatusBadge kind="billing" status={r.code} />,
    },
    {
      key: 'reason',
      header: 'Reason',
      render: (r) => {
        const draft = r.code === 'in_draft' ? draftByRecord[r.record.id] : null;
        if (draft) {
          return (
            <span className="text-ink-secondary">
              In another draft:{' '}
              <Link to={`/invoices/${draft.id}`} className="font-medium text-brand-700 hover:underline">
                {invoiceLabel(draft)}
              </Link>
            </span>
          );
        }
        if (r.code === 'billed' && r.record.invoiceId) {
          return (
            <Link to={`/invoices/${r.record.invoiceId}`} className="text-brand-700 hover:underline">
              {r.reason}
            </Link>
          );
        }
        return <span className="text-ink-secondary">{r.reason}</span>;
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-5">
        <Stat label="Records in period" value={formatNumber(summary.totalRecords)} />
        <Stat label="Billable records" value={formatNumber(summary.eligibleRecords)} />
        <Stat label="Excluded records" value={formatNumber(summary.excludedRecords)} />
        <Stat label="Billable hours" value={formatHoursValue(summary.billableHours)} />
        <Stat label="Attendance value (net)" value={formatMoney(summary.amount, currency)} />
      </div>

      {summary.eligibleRecords === 0 && (
        <EmptyState
          icon={CalendarSearch}
          title="No billable attendance in this selection"
          description={
            summary.totalRecords
              ? 'All records in this period are excluded — see the reasons below. Approve, correct or include them first, or choose another period.'
              : 'No attendance was recorded for this customer in the selected period. Choose another period or check the attendance log.'
          }
          action={
            <>
              <Button variant="secondary" to="/billing/hours" icon={ClipboardList}>
                Review billable hours
              </Button>
              <Button variant="secondary" to="/attendance">
                Open attendance
              </Button>
            </>
          }
          compact
          className="rounded-lg border border-dashed border-line"
        />
      )}

      {rows.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-line">
          <Tabs
            className="px-2"
            label="Attendance records"
            value={tab}
            onChange={setTab}
            tabs={[
              { value: 'eligible', label: 'Billable', count: eligible.length },
              { value: 'excluded', label: 'Excluded', count: excluded.length },
            ]}
          />
          {tab === 'eligible' ? (
            <DataTable
              key="eligible"
              columns={eligibleColumns}
              rows={eligible}
              getRowId={(r) => r.record.id}
              pageSize={8}
              dense
              emptyState={<p className="px-4 py-6 text-center text-sm text-ink-muted">No billable records.</p>}
            />
          ) : (
            <DataTable
              key="excluded"
              columns={excludedColumns}
              rows={excluded}
              getRowId={(r) => r.record.id}
              pageSize={8}
              dense
              emptyState={<p className="px-4 py-6 text-center text-sm text-ink-muted">Nothing excluded — every record in this selection can be billed.</p>}
            />
          )}
        </div>
      )}
    </div>
  );
}
