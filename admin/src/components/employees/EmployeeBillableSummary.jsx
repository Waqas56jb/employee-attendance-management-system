import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Receipt } from 'lucide-react';
import { useDb } from '../../hooks/useStore';
import { useBusiness } from '../../hooks/useBusiness';
import { Card, CardBody, CardHeader } from '../common/Card';
import { Badge } from '../common/Badge';
import { DataTable } from '../common/DataTable';
import { DateRangePicker } from '../common/DateRangePicker';
import { EmptyState } from '../common/EmptyState';
import { MoneyDisplay } from '../common/MoneyDisplay';
import { getBillingRows } from '../../services/billingService';
import { isApprovedBillable } from '../../services/reportService';
import { EXCLUSION_CODE } from '../../utils/calculations';
import { getPresetRange } from '../../utils/dateUtils';
import { formatDuration } from '../../utils/formatters';

const sumMinutes = (rows) => rows.reduce((s, r) => s + r.billableMinutes, 0);

/**
 * Approved billable hours of one employee per customer for a period.
 * "Billed" = already on a finalized invoice. "Unbilled value" = eligible,
 * not-yet-invoiced hours valued at the rate in force on each work date.
 */
export function EmployeeBillableSummary({ employeeId, customerIds }) {
  const db = useDb();
  const { workingHours } = useBusiness();
  const [range, setRange] = useState(() => getPresetRange('this_month'));

  const rows = useMemo(
    () =>
      customerIds
        .map((customerId) => {
          const customer = db.customers.find((c) => c.id === customerId);
          if (!customer) return null;
          const billing = getBillingRows(db, { customerId, employeeId, from: range.from, to: range.to });
          const approved = billing.filter((r) => isApprovedBillable(r.record, workingHours));
          const billed = billing.filter((r) => r.code === EXCLUSION_CODE.BILLED);
          const draft = billing.filter((r) => r.code === EXCLUSION_CODE.IN_DRAFT);
          const eligible = billing.filter((r) => r.eligible);
          const noRate = billing.filter((r) => r.code === EXCLUSION_CODE.NO_RATE);
          return {
            id: customerId,
            customer,
            approved: sumMinutes(approved),
            billed: sumMinutes(billed),
            draft: sumMinutes(draft),
            unbilled: sumMinutes(eligible),
            unbilledValue: eligible.reduce((s, r) => s + r.amount, 0),
            noRate: noRate.length,
          };
        })
        .filter((r) => r && (r.approved || r.billed || r.draft || r.unbilled || r.noRate)),
    [db, customerIds, employeeId, range, workingHours],
  );

  const columns = [
    {
      key: 'customer',
      header: 'Customer',
      primary: true,
      sortValue: (r) => r.customer.companyName,
      render: (r) => (
        <span className="block min-w-0">
          <Link to={`/customers/${r.id}`} className="block truncate font-medium text-ink hover:text-brand-700 hover:underline">
            {r.customer.companyName}
          </Link>
          {r.noRate > 0 && (
            <Badge tone="danger" className="mt-1">
              {r.noRate} record{r.noRate === 1 ? '' : 's'} without a rate
            </Badge>
          )}
        </span>
      ),
    },
    { key: 'approved', header: 'Approved billable', align: 'right', sortValue: (r) => r.approved, render: (r) => formatDuration(r.approved) },
    { key: 'billed', header: 'Billed', align: 'right', sortValue: (r) => r.billed, render: (r) => formatDuration(r.billed) },
    { key: 'draft', header: 'In draft', align: 'right', sortValue: (r) => r.draft, render: (r) => formatDuration(r.draft) },
    { key: 'unbilled', header: 'Unbilled', align: 'right', sortValue: (r) => r.unbilled, render: (r) => formatDuration(r.unbilled) },
    {
      key: 'value',
      header: 'Unbilled value',
      align: 'right',
      sortValue: (r) => r.unbilledValue,
      render: (r) => <MoneyDisplay amount={r.unbilledValue} currency={r.customer.currency} />,
    },
  ];

  return (
    <Card>
      <CardHeader title="Billable hours" icon={Receipt} description="Approved hours of this employee by customer." />
      <div className="border-b border-line px-4 py-3">
        <DateRangePicker value={range} onChange={setRange} compact label="Billable period" />
      </div>
      <DataTable
        columns={columns}
        rows={rows}
        initialSort={{ key: 'approved', dir: 'desc' }}
        dense
        paginate={false}
        caption="Billable hours by customer"
        emptyState={<EmptyState compact icon={Receipt} title="No billable hours in this period" description="Pick a different period to see approved hours." />}
      />
      <CardBody className="border-t border-line">
        <p className="text-xs text-ink-muted">
          <strong className="font-medium text-ink-secondary">Billed</strong> hours are on finalized invoices and keep their invoiced rate.{' '}
          <strong className="font-medium text-ink-secondary">Unbilled value</strong> is an estimate at the current rate in force on each work
          date — not an invoiced amount.
        </p>
      </CardBody>
    </Card>
  );
}
