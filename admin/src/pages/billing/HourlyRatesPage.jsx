import { useMemo, useState } from 'react';
import { CalendarPlus, Clock3 } from 'lucide-react';
import { useBilling } from '../../hooks/useBilling';
import { useCustomers } from '../../hooks/useCustomers';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { useQueryState } from '../../hooks/useQueryState';
import { RATE_STATUS } from '../../utils/calculations';
import { formatMoney, formatMoneyPlain } from '../../utils/currency';
import { formatDate } from '../../utils/dateUtils';
import { formatHours, pluralize } from '../../utils/formatters';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { FilterBar } from '../../components/common/FilterBar';
import { SelectField } from '../../components/common/SelectField';
import { Checkbox } from '../../components/common/FormField';
import { Button } from '../../components/common/Button';
import { ExportButton } from '../../components/common/ExportButton';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Callout } from '../../components/common/Callout';
import { statusOptions } from '../../components/common/StatusBadge';
import { RateHistoryTable } from '../../components/billing/RateHistoryTable';
import { HourlyRateForm } from '../../components/billing/HourlyRateForm';

const HISTORY_STATUSES = [RATE_STATUS.EXPIRED, RATE_STATUS.INACTIVE];

export default function HourlyRatesPage() {
  const { listRates, getBillingRows, deactivateRate } = useBilling();
  const { customers, customersById } = useCustomers();
  const [run] = useAsyncAction();
  const [filters, setFilter, resetFilters, isFiltered] = useQueryState({ customer: '', status: '', history: '' });
  const [form, setForm] = useState(null); // { rate } | { customerId }
  const [deactivating, setDeactivating] = useState(null);

  const allRates = useMemo(() => listRates(), [listRates]);
  const showHistory = filters.history === '1';

  const rates = useMemo(
    () =>
      allRates.filter(
        (r) =>
          (!filters.customer || r.customerId === filters.customer) &&
          (filters.status ? r.displayStatus === filters.status : showHistory || !HISTORY_STATUSES.includes(r.displayStatus)),
      ),
    [allRates, filters.customer, filters.status, showHistory],
  );
  const hiddenHistory = useMemo(
    () => (filters.status || showHistory ? 0 : allRates.filter((r) => (!filters.customer || r.customerId === filters.customer) && HISTORY_STATUSES.includes(r.displayStatus)).length),
    [allRates, filters.customer, filters.status, showHistory],
  );

  const customersWithoutRate = useMemo(
    () => customers.filter((c) => c.status === 'active' && !allRates.some((r) => r.customerId === c.id && r.displayStatus === RATE_STATUS.ACTIVE)),
    [customers, allRates],
  );

  // Unbilled, closed hours currently priced by the rate being deactivated.
  const deactivationImpact = useMemo(() => {
    if (!deactivating) return null;
    const rows = getBillingRows({
      customerId: deactivating.customerId,
      currency: deactivating.currency,
      from: deactivating.effectiveFrom,
      to: deactivating.effectiveTo ?? '',
    }).filter((row) => row.rate?.id === deactivating.id && !row.record.invoiceId && row.record.checkOutAt);
    return { records: rows.length, minutes: rows.reduce((s, row) => s + row.billableMinutes, 0) };
  }, [deactivating, getBillingRows]);

  const customerOptions = customers.map((c) => ({ value: c.id, label: c.companyName }));

  const exportColumns = [
    { header: 'Customer', value: (r) => customersById[r.customerId]?.companyName ?? '' },
    { header: 'Hourly rate', value: (r) => formatMoneyPlain(r.amount, r.currency) },
    { header: 'Currency', value: (r) => r.currency },
    { header: 'Effective from', value: (r) => r.effectiveFrom },
    { header: 'Effective to', value: (r) => r.effectiveTo ?? 'Open-ended' },
    { header: 'Status', value: (r) => r.displayStatus },
    { header: 'Notes', value: (r) => r.notes ?? '' },
    { header: 'Last updated', value: (r) => r.updatedAt ?? '' },
  ];

  return (
    <>
      <PageHeader
        title="Hourly rates"
        description="Each customer has a dated rate history. Hours are billed at the rate in force on the work date; finalized invoices keep the rate they were issued with."
        breadcrumbs={[{ label: 'Billing', to: '/billing' }, { label: 'Hourly rates' }]}
        actions={
          <>
            <Button variant="secondary" to="/billing/hours" icon={Clock3}>
              Billable hours
            </Button>
            <Button icon={CalendarPlus} onClick={() => setForm({ customerId: filters.customer })}>
              New / schedule rate
            </Button>
          </>
        }
      />

      {customersWithoutRate.length > 0 && (
        <Callout tone="warning" title={`${pluralize(customersWithoutRate.length, 'active customer')} without a current rate`} className="mb-4">
          Approved hours for {customersWithoutRate.map((c) => c.companyName).join(', ')} are flagged “No rate” and are not priced until a valid rate is set.
        </Callout>
      )}

      <Card>
        <FilterBar
          count={rates.length}
          noun="rate"
          isFiltered={isFiltered}
          onReset={resetFilters}
          actions={<ExportButton rows={rates} columns={exportColumns} filename="hourly-rates" />}
        >
          <SelectField
            aria-label="Filter by customer"
            size="sm"
            className="w-full sm:w-60"
            value={filters.customer}
            onChange={(e) => setFilter('customer', e.target.value)}
            placeholder="All customers"
            options={customerOptions}
          />
          <SelectField
            aria-label="Filter by status"
            size="sm"
            className="w-full sm:w-44"
            value={filters.status}
            onChange={(e) => setFilter('status', e.target.value)}
            placeholder="All statuses"
            options={statusOptions('rate')}
          />
          <Checkbox
            label="Show history"
            checked={showHistory}
            disabled={Boolean(filters.status)}
            onChange={(e) => setFilter('history', e.target.checked ? '1' : '')}
            className="px-1"
          />
          {hiddenHistory > 0 && <span className="text-xs text-ink-muted">{pluralize(hiddenHistory, 'expired/inactive rate')} hidden</span>}
        </FilterBar>
        <RateHistoryTable
          rates={rates}
          customersById={customersById}
          onEdit={(rate) => setForm({ rate })}
          onDeactivate={setDeactivating}
          emptyAction={
            <Button size="sm" icon={CalendarPlus} onClick={() => setForm({ customerId: filters.customer })}>
              New rate
            </Button>
          }
        />
      </Card>

      {form && <HourlyRateForm open onClose={() => setForm(null)} rate={form.rate ?? null} defaultCustomerId={form.customerId ?? ''} />}

      <ConfirmDialog
        open={Boolean(deactivating)}
        onClose={() => setDeactivating(null)}
        title="Deactivate hourly rate?"
        confirmLabel="Deactivate rate"
        requireReason
        reasonLabel="Reason for deactivation"
        onConfirm={(reason) => run(() => deactivateRate(deactivating.id, reason), { success: 'Rate deactivated', rethrow: true })}
        message={
          deactivating && (
            <>
              <p>
                {formatMoney(deactivating.amount, deactivating.currency)}/h for <strong>{customersById[deactivating.customerId]?.companyName}</strong> (
                {formatDate(deactivating.effectiveFrom)} – {deactivating.effectiveTo ? formatDate(deactivating.effectiveTo) : 'open-ended'}) will no longer be applied.
              </p>
              <p className="mt-2">
                {deactivationImpact?.records
                  ? `${pluralize(deactivationImpact.records, 'unbilled record')} (${formatHours(deactivationImpact.minutes)} h) will then have no rate and be flagged for review — they are never billed at a guessed rate.`
                  : 'No unbilled hours currently use this rate.'}{' '}
                Finalized invoices are not changed; draft invoices using it are flagged for recalculation.
              </p>
            </>
          )
        }
      />
    </>
  );
}
