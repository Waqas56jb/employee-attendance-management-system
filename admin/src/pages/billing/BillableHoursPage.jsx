import { useMemo, useState } from 'react';
import { Building2, FilePlus2, SearchX, Tags } from 'lucide-react';
import { useBilling } from '../../hooks/useBilling';
import { useBusiness } from '../../hooks/useBusiness';
import { useCustomers } from '../../hooks/useCustomers';
import { useProjects } from '../../hooks/useProjects';
import { useEmployees } from '../../hooks/useEmployees';
import { useAttendance } from '../../hooks/useAttendance';
import { useLookups } from '../../hooks/useLookups';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { useQueryState } from '../../hooks/useQueryState';
import { summarizeBillingRows } from '../../utils/calculations';
import { formatMoney, formatMoneyPlain } from '../../utils/currency';
import { formatDate, formatPeriod, formatTime, getPresetRange } from '../../utils/dateUtils';
import { formatHours, pluralize } from '../../utils/formatters';
import { invoiceLabel } from '../../services/invoiceService';
import { PageHeader } from '../../components/common/PageHeader';
import { Card, CardBody } from '../../components/common/Card';
import { FilterBar } from '../../components/common/FilterBar';
import { SelectField } from '../../components/common/SelectField';
import { Button } from '../../components/common/Button';
import { ExportButton } from '../../components/common/ExportButton';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Callout } from '../../components/common/Callout';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import { getStatusMeta } from '../../components/common/StatusBadge';
import { BillingPeriodSelector } from '../../components/billing/BillingPeriodSelector';
import { BillableHoursTable } from '../../components/billing/BillableHoursTable';
import { BillingAdjustmentForm } from '../../components/billing/BillingAdjustmentForm';
import { AdjustmentHistory } from '../../components/billing/AdjustmentHistory';
import { BILLING_VIEW_OPTIONS, rowStatus, toQuery } from '../../components/billing/billingHelpers';

function SummaryItem({ label, value, hint }) {
  return (
    <div className="min-w-0">
      <dt className="text-2xs font-medium uppercase tracking-wide text-ink-muted">{label}</dt>
      <dd className="tabular mt-0.5 truncate text-lg font-semibold text-ink">{value}</dd>
      {hint && <dd className="truncate text-xs text-ink-muted">{hint}</dd>}
    </div>
  );
}

