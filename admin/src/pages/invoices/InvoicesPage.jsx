import { useMemo, useState } from 'react';
import { FileText, Info, Plus } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Callout } from '../../components/common/Callout';
import { FilterBar } from '../../components/common/FilterBar';
import { SearchInput } from '../../components/common/SearchInput';
import { SelectField } from '../../components/common/SelectField';
import { DateRangePicker } from '../../components/common/DateRangePicker';
import { ExportButton } from '../../components/common/ExportButton';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import { statusOptions } from '../../components/common/StatusBadge';
import { InvoiceTable } from '../../components/invoices/InvoiceTable';
import { InvoicePreview } from '../../components/invoices/InvoicePreview';
import { InvoicePaymentDialog } from '../../components/invoices/InvoicePaymentDialog';
import { VoidInvoiceDialog } from '../../components/invoices/VoidInvoiceDialog';
import { displayStatus, invoiceCustomerName, isOutstanding, sumByCurrency } from '../../components/invoices/invoiceUtils';
import { useInvoices } from '../../hooks/useInvoices';
import { useCustomers } from '../../hooks/useCustomers';
import { useBusiness } from '../../hooks/useBusiness';
import { useQueryState } from '../../hooks/useQueryState';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { downloadInvoicePdf } from '../../services/exportService';
import { invoiceLabel } from '../../services/invoiceService';
import { ISSUED_INVOICE_STATUSES } from '../../utils/calculations';
import { formatMoneyPlain } from '../../utils/currency';
import { isInDateRange } from '../../utils/dateUtils';
import { formatNumber } from '../../utils/formatters';

const FILTER_DEFAULTS = { q: '', status: '', customer: '', from: '', to: '' };

const STATUS_FILTER_OPTIONS = [
  { value: 'outstanding', label: 'Outstanding (balance due)' },
  ...statusOptions('invoice'),
];

function TotalTile({ label, value, hint }) {
  return (
    <div className="min-w-0 bg-surface px-4 py-3">
      <p className="text-xs font-medium text-ink-muted">{label}</p>
      <p className="tabular mt-0.5 truncate text-lg font-semibold text-ink" title={value}>
        {value}
      </p>
      {hint && <p className="text-2xs text-ink-muted">{hint}</p>}
    </div>
  );
}

