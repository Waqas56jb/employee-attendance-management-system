import { Link } from 'react-router-dom';
import { Ban, Pencil, Tags } from 'lucide-react';
import { RATE_STATUS } from '../../utils/calculations';
import { formatDate, formatDateTime } from '../../utils/dateUtils';
import { DataTable } from '../common/DataTable';
import { StatusBadge } from '../common/StatusBadge';
import { MoneyDisplay } from '../common/MoneyDisplay';
import { Button } from '../common/Button';
import { EmptyState } from '../common/EmptyState';

/**
 * Hourly-rate history. Rows are rates with `displayStatus` (from listRates).
 * Edit is offered for scheduled and active rates (active: end date / notes only);
 * deactivate for any rate that is not already inactive.
 */
export function RateHistoryTable({ rates, customersById, onEdit, onDeactivate, emptyAction }) {
  const columns = [
    {
      key: 'customer',
      header: 'Customer',
      primary: true,
      sortValue: (r) => customersById[r.customerId]?.companyName ?? '',
      render: (r) => (
        <div className="min-w-0">
          <Link to={`/customers/${r.customerId}`} className="font-medium text-ink hover:text-brand-700 hover:underline">
            {customersById[r.customerId]?.companyName ?? 'Unknown customer'}
          </Link>
          {r.notes && <p className="max-w-xs truncate text-xs text-ink-muted" title={r.notes}>{r.notes}</p>}
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Hourly rate',
      align: 'right',
      sortValue: (r) => r.amount,
      render: (r) => (
        <span className="font-medium">
          <MoneyDisplay amount={r.amount} currency={r.currency} />
          <span className="text-ink-muted"> / h</span>
        </span>
      ),
    },
    { key: 'currency', header: 'Currency', sortValue: (r) => r.currency, render: (r) => <span className="text-ink-secondary">{r.currency}</span> },
    { key: 'effectiveFrom', header: 'Effective from', sortValue: (r) => r.effectiveFrom, render: (r) => <span className="tabular">{formatDate(r.effectiveFrom)}</span> },
    {
      key: 'effectiveTo',
      header: 'Effective to',
      sortValue: (r) => r.effectiveTo ?? '9999-12-31',
      render: (r) => (r.effectiveTo ? <span className="tabular">{formatDate(r.effectiveTo)}</span> : <span className="text-ink-muted">Open-ended</span>),
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (r) => r.displayStatus,
      render: (r) => (
        <StatusBadge kind="rate" status={r.displayStatus} title={r.displayStatus === RATE_STATUS.INACTIVE && r.inactiveReason ? `Deactivated: ${r.inactiveReason}` : undefined} />
      ),
    },
    {
      key: 'updatedAt',
      header: 'Last updated',
      sortValue: (r) => r.updatedAt ?? '',
      render: (r) => <span className="text-xs text-ink-muted">{r.updatedAt ? formatDateTime(r.updatedAt) : '—'}</span>,
    },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      align: 'right',
      render: (r) => {
        const editable = r.displayStatus === RATE_STATUS.SCHEDULED || r.displayStatus === RATE_STATUS.ACTIVE;
        const name = customersById[r.customerId]?.companyName ?? 'customer';
        return (
          <div className="flex justify-end gap-1">
            {editable && (
              <Button variant="ghost" size="xs" icon={Pencil} onClick={() => onEdit(r)} aria-label={`Edit rate for ${name} from ${formatDate(r.effectiveFrom)}`}>
                Edit
              </Button>
            )}
            {r.displayStatus !== RATE_STATUS.INACTIVE && (
              <Button variant="danger-ghost" size="xs" icon={Ban} onClick={() => onDeactivate(r)} aria-label={`Deactivate rate for ${name} from ${formatDate(r.effectiveFrom)}`}>
                Deactivate
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rates}
      pageSize={15}
      caption="Hourly rates"
      rowClassName={(r) => (r.displayStatus === RATE_STATUS.INACTIVE || r.displayStatus === RATE_STATUS.EXPIRED ? 'opacity-70' : undefined)}
      emptyState={<EmptyState icon={Tags} title="No rates match these filters" description="Change the filters or create a rate for this customer." action={emptyAction} />}
    />
  );
}