export default function BillableHoursPage() {
  const { workingHours } = useBusiness();
  const { getBillingRows } = useBilling();
  const { customers, customersById } = useCustomers();
  const { projects } = useProjects();
  const { employees } = useEmployees();
  const { attendance, excludeFromBilling, includeInBilling } = useAttendance();
  const lookups = useLookups();
  const [run] = useAsyncAction();

  const defaultRange = getPresetRange(workingHours.defaultBillingPeriod || 'last_month');
  const [filters, setFilter, resetFilters, isFiltered] = useQueryState({
    customer: '',
    from: defaultRange.from,
    to: defaultRange.to,
    project: '',
    employee: '',
    currency: '',
    show: 'all',
  });

  const [adjusting, setAdjusting] = useState(null);
  const [excluding, setExcluding] = useState(null);
  const [including, setIncluding] = useState(null);
  const [history, setHistory] = useState(null);

  const customer = customersById[filters.customer];
  const currency = filters.currency || customer?.currency || 'EUR';

  const relevantEmployees = useMemo(() => {
    if (!filters.customer) return employees;
    const ids = new Set(attendance.filter((a) => a.customerId === filters.customer).map((a) => a.employeeId));
    return employees.filter((e) => ids.has(e.id));
  }, [attendance, employees, filters.customer]);

  const allRows = useMemo(
    () =>
      customer
        ? getBillingRows({
            customerId: customer.id,
            from: filters.from,
            to: filters.to,
            projectId: filters.project,
            employeeId: filters.employee,
            currency,
          })
        : [],
    [customer, getBillingRows, filters.from, filters.to, filters.project, filters.employee, currency],
  );

  const rows = useMemo(() => {
    if (filters.show === 'billable') return allRows.filter((r) => r.eligible);
    if (filters.show === 'excluded') return allRows.filter((r) => !r.eligible);
    return allRows;
  }, [allRows, filters.show]);

  const summary = useMemo(() => summarizeBillingRows(allRows), [allRows]);
  const excludedBreakdown = useMemo(() => {
    const map = new Map();
    allRows
      .filter((r) => !r.eligible)
      .forEach((r) => {
        const key = rowStatus(r);
        const entry = map.get(key) ?? { key, count: 0, minutes: 0 };
        entry.count += 1;
        entry.minutes += r.recordedMinutes ?? 0;
        map.set(key, entry);
      });
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [allRows]);

  const nameOf = (row) => lookups.employeesById[row.record.employeeId]?.fullName ?? 'Unknown employee';
  const projectOf = (row) => lookups.projectsById[row.record.projectId]?.name ?? 'Project';

  const exportColumns = [
    { header: 'Date', value: (r) => r.workDate },
    { header: 'Employee', value: nameOf },
    { header: 'Customer', value: (r) => customersById[r.record.customerId]?.companyName ?? '' },
    { header: 'Project', value: projectOf },
    { header: 'Check-in', value: (r) => formatTime(r.record.checkInAt) },
    { header: 'Check-out', value: (r) => (r.record.checkOutAt ? formatTime(r.record.checkOutAt) : '') },
    { header: 'Recorded hours', value: (r) => formatHours(r.recordedMinutes) },
    { header: 'Billable hours', value: (r) => formatHours(r.billableMinutes) },
    { header: 'Adjusted', value: (r) => (r.isAdjusted ? 'yes' : 'no') },
    { header: 'Hourly rate', value: (r) => (r.rate ? formatMoneyPlain(r.rate.amount, r.rate.currency) : 'No rate') },
    { header: 'Currency', value: () => currency },
    { header: 'Line total', value: (r) => (r.rate ? formatMoneyPlain(r.amount, currency) : '') },
    { header: 'Review status', value: (r) => getStatusMeta('billing', rowStatus(r)).label },
    { header: 'Reason', value: (r) => r.reason ?? '' },
    { header: 'Invoice', value: (r) => (r.record.invoiceId ? invoiceLabel(lookups.invoicesById[r.record.invoiceId]) : '') },
  ];

  const invoiceLink = `/invoices/new${toQuery({ customer: filters.customer, from: filters.from, to: filters.to, project: filters.project })}`;
  const showOptions = BILLING_VIEW_OPTIONS.map((o) => ({
    ...o,
    label: `${o.label} (${o.value === 'all' ? allRows.length : o.value === 'billable' ? summary.eligibleRecords : summary.excludedRecords})`,
  }));

  return (
    <>
      <PageHeader
        title="Billable hours"
        description="Review approved attendance before invoicing. Only completed, approved records with a valid rate count toward the billable total; everything else is shown with the reason it is held back."
        breadcrumbs={[{ label: 'Billing', to: '/billing' }, { label: 'Billable hours' }]}
        actions={
          <>
            <Button variant="secondary" icon={Tags} to={`/billing/rates${toQuery({ customer: filters.customer })}`}>
              Hourly rates
            </Button>
            <Button icon={FilePlus2} to={invoiceLink} disabled={!customer || summary.eligibleRecords === 0} title={!customer ? 'Select a customer first' : undefined}>
              Create invoice from these hours
            </Button>
          </>
        }
      />

      <Card className="mb-4">
        <CardBody>
          <BillingPeriodSelector
            value={filters}
            onChange={(patch) => setFilter(patch)}
            customers={customers.filter((c) => c.status !== 'archived' || c.id === filters.customer)}
            projects={projects}
            employees={relevantEmployees}
            customerCurrency={customer?.currency}
          />
        </CardBody>
      </Card>

      {!customer ? (
        <Card>
          <EmptyState
            icon={Building2}
            title="Select a customer"
            description="Billable hours are reviewed per customer, because each customer has its own hourly rates and invoice currency."
          />
        </Card>
      ) : (
        <>
          {currency !== customer.currency && (
            <Callout tone="warning" className="mb-4" title={`Invoice currency ${currency} differs from the customer's currency (${customer.currency})`}>
              Only rates in {currency} are applied. Records without a {currency} rate are flagged “No rate” and are never converted at a guessed exchange rate.
            </Callout>
          )}

          <Card className="mb-4">
            <CardBody>
              <dl className="grid grid-cols-2 gap-4 lg:grid-cols-5">
                <SummaryItem label="Eligible records" value={summary.eligibleRecords} hint={`of ${pluralize(summary.totalRecords, 'record')}`} />
                <SummaryItem label="Recorded hours" value={formatHours(summary.recordedMinutes, { suffix: true })} hint="Eligible records" />
                <SummaryItem label="Billable hours" value={formatHours(summary.billableMinutes, { suffix: true })} hint="After adjustments" />
                <SummaryItem label="Subtotal (net)" value={formatMoney(summary.amount, currency)} hint="Before tax and discounts" />
                <SummaryItem label="Not billed here" value={formatHours(summary.excludedMinutes, { suffix: true })} hint={pluralize(summary.excludedRecords, 'record')} />
              </dl>
              {excludedBreakdown.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3 text-xs text-ink-secondary">
                  <span className="text-ink-muted">Held back:</span>
                  {excludedBreakdown.map((entry) => (
                    <span key={entry.key} className="rounded-full bg-subtle px-2 py-0.5 ring-1 ring-inset ring-line">
                      {getStatusMeta('billing', entry.key).label}: {entry.count} · {formatHours(entry.minutes)} h
                    </span>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <FilterBar
              count={rows.length}
              isFiltered={isFiltered}
              onReset={resetFilters}
              actions={<ExportButton rows={rows} columns={exportColumns} filename={`billable-hours-${customer.customerNumber ?? customer.id}`} />}
            >
              <SelectField
                aria-label="Show records"
                size="sm"
                className="w-full sm:w-52"
                value={filters.show}
                onChange={(e) => setFilter('show', e.target.value === 'all' ? '' : e.target.value)}
                options={showOptions}
              />
              <span className="text-xs text-ink-muted">
                {customer.companyName} · {formatPeriod(filters.from, filters.to)}
              </span>
            </FilterBar>
            <BillableHoursTable
              rows={rows}
              lookups={lookups}
              currency={currency}
              onAdjust={setAdjusting}
              onExclude={setExcluding}
              onInclude={setIncluding}
              onHistory={setHistory}
              emptyState={
                <EmptyState
                  icon={SearchX}
                  title="No attendance records in this selection"
                  description="Try another period, project or employee, or change the “Show” filter."
                />
              }
            />
          </Card>
        </>
      )}

      {adjusting && (
        <BillingAdjustmentForm
          open
          onClose={() => setAdjusting(null)}
          row={adjusting}
          currency={currency}
          employeeName={nameOf(adjusting)}
          projectName={projectOf(adjusting)}
        />
      )}

      <ConfirmDialog
        open={Boolean(excluding)}
        onClose={() => setExcluding(null)}
        tone="warning"
        title="Exclude from billing?"
        confirmLabel="Exclude record"
        requireReason
        reasonLabel="Reason for exclusion"
        reasonPlaceholder="e.g. Internal training, not billable to the customer"
        onConfirm={(reason) => run(() => excludeFromBilling(excluding.record.id, reason), { success: 'Record excluded from billing', rethrow: true })}
        message={
          excluding && (
            <p>
              {nameOf(excluding)} · {formatDate(excluding.workDate)} ({formatHours(excluding.recordedMinutes)} h) will not be invoiced. The attendance hours are kept and
              the record can be included again at any time.
            </p>
          )
        }
      />

      <ConfirmDialog
        open={Boolean(including)}
        onClose={() => setIncluding(null)}
        tone="warning"
        title="Include in billing again?"
        confirmLabel="Include record"
        requireReason
        reasonLabel="Reason"
        onConfirm={(reason) => run(() => includeInBilling(including.record.id, reason), { success: 'Record included in billing', rethrow: true })}
        message={
          including && (
            <p>
              {nameOf(including)} · {formatDate(including.workDate)} was excluded: “{including.record.billingExclusion?.reason}”. It becomes billable again if it is
              approved and has a valid rate.
            </p>
          )
        }
      />

      <Modal
        open={Boolean(history)}
        onClose={() => setHistory(null)}
        title="Billing adjustment history"
        description={history ? `${nameOf(history)} · ${projectOf(history)} · ${formatDate(history.workDate)}` : undefined}
        footer={
          <Button variant="secondary" onClick={() => setHistory(null)}>
            Close
          </Button>
        }
      >
        {history && <AdjustmentHistory record={history.record} />}
      </Modal>
    </>
  );
}
