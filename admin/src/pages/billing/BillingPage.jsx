import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, CalendarClock, CircleDollarSign, Clock3, FilePen, FilePlus2, ListChecks, Tags, Wallet } from 'lucide-react';
import { useDb } from '../../hooks/useStore';
import { useBusiness } from '../../hooks/useBusiness';
import { useBilling } from '../../hooks/useBilling';
import { useCustomers } from '../../hooks/useCustomers';
import { useInvoices } from '../../hooks/useInvoices';
import { useQueryState } from '../../hooks/useQueryState';
import { EXCLUSION_CODE, INVOICE_STATUS, RATE_STATUS } from '../../utils/calculations';
import { formatMoney } from '../../utils/currency';
import { formatDate, formatPeriod, getPresetRange } from '../../utils/dateUtils';
import { formatHours, pluralize } from '../../utils/formatters';
import { PageHeader } from '../../components/common/PageHeader';
import { Card, CardHeader } from '../../components/common/Card';
import { StatCard } from '../../components/common/StatCard';
import { DataTable } from '../../components/common/DataTable';
import { DateRangePicker } from '../../components/common/DateRangePicker';
import { Button } from '../../components/common/Button';
import { EmptyState } from '../../components/common/EmptyState';
import { addToTotals, formatTotals, getAllBillingRows, summarizeCustomers, toQuery } from '../../components/billing/billingHelpers';

const STEPS = [
  { icon: Tags, title: 'Set hourly rates', text: 'Each customer has a dated rate history. Work is priced at the rate in force on the work date.', to: '/billing/rates', cta: 'Manage rates' },
  { icon: ListChecks, title: 'Review approved hours', text: 'Check completed attendance, adjust billable time with a reason or exclude records — nothing is silently dropped.', to: '/billing/hours', cta: 'Review hours' },
  { icon: FilePlus2, title: 'Create the invoice', text: 'Eligible hours become invoice lines. Finalized invoices freeze their rates and hours.', to: '/invoices/new', cta: 'New invoice' },
];

function sumRows(rows) {
  const totals = {};
  let minutes = 0;
  rows.forEach((r) => {
    minutes += r.billableMinutes;
    addToTotals(totals, r.currency, r.amount);
  });
  return { minutes, totals, count: rows.length };
}

