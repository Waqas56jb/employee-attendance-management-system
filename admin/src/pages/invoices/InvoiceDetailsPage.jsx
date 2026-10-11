import { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { differenceInCalendarDays } from 'date-fns';
import { Ban, Banknote, Download, FileCheck2, FileSearch, Pencil, Printer, RefreshCw, Send, Trash2, Undo2, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '../../components/common/PageHeader';
import { Card, CardBody, CardHeader } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Callout } from '../../components/common/Callout';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { DescriptionList } from '../../components/common/DescriptionList';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/common/ErrorState';
import { Modal } from '../../components/common/Modal';
import { InvoiceCalculationSummary } from '../../components/billing/InvoiceCalculationSummary';
import { InvoiceStatusBadge } from '../../components/invoices/InvoiceStatusBadge';
import { InvoiceLineItems } from '../../components/invoices/InvoiceLineItems';
import { InvoicePreview } from '../../components/invoices/InvoicePreview';
import { InvoicePaymentDialog } from '../../components/invoices/InvoicePaymentDialog';
import { InvoicePaymentsTable } from '../../components/invoices/InvoicePaymentsTable';
import { InvoiceAuditTrail } from '../../components/invoices/InvoiceAuditTrail';
import { VoidInvoiceDialog } from '../../components/invoices/VoidInvoiceDialog';
import { canRecordPayment, canVoid, displayStatus, printElement, VOID_BLOCKED_REASON } from '../../components/invoices/invoiceUtils';
import { useInvoices } from '../../hooks/useInvoices';
import { useCustomers } from '../../hooks/useCustomers';
import { useProjects } from '../../hooks/useProjects';
import { useEmployees } from '../../hooks/useEmployees';
import { useBusiness } from '../../hooks/useBusiness';
import { useDb } from '../../hooks/useStore';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { downloadInvoicePdf } from '../../services/exportService';
import { invoiceLabel } from '../../services/invoiceService';
import { INVOICE_STATUS, LINE_GROUPING } from '../../utils/calculations';
import { formatMoney } from '../../utils/currency';
import { formatDate, formatDateTime, formatPeriod, toDate, todayKey } from '../../utils/dateUtils';
import { joinAddress, pluralize } from '../../utils/formatters';

export default function InvoiceDetailsPage() {
  const { invoiceId } = useParams();
  const navigate = useNavigate();
  const db = useDb();
  const { invoicesById, paymentsByInvoice, recalculateDraft, deleteDraft, finalizeInvoice, markInvoiceSent, releaseVoidedRecords } = useInvoices();
  const { customersById } = useCustomers();
  const { projectsById } = useProjects();
  const { employeesById } = useEmployees();
  const { business, invoiceSettings } = useBusiness();
  const [run, pending] = useAsyncAction();
  const [dialog, setDialog] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const deletedRef = useRef(false);
  const previewRef = useRef(null);

  const invoice = invoicesById[invoiceId];
  const breadcrumbs = [{ label: 'Dashboard', to: '/dashboard' }, { label: 'Invoices', to: '/invoices' }];

  if (!invoice) {
    if (deletedRef.current) return null;
    return (
      <>
        <PageHeader title="Invoice" breadcrumbs={[...breadcrumbs, { label: 'Not found' }]} />
        <ErrorState title="Invoice not found" message="This invoice does not exist or the draft was deleted." backTo="/invoices" backLabel="Back to invoices" />
      </>
    );
  }

  const label = invoiceLabel(invoice);
  const status = displayStatus(invoice);
  const isDraft = status === INVOICE_STATUS.DRAFT;
  const isVoid = status === INVOICE_STATUS.VOID;
  const liveCustomer = customersById[invoice.customerId];
  const customer = invoice.customerSnapshot ?? liveCustomer;
  const payments = paymentsByInvoice[invoice.id] ?? [];
  const linkedRecords = isVoid ? db.attendance.filter((a) => a.invoiceId === invoice.id).length : 0;
  const recordCount = invoice.lineItems.reduce((s, l) => s + (l.attendanceRecordIds?.length ?? 0), 0);
  const overdueDays = status === INVOICE_STATUS.OVERDUE || (invoice.balanceDue > 0 && !isDraft && !isVoid && invoice.dueDate < todayKey())
    ? differenceInCalendarDays(new Date(), toDate(invoice.dueDate))
    : 0;
  const voidable = canVoid(invoice);
  const voidBlocked = voidable && invoice.amountPaid > 0;
  const close = () => setDialog(null);

  const download = async () => {
    setDownloading(true);
    await run(() => downloadInvoicePdf(invoice, { business, invoiceSettings, customer: liveCustomer, payments }), {
      success: `${label}.pdf downloaded`,
      error: 'The PDF could not be generated.',
    });
    setDownloading(false);
  };

  const recalculate = () =>
    run(() => recalculateDraft(invoice.id), {
      success: (r) =>
        r.lostAdjustments
          ? `Draft recalculated — ${pluralize(r.lostAdjustments, 'manual line adjustment')} reset to attendance values.`
          : 'Draft recalculated from current attendance.',
    });

  const actions = (
    <>
      {isDraft && (
        <Button variant="secondary" icon={Pencil} to={`/invoices/new?draft=${invoice.id}`}>
          Edit draft
        </Button>
      )}
      <Button variant="secondary" icon={FileSearch} onClick={() => setDialog('preview')}>
        Preview
      </Button>
      <Button variant="secondary" icon={Download} onClick={download} loading={downloading}>
        Download PDF
      </Button>
      {!isDraft && !isVoid && !invoice.sentAt && (
        <Button variant="secondary" icon={Send} onClick={() => setDialog('sent')}>
          Mark as sent
        </Button>
      )}
      {canRecordPayment(invoice) && (
        <Button icon={Banknote} onClick={() => setDialog('payment')}>
          Record payment
        </Button>
      )}
      {isDraft && (
        <Button icon={FileCheck2} onClick={() => setDialog('finalize')} disabled={invoice.needsRecalculation} title={invoice.needsRecalculation ? 'Recalculate the draft first' : undefined}>
          Finalize
        </Button>
      )}
      {isDraft && (
        <Button variant="danger-ghost" icon={Trash2} onClick={() => setDialog('delete')}>
          Delete draft
        </Button>
      )}
      {voidable && (
        <Button variant="danger-ghost" icon={Ban} onClick={() => setDialog('void')} disabled={voidBlocked} title={voidBlocked ? VOID_BLOCKED_REASON : undefined}>
          Void
        </Button>
      )}
      {isVoid && !invoice.billingReleasedAt && linkedRecords > 0 && (
        <Button variant="secondary" icon={Undo2} onClick={() => setDialog('release')}>
          Release records
        </Button>
      )}
    </>
  );

  const customerItems = customer
    ? [
        {
          label: 'Company',
          value: liveCustomer ? (
            <Link to={`/customers/${invoice.customerId}`} className="font-medium text-brand-700 hover:underline">
              {customer.companyName}
            </Link>
          ) : (
            customer.companyName
          ),
        },
        { label: 'Customer no.', value: customer.customerNumber },
        { label: 'Contact', value: customer.contactPerson },
        { label: 'Email', value: customer.email },
        { label: 'Phone', value: customer.phone },
        { label: 'VAT ID', value: customer.taxId },
        { label: 'Billing address', value: joinAddress(customer.billingAddress), span: true },
      ]
    : [];

  const detailItems = [
    { label: 'Invoice number', value: invoice.invoiceNumber ?? 'Assigned on finalization' },
    { label: 'Status', value: <InvoiceStatusBadge invoice={invoice} /> },
    { label: 'Invoice date', value: formatDate(invoice.issueDate) },
    {
      label: 'Due date',
      value: (
        <span>
          {formatDate(invoice.dueDate)}
          {overdueDays > 0 && <span className="ml-1.5 text-xs font-medium text-danger-ink">{pluralize(overdueDays, 'day')} overdue</span>}
        </span>
      ),
    },
    { label: 'Billing period', value: formatPeriod(invoice.billingPeriodStart, invoice.billingPeriodEnd) },
    { label: 'Payment terms', value: `${invoice.paymentTerms} days` },
    { label: 'Currency', value: invoice.currency },
    { label: 'Line grouping', value: LINE_GROUPING.find((g) => g.value === invoice.grouping)?.label ?? '—' },
    { label: 'Project filter', value: invoice.projectId ? projectsById[invoice.projectId]?.name ?? '—' : 'All projects', hidden: !invoice.projectId },
    { label: 'Employee filter', value: employeesById[invoice.employeeId]?.fullName ?? '—', hidden: !invoice.employeeId },
    { label: 'Attendance records', value: pluralize(recordCount, 'record') },
    { label: 'Created', value: formatDateTime(invoice.createdAt) },
    { label: 'Finalized', value: invoice.finalizedAt ? `${formatDateTime(invoice.finalizedAt)}${invoice.finalizedBy ? ` · ${invoice.finalizedBy}` : ''}` : null, hidden: !invoice.finalizedAt },
    { label: 'Marked as sent', value: formatDateTime(invoice.sentAt), hidden: !invoice.sentAt },
    { label: 'Voided', value: formatDateTime(invoice.voidedAt), hidden: !invoice.voidedAt },
    { label: 'Voiding', value: <span className="text-ink-secondary">Not possible — {VOID_BLOCKED_REASON}</span>, hidden: !voidBlocked },
  ];

  return (
    <>
      <PageHeader
        title={label}
        documentTitle={`Invoice ${label}`}
        description={`${customer?.companyName ?? 'Unknown customer'} · ${formatPeriod(invoice.billingPeriodStart, invoice.billingPeriodEnd)}`}
        breadcrumbs={[...breadcrumbs, { label }]}
        meta={
          <>
            <InvoiceStatusBadge invoice={invoice} />
            <span className="tabular text-sm font-semibold text-ink">{formatMoney(invoice.total, invoice.currency)}</span>
            {!isDraft && !isVoid && invoice.balanceDue > 0 && (
              <span className="text-sm text-ink-muted">· {formatMoney(invoice.balanceDue, invoice.currency)} outstanding</span>
            )}
          </>
        }
        actions={actions}
      />

      <div className="space-y-4">
        {isDraft && invoice.needsRecalculation && (
          <Callout
            tone="warning"
            title="Attendance on this draft changed"
            action={
              <Button size="sm" variant="secondary" icon={RefreshCw} onClick={recalculate} loading={pending}>
                Recalculate
              </Button>
            }
          >
            Records on this draft were corrected, adjusted or excluded after it was saved. Recalculate to rebuild the attendance lines from current data before
            finalizing. Manual adjustments on attendance lines will be reset; additional service lines are kept.
          </Callout>
        )}
        {isDraft && !invoice.needsRecalculation && (
          <Callout tone="info">
            This is a draft. Its attendance records are reserved for it but not yet billed. Finalize it to assign an invoice number and freeze the totals.
          </Callout>
        )}
        {invoice.hasPostFinalizationChanges && !isDraft && (
          <Callout tone="warning" title="Attendance changed after finalization">
            One or more included attendance records were changed after this invoice was finalized. The invoice snapshot (lines, rates, totals) is unchanged. If the
            customer must be billed differently, void this invoice and issue a corrected one.
          </Callout>
        )}
        {!isDraft && !isVoid && !invoice.sentAt && (
          <Callout tone="demo">
            Email delivery requires a backend. Download the PDF and send it yourself, then use <span className="font-medium">Mark as sent</span> to record that it was
            delivered — no email is sent by this app.
          </Callout>
        )}
        {isVoid && (
          <Callout tone="danger" title="This invoice is void">
            <p>Reason: {invoice.voidReason || '—'}</p>
            {invoice.billingReleasedAt ? (
              <p className="mt-1">
                {pluralize(invoice.releasedAttendanceIds?.length ?? 0, 'attendance record')} released for re-billing on {formatDateTime(invoice.billingReleasedAt)}
                {invoice.billingReleaseReason ? ` — ${invoice.billingReleaseReason}` : ''}.
              </p>
            ) : linkedRecords > 0 ? (
              <p className="mt-1">
                {pluralize(linkedRecords, 'attendance record')} remain linked to this void invoice and cannot be billed again until you release them (controlled
                correction, recorded in the audit trail).
              </p>
            ) : null}
          </Callout>
        )}

        <div className="grid items-start gap-4 lg:grid-cols-3">
          <div className="min-w-0 space-y-4 lg:col-span-2">
            <Card>
              <CardHeader
                title="Line items"
                description={isDraft ? 'Edit the draft to change lines.' : 'Frozen at finalization — read-only.'}
                action={
                  isDraft && (
                    <Button size="sm" variant="secondary" icon={Pencil} to={`/invoices/new?draft=${invoice.id}`}>
                      Edit lines
                    </Button>
                  )
                }
              />
              <InvoiceLineItems lines={invoice.lineItems} currency={invoice.currency} emptyMessage="This invoice has no lines." />
            </Card>

            {!isDraft && (
              <Card>
                <CardHeader
                  title="Payment history"
                  description="Accounting records of payments received outside the app."
                  action={
                    canRecordPayment(invoice) && (
                      <Button size="sm" icon={Banknote} onClick={() => setDialog('payment')}>
                        Record payment
                      </Button>
                    )
                  }
                />
                <InvoicePaymentsTable
                  payments={payments}
                  currency={invoice.currency}
                  emptyState={<EmptyState compact icon={Wallet} title="No payments recorded" description={isVoid ? 'This invoice is void.' : 'Record a payment once money is received.'} />}
                />
              </Card>
            )}

            {invoice.notes && (
              <Card>
                <CardHeader title="Notes" description="Printed on the invoice." />
                <CardBody>
                  <p className="whitespace-pre-line text-sm text-ink-secondary">{invoice.notes}</p>
                </CardBody>
              </Card>
            )}

            <Card>
              <CardHeader title="Audit trail" description="Every change to this invoice." />
              <CardBody>
                <InvoiceAuditTrail entries={invoice.auditTrail} />
              </CardBody>
            </Card>
          </div>

          <div className="min-w-0 space-y-4">
            <Card>
              <CardHeader title="Totals" />
              <CardBody>
                <InvoiceCalculationSummary
                  lineItems={invoice.lineItems}
                  discountType={invoice.discountType}
                  discountValue={invoice.discountValue}
                  discountReason={invoice.discountReason}
                  taxRate={invoice.taxRate}
                  taxLabel={invoice.taxLabel}
                  currency={invoice.currency}
                  amountPaid={invoice.amountPaid ?? 0}
                  showPayments={!isDraft}
                />
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Customer" description={invoice.customerSnapshot ? 'Frozen at finalization.' : 'Live customer record (frozen on finalization).'} />
              <CardBody>
                {customer ? <DescriptionList columns={1} items={customerItems} /> : <p className="text-sm text-ink-muted">Customer record not found.</p>}
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Details" />
              <CardBody>
                <DescriptionList columns={1} items={detailItems} />
              </CardBody>
            </Card>
          </div>
        </div>
      </div>

      <Modal
        open={dialog === 'preview'}
        onClose={close}
        size="xl"
        title={`Preview — ${label}`}
        footer={
          <>
            <Button variant="secondary" onClick={close}>
              Close
            </Button>
            <Button
              variant="secondary"
              icon={Printer}
              onClick={() => {
                if (!printElement(previewRef.current, label)) toast.error('Allow pop-ups for this site to print the invoice.');
              }}
            >
              Print
            </Button>
            <Button icon={Download} onClick={download} loading={downloading}>
              Download PDF
            </Button>
          </>
        }
      >
        <InvoicePreview ref={previewRef} invoice={invoice} customer={liveCustomer} business={business} invoiceSettings={invoiceSettings} payments={payments} />
      </Modal>

      <ConfirmDialog
        open={dialog === 'finalize'}
        onClose={close}
        tone="primary"
        title={`Finalize ${label}?`}
        confirmLabel="Finalize invoice"
        onConfirm={async () => {
          const result = await run(() => finalizeInvoice(invoice.id), { success: (r) => `Invoice ${r.invoiceNumber} finalized`, rethrow: true });
          return result;
        }}
        message={
          <div className="space-y-2">
            <p>Finalizing ({formatMoney(invoice.total, invoice.currency)} incl. tax):</p>
            <ul className="list-disc space-y-1 pl-4">
              <li>assigns the next unique invoice number,</li>
              <li>freezes the customer details, lines, rates, quantities and totals,</li>
              <li>marks {pluralize(recordCount, 'attendance record')} as billed so they cannot be invoiced twice.</li>
            </ul>
            <p>Afterwards the invoice cannot be edited — only voided.</p>
          </div>
        }
      />

      <ConfirmDialog
        open={dialog === 'delete'}
        onClose={close}
        title={`Delete ${label}?`}
        confirmLabel="Delete draft"
        onConfirm={async () => {
          deletedRef.current = true;
          try {
            await run(() => deleteDraft(invoice.id), { success: 'Draft deleted', rethrow: true });
          } catch (error) {
            deletedRef.current = false;
            throw error;
          }
          navigate('/invoices', { replace: true });
        }}
        message={`The draft is removed permanently and its ${pluralize(recordCount, 'attendance record')} become available for other invoices. Nothing was issued, so no invoice number is lost.`}
      />

      <ConfirmDialog
        open={dialog === 'sent'}
        onClose={close}
        tone="primary"
        title={`Mark ${label} as sent?`}
        confirmLabel="Mark as sent"
        onConfirm={() => run(() => markInvoiceSent(invoice.id), { success: `${label} marked as sent`, rethrow: true })}
        message="This only records that you delivered the invoice outside the app (e.g. emailed the PDF yourself). No email is sent — email delivery requires a backend."
      />

      <ConfirmDialog
        open={dialog === 'release'}
        onClose={close}
        tone="primary"
        title="Release records for re-billing?"
        confirmLabel="Release records"
        requireReason
        reasonLabel="Reason for releasing"
        reasonPlaceholder="E.g. Records will be re-billed on the corrected invoice."
        onConfirm={(reason) =>
          run(() => releaseVoidedRecords(invoice.id, reason), {
            success: (r) => `${pluralize(r.released, 'attendance record')} released for re-billing`,
            rethrow: true,
          })
        }
        message={`${pluralize(linkedRecords, 'attendance record')} stay linked to this void invoice until released. Releasing makes them billable again so they can be included on a new invoice. This is recorded in the audit trail and cannot be undone.`}
      />

      <InvoicePaymentDialog open={dialog === 'payment'} onClose={close} invoice={invoice} />
      <VoidInvoiceDialog open={dialog === 'void'} onClose={close} invoice={invoice} />
    </>
  );
}