export default function InvoicesPage() {
  const { invoices, paymentsByInvoice } = useInvoices();
  const { customers, customersById } = useCustomers();
  const { business, invoiceSettings } = useBusiness();
  const [filters, setFilter, resetFilters, isFiltered] = useQueryState(FILTER_DEFAULTS);
  const [previewing, setPreviewing] = useState(null);
  const [paying, setPaying] = useState(null);
  const [voiding, setVoiding] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [run] = useAsyncAction();

  const filtered = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    return invoices.filter((inv) => {
      const status = displayStatus(inv);
      if (filters.status === 'outstanding' ? !isOutstanding(inv) : filters.status && status !== filters.status) return false;
      if (filters.customer && inv.customerId !== filters.customer) return false;
      if ((filters.from || filters.to) && !isInDateRange(inv.issueDate, filters.from, filters.to)) return false;
      if (q) {
        const haystack = `${invoiceLabel(inv)} ${invoiceCustomerName(inv, customersById)}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [invoices, filters, customersById]);

  const totals = useMemo(() => {
    const issued = filtered.filter((inv) => ISSUED_INVOICE_STATUSES.includes(displayStatus(inv)));
    return {
      count: filtered.length,
      issuedCount: issued.length,
      invoiced: sumByCurrency(issued, (inv) => inv.total, business.currency),
      paid: sumByCurrency(issued, (inv) => inv.amountPaid, business.currency),
      outstanding: sumByCurrency(issued.filter((inv) => inv.balanceDue > 0), (inv) => inv.balanceDue, business.currency),
    };
  }, [filtered, business.currency]);

  const customerOptions = useMemo(
    () => [...customers].sort((a, b) => a.companyName.localeCompare(b.companyName)).map((c) => ({ value: c.id, label: c.companyName })),
    [customers],
  );

  const download = async (inv) => {
    setDownloadingId(inv.id);
    await run(
      () =>
        downloadInvoicePdf(inv, {
          business,
          invoiceSettings,
          customer: customersById[inv.customerId],
          payments: paymentsByInvoice[inv.id] ?? [],
        }),
      { success: `${invoiceLabel(inv)}.pdf downloaded`, error: 'The PDF could not be generated.' },
    );
    setDownloadingId(null);
  };

  const exportColumns = [
    { header: 'Invoice', value: (inv) => invoiceLabel(inv) },
    { header: 'Customer', value: (inv) => invoiceCustomerName(inv, customersById) },
    { header: 'Issue date', value: (inv) => inv.issueDate },
    { header: 'Due date', value: (inv) => inv.dueDate },
    { header: 'Billing period start', value: (inv) => inv.billingPeriodStart },
    { header: 'Billing period end', value: (inv) => inv.billingPeriodEnd },
    { header: 'Currency', value: (inv) => inv.currency },
    { header: 'Subtotal', value: (inv) => formatMoneyPlain(inv.subtotal, inv.currency) },
    { header: 'Discount', value: (inv) => formatMoneyPlain(inv.discountAmount ?? 0, inv.currency) },
    { header: 'Tax', value: (inv) => formatMoneyPlain(inv.taxAmount, inv.currency) },
    { header: 'Total', value: (inv) => formatMoneyPlain(inv.total, inv.currency) },
    { header: 'Amount paid', value: (inv) => formatMoneyPlain(inv.amountPaid, inv.currency) },
    { header: 'Outstanding balance', value: (inv) => formatMoneyPlain(inv.voidedAt || !inv.finalizedAt ? 0 : inv.balanceDue, inv.currency) },
    { header: 'Status', value: (inv) => displayStatus(inv) },
  ];

  const previewInvoice = previewing ? invoices.find((i) => i.id === previewing) : null;
  const payingInvoice = paying ? invoices.find((i) => i.id === paying) : null;
  const voidingInvoice = voiding ? invoices.find((i) => i.id === voiding) : null;

  return (
    <>
      <PageHeader
        title="Invoices"
        description="Drafts, finalized invoices, payments and outstanding balances."
        breadcrumbs={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Invoices' }]}
        actions={
          <Button to="/invoices/new" icon={Plus}>
            Create invoice
          </Button>
        }
      />

      <div className="space-y-4">
        <Callout tone="info">
          Email delivery requires a backend and is not available in this demo. <span className="font-medium">Mark as sent</span> only records that you
          delivered the invoice outside the app (e.g. as a PDF attachment).
        </Callout>

        <Card className="grid grid-cols-2 gap-px overflow-hidden bg-line sm:grid-cols-4">
          <TotalTile label="Invoices in view" value={formatNumber(totals.count)} hint={`${formatNumber(totals.issuedCount)} issued, excl. drafts & void`} />
          <TotalTile label="Invoiced total (incl. tax)" value={totals.invoiced} hint="Issued invoices; drafts and void excluded" />
          <TotalTile label="Amount paid" value={totals.paid} hint="Payments recorded on issued invoices" />
          <TotalTile label="Outstanding balance" value={totals.outstanding} hint="Still to be collected" />
        </Card>

        <Card>
          <FilterBar
            count={filtered.length}
            noun="invoice"
            isFiltered={isFiltered}
            onReset={resetFilters}
            actions={<ExportButton rows={filtered} columns={exportColumns} filename="invoices" />}
          >
            <SearchInput value={filters.q} onChange={(v) => setFilter('q', v)} placeholder="Invoice no. or customer…" label="Search invoices" className="w-full sm:w-60" />
            <SelectField
              aria-label="Filter by status"
              size="sm"
              placeholder="All statuses"
              options={STATUS_FILTER_OPTIONS}
              value={filters.status}
              onChange={(e) => setFilter('status', e.target.value)}
              className="w-full sm:w-52"
            />
            <SelectField
              aria-label="Filter by customer"
              size="sm"
              placeholder="All customers"
              options={customerOptions}
              value={filters.customer}
              onChange={(e) => setFilter('customer', e.target.value)}
              className="w-full sm:w-52"
            />
            <DateRangePicker label="Issue date" compact value={{ from: filters.from, to: filters.to }} onChange={(r) => setFilter({ from: r.from, to: r.to })} />
          </FilterBar>
          <InvoiceTable
            invoices={filtered}
            customersById={customersById}
            downloadingId={downloadingId}
            onPreview={(inv) => setPreviewing(inv.id)}
            onDownload={download}
            onRecordPayment={(inv) => setPaying(inv.id)}
            onVoid={(inv) => setVoiding(inv.id)}
            emptyState={
              invoices.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="No invoices yet"
                  description="Create your first invoice from approved attendance."
                  action={
                    <Button to="/invoices/new" icon={Plus}>
                      Create invoice
                    </Button>
                  }
                />
              ) : (
                <EmptyState
                  icon={Info}
                  title="No invoices match these filters"
                  description="Try another status, customer or date range."
                  action={
                    <Button variant="secondary" onClick={resetFilters}>
                      Reset filters
                    </Button>
                  }
                />
              )
            }
          />
        </Card>
      </div>

      <Modal
        open={Boolean(previewInvoice)}
        onClose={() => setPreviewing(null)}
        size="xl"
        title={previewInvoice ? `Preview — ${invoiceLabel(previewInvoice)}` : 'Preview'}
        footer={
          previewInvoice && (
            <>
              <Button variant="secondary" onClick={() => setPreviewing(null)}>
                Close
              </Button>
              <Button variant="secondary" to={`/invoices/${previewInvoice.id}`}>
                Open details
              </Button>
              <Button loading={downloadingId === previewInvoice.id} onClick={() => download(previewInvoice)}>
                Download PDF
              </Button>
            </>
          )
        }
      >
        {previewInvoice && (
          <InvoicePreview
            invoice={previewInvoice}
            customer={customersById[previewInvoice.customerId]}
            business={business}
            invoiceSettings={invoiceSettings}
            payments={paymentsByInvoice[previewInvoice.id] ?? []}
          />
        )}
      </Modal>

      <InvoicePaymentDialog open={Boolean(payingInvoice)} invoice={payingInvoice} onClose={() => setPaying(null)} />
      <VoidInvoiceDialog open={Boolean(voidingInvoice)} invoice={voidingInvoice} onClose={() => setVoiding(null)} />
    </>
  );
}
