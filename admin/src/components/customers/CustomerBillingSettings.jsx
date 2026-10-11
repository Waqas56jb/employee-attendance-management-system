import { useMemo } from 'react';
import { Coins, Pencil, SlidersHorizontal, Star } from 'lucide-react';
import clsx from 'clsx';
import { useDb } from '../../hooks/useStore';
import { useBusiness } from '../../hooks/useBusiness';
import { listRates } from '../../services/billingService';
import { getCurrentRate } from '../../utils/calculations';
import { formatDate } from '../../utils/dateUtils';
import { Card, CardBody, CardHeader } from '../common/Card';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { Callout } from '../common/Callout';
import { DataTable } from '../common/DataTable';
import { DescriptionList } from '../common/DescriptionList';
import { EmptyState } from '../common/EmptyState';
import { MoneyDisplay } from '../common/MoneyDisplay';
import { StatusBadge } from '../common/StatusBadge';
import { taxRateLabel } from './customerUtils';

/** Rate history (read-only here), tax and payment-term settings of one customer. */
export function CustomerBillingSettings({ customer, onEdit }) {
  const db = useDb();
  const { invoiceSettings } = useBusiness();
  const rates = useMemo(() => listRates(db, customer.id), [db, customer.id]);
  const current = getCurrentRate(db.hourlyRates, customer.id, customer.currency);
  const scheduled = rates.filter((r) => r.displayStatus === 'scheduled');
  const manageTo = `/billing/rates?customer=${customer.id}`;

  const columns = [
    {
      key: 'amount',
      header: 'Rate',
      primary: true,
      sortValue: (r) => r.amount,
      render: (r) => (
        <span className="flex items-center gap-2">
          <span className="font-medium">
            <MoneyDisplay amount={r.amount} currency={r.currency} />
            <span className="text-ink-muted">/h</span>
          </span>
          {current?.id === r.id && (
            <Badge tone="brand" icon={Star}>
              Current
            </Badge>
          )}
        </span>
      ),
    },
    { key: 'from', header: 'Effective from', sortValue: (r) => r.effectiveFrom, render: (r) => formatDate(r.effectiveFrom) },
    { key: 'to', header: 'Effective to', sortValue: (r) => r.effectiveTo || '9999', render: (r) => (r.effectiveTo ? formatDate(r.effectiveTo) : <span className="text-ink-muted">Open-ended</span>) },
    { key: 'status', header: 'Status', sortValue: (r) => r.displayStatus, render: (r) => <StatusBadge kind="rate" status={r.displayStatus} /> },
    { key: 'notes', header: 'Notes', render: (r) => <span className="block max-w-[18rem] truncate text-ink-secondary" title={r.notes}>{r.notes || r.inactiveReason || '—'}</span> },
  ];

  return (
    <div className="space-y-6">
      {!current && (
        <Callout tone="warning" title="No active hourly rate today" action={<Button size="sm" variant="secondary" to={manageTo}>Add rate</Button>}>
          Work recorded on dates without a valid rate is flagged for review and cannot be invoiced until a rate exists.
        </Callout>
      )}
      <Card>
        <CardHeader
          title="Hourly rate history"
          icon={Coins}
          description="Each work date is billed at the rate in force on that date. Finalized invoices keep their own rates."
          action={
            <Button size="sm" icon={SlidersHorizontal} to={manageTo}>
              Add or schedule rate
            </Button>
          }
        />
        {(current || scheduled.length > 0) && (
          <CardBody className="grid grid-cols-1 gap-3 border-b border-line sm:grid-cols-2">
            <div className={clsx('rounded-lg border px-4 py-3', current ? 'border-brand-200 bg-brand-50' : 'border-line bg-subtle')}>
              <p className="text-xs font-medium text-ink-muted">Current rate</p>
              <p className="tabular mt-1 text-xl font-semibold text-ink">
                {current ? <MoneyDisplay amount={current.amount} currency={current.currency} /> : '—'}
                {current && <span className="text-sm font-normal text-ink-muted"> /h</span>}
              </p>
              {current && <p className="text-xs text-ink-muted">since {formatDate(current.effectiveFrom)}{current.effectiveTo ? ` until ${formatDate(current.effectiveTo)}` : ''}</p>}
            </div>
            {scheduled[scheduled.length - 1] && (
              <div className="rounded-lg border border-info/25 bg-info-soft px-4 py-3">
                <p className="text-xs font-medium text-info-ink">Next scheduled change</p>
                <p className="tabular mt-1 text-xl font-semibold text-ink">
                  <MoneyDisplay amount={scheduled[scheduled.length - 1].amount} currency={scheduled[scheduled.length - 1].currency} />
                  <span className="text-sm font-normal text-ink-muted"> /h</span>
                </p>
                <p className="text-xs text-ink-muted">from {formatDate(scheduled[scheduled.length - 1].effectiveFrom)}</p>
              </div>
            )}
          </CardBody>
        )}
        <DataTable
          columns={columns}
          rows={rates}
          dense
          paginate={false}
          caption="Hourly rate history"
          rowClassName={(r) => (current?.id === r.id ? 'bg-brand-50/40' : undefined)}
          emptyState={<EmptyState compact icon={Coins} title="No rates yet" description="Add a rate before invoicing this customer." />}
        />
      </Card>

      <Card>
        <CardHeader
          title="Tax & payment terms"
          description="Defaults applied to new invoices for this customer."
          action={
            onEdit && (
              <Button variant="secondary" size="sm" icon={Pencil} onClick={onEdit}>
                Edit
              </Button>
            )
          }
        />
        <CardBody>
          <DescriptionList
            columns={3}
            items={[
              { label: 'Currency', value: customer.currency },
              { label: 'Payment terms', value: `${customer.paymentTerms} days` },
              { label: 'Tax rate', value: taxRateLabel(customer, invoiceSettings.defaultTaxRate) },
              { label: 'Tax / VAT ID', value: customer.taxId },
              { label: 'Billing country', value: customer.billingAddress?.country },
            ]}
          />
        </CardBody>
      </Card>
    </div>
  );
}