export default function BillingPage() {
  const db = useDb();
  const { business, workingHours } = useBusiness();
  const { listRates } = useBilling();
  const { customersById } = useCustomers();
  const { invoices } = useInvoices();

  const defaultRange = getPresetRange(workingHours.defaultBillingPeriod || 'last_month');
  const [period, setPeriod] = useQueryState({ from: defaultRange.from, to: defaultRange.to });

  const allRows = useMemo(() => getAllBillingRows(db), [db]);

  const kpis = useMemo(() => {
    const thisMonth = getPresetRange('this_month');
    const lastMonth = getPresetRange('last_month');
    const within = (r, range) => r.workDate >= range.from && r.workDate <= range.to;
    const eligible = allRows.filter((r) => r.eligible);
    return {
      thisMonth: sumRows(eligible.filter((r) => within(r, thisMonth))),
      lastMonth: sumRows(eligible.filter((r) => within(r, lastMonth))),
      thisMonthRange: thisMonth,
      lastMonthRange: lastMonth,
      review: allRows.filter((r) => r.code === EXCLUSION_CODE.NEEDS_REVIEW).length,
      noRate: allRows.filter((r) => r.code === EXCLUSION_CODE.NO_RATE),
      drafts: invoices.filter((inv) => inv.status === INVOICE_STATUS.DRAFT),
    };
  }, [allRows, invoices]);

  const customerRows = useMemo(
    () => summarizeCustomers(db, allRows, period).sort((a, b) => b.unbilledAmount - a.unbilledAmount || a.customer.companyName.localeCompare(b.customer.companyName)),
    [db, allRows, period],
  );

  const scheduled = useMemo(
    () => listRates().filter((r) => r.displayStatus === RATE_STATUS.SCHEDULED).sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom)),
    [listRates],
  );

  const noRateCustomers = new Set(kpis.noRate.map((r) => r.record.customerId)).size;
  const draftsNeedingRecalc = kpis.drafts.filter((d) => d.needsRecalculation).length;

  const columns = [
    {
      key: 'customer',
      header: 'Customer',
      primary: true,
      sortValue: (s) => s.customer.companyName,
      render: (s) => (
        <div className="min-w-0">
          <Link to={`/customers/${s.id}`} className="font-medium text-ink hover:text-brand-700 hover:underline">
            {s.customer.companyName}
          </Link>
          <p className="text-xs text-ink-muted">
            {s.customer.customerNumber} · {s.customer.currency}
            {s.reviewCount > 0 && <span className="text-warning-ink"> · {pluralize(s.reviewCount, 'record')} to review</span>}
            {s.noRateCount > 0 && <span className="text-danger-ink"> · {s.noRateCount} without rate</span>}
          </p>
        </div>
      ),
    },
    {
      key: 'rate',
      header: 'Current rate',
      align: 'right',
      sortValue: (s) => s.currentRate?.amount ?? -1,
      render: (s) =>
        s.currentRate ? (
          <span className="whitespace-nowrap">{formatMoney(s.currentRate.amount, s.currentRate.currency)}/h</span>
        ) : (
          <Link to={`/billing/rates?customer=${s.id}`} className="inline-flex items-center gap-1 whitespace-nowrap font-medium text-danger-ink hover:underline">
            <AlertTriangle size={13} aria-hidden />
            No rate
          </Link>
        ),
    },
    {
      key: 'hours',
      header: 'Unbilled approved h',
      align: 'right',
      sortValue: (s) => s.unbilledMinutes,
      render: (s) => <span className={s.unbilledMinutes ? 'font-medium text-ink' : 'text-ink-muted'}>{formatHours(s.unbilledMinutes)}</span>,
    },
    {
      key: 'amount',
      header: 'Unbilled value',
      align: 'right',
      sortValue: (s) => s.unbilledAmount,
      render: (s) => <span className={s.unbilledAmount ? 'font-medium text-ink' : 'text-ink-muted'}>{formatMoney(s.unbilledAmount, s.customer.currency)}</span>,
    },
    {
      key: 'lastInvoice',
      header: 'Last invoice',
      sortValue: (s) => s.lastInvoice?.issueDate ?? '',
      render: (s) =>
        s.lastInvoice ? (
          <Link to={`/invoices/${s.lastInvoice.id}`} className="whitespace-nowrap text-ink-secondary hover:text-brand-700 hover:underline">
            {formatDate(s.lastInvoice.issueDate)}
          </Link>
        ) : (
          <span className="text-ink-muted">Never</span>
        ),
    },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      align: 'right',
      render: (s) => {
        const query = toQuery({ customer: s.id, from: period.from, to: period.to });
        return (
          <div className="flex flex-wrap justify-end gap-1.5">
            <Button variant="secondary" size="xs" icon={ListChecks} to={`/billing/hours${query}`} aria-label={`Review hours for ${s.customer.companyName}`}>
              Review hours
            </Button>
            <Button
              size="xs"
              icon={FilePlus2}
              to={`/invoices/new${query}`}
              disabled={s.unbilledRecords === 0}
              title={s.unbilledRecords === 0 ? 'No eligible hours in this period' : undefined}
              aria-label={`Create invoice for ${s.customer.companyName}`}
            >
              Create invoice
            </Button>
          </div>
        );
      },
    },
  ];

  const kpiHint = (k) => `${formatHours(k.minutes)} h · ${pluralize(k.count, 'record')}`;

  return (
    <>
      <PageHeader
        title="Billing"
        description="Turn approved working hours into customer invoices. Hours are priced at each customer's rate in force on the work date — hours without a valid rate are flagged, never guessed."
        breadcrumbs={[{ label: 'Billing' }]}
        actions={
          <>
            <Button variant="secondary" icon={Tags} to="/billing/rates">
              Hourly rates
            </Button>
            <Button variant="secondary" icon={Clock3} to="/billing/hours">
              Billable hours
            </Button>
            <Button icon={FilePlus2} to="/invoices/new">
              New invoice
            </Button>
          </>
        }
      />

      <ol className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-3">
        {STEPS.map((step, i) => (
          <li key={step.title} className="card flex gap-3 p-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
              <step.icon size={16} aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-2xs font-semibold uppercase tracking-wide text-ink-muted">Step {i + 1}</p>
              <h2 className="text-sm font-semibold text-ink">{step.title}</h2>
              <p className="mt-0.5 text-xs text-ink-muted">{step.text}</p>
              <Link to={step.to} className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline">
                {step.cta}
                <ArrowRight size={12} aria-hidden />
              </Link>
            </div>
          </li>
        ))}
      </ol>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Ready to invoice · this month"
          value={formatTotals(kpis.thisMonth.totals, business.currency)}
          hint={kpiHint(kpis.thisMonth)}
          icon={CircleDollarSign}
          tone="success"
        />
        <StatCard
          label="Ready to invoice · last month"
          value={formatTotals(kpis.lastMonth.totals, business.currency)}
          hint={kpiHint(kpis.lastMonth)}
          icon={Wallet}
          tone="brand"
        />
        <StatCard
          label="Records needing review"
          value={kpis.review}
          hint="Held back until approved"
          icon={AlertTriangle}
          tone={kpis.review ? 'warning' : 'neutral'}
          to="/attendance?status=needs_review"
        />
        <StatCard
          label="Records without a valid rate"
          value={kpis.noRate.length}
          hint={kpis.noRate.length ? `${pluralize(noRateCustomers, 'customer')} affected` : 'Every approved record is priced'}
          icon={Tags}
          tone={kpis.noRate.length ? 'danger' : 'neutral'}
          to="/billing/rates"
        />
        <StatCard
          label="Draft invoices pending"
          value={kpis.drafts.length}
          hint={draftsNeedingRecalc ? `${draftsNeedingRecalc} need recalculation` : 'Not yet finalized'}
          icon={FilePen}
          tone={draftsNeedingRecalc ? 'warning' : 'info'}
          to="/invoices?status=draft"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="min-w-0 xl:col-span-2">
          <CardHeader
            title="Unbilled hours by customer"
            description={`Approved, eligible hours not yet on an invoice · ${formatPeriod(period.from, period.to)}`}
            action={<DateRangePicker value={{ from: period.from, to: period.to }} onChange={(range) => setPeriod(range)} allowAll={false} compact label="Billing period" />}
          />
          <DataTable
            columns={columns}
            rows={customerRows}
            pageSize={10}
            caption="Unbilled hours by customer"
            emptyState={<EmptyState title="No customers yet" description="Create a customer and an hourly rate to start billing." action={<Button to="/customers/new">New customer</Button>} />}
          />
        </Card>

        <Card className="min-w-0">
          <CardHeader
            title="Upcoming rate changes"
            description="Scheduled rates take effect automatically on their start date."
            icon={CalendarClock}
            action={
              <Button variant="ghost" size="sm" to="/billing/rates?status=scheduled">
                View all
              </Button>
            }
          />
          {scheduled.length === 0 ? (
            <EmptyState compact icon={CalendarClock} title="No scheduled changes" description="Schedule a new rate from the hourly-rates page." />
          ) : (
            <ul className="divide-y divide-line">
              {scheduled.slice(0, 8).map((r) => (
                <li key={r.id} className="flex items-start justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <Link to={`/billing/rates?customer=${r.customerId}`} className="block truncate text-sm font-medium text-ink hover:text-brand-700 hover:underline">
                      {customersById[r.customerId]?.companyName ?? 'Customer'}
                    </Link>
                    <p className="truncate text-xs text-ink-muted">{r.notes || 'Scheduled rate'}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="tabular text-sm font-semibold text-ink">{formatMoney(r.amount, r.currency)}/h</p>
                    <p className="text-xs text-ink-muted">from {formatDate(r.effectiveFrom)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
