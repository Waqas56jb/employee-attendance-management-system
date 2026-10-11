import { forwardRef } from 'react';
import { calculateInvoiceTotals, INVOICE_STATUS } from '../../utils/calculations';
import { formatMoney } from '../../utils/currency';
import { formatDate, formatPeriod } from '../../utils/dateUtils';
import { formatHoursValue, formatNumber, joinAddress } from '../../utils/formatters';
import { PAYMENT_METHODS } from '../../services/invoiceService';

function MetaRow({ label, value }) {
  return (
    <div className="flex justify-between gap-6 py-0.5">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-900">{value}</span>
    </div>
  );
}

function TotalRow({ label, value, strong = false }) {
  return (
    <div className={strong ? 'flex justify-between gap-6 border-t border-slate-200 pt-2 text-[15px] font-semibold text-slate-900' : 'flex justify-between gap-6 py-0.5'}>
      <span className={strong ? '' : 'text-slate-500'}>{label}</span>
      <span className="tabular text-right text-slate-900">{value}</span>
    </div>
  );
}

const pct = (value) => formatNumber(value, 2).replace(/\.00$/, '');

/**
 * Printable invoice document. Finalized invoices use the frozen customer
 * snapshot; drafts use the live customer record. On narrow screens the
 * document keeps its A4 proportions and scrolls inside its own container.
 */
export const InvoicePreview = forwardRef(function InvoicePreview({ invoice, customer, business, invoiceSettings, payments = [] }, ref) {
  const billTo = invoice.customerSnapshot ?? customer ?? {};
  const currency = invoice.currency;
  const money = (v) => formatMoney(v, currency);
  const totals = calculateInvoiceTotals({
    lineItems: invoice.lineItems ?? [],
    discountType: invoice.discountType,
    discountValue: invoice.discountValue,
    taxRate: invoice.taxRate,
    amountPaid: invoice.amountPaid ?? 0,
  });
  const isDraft = !invoice.finalizedAt;
  const isVoid = invoice.status === INVOICE_STATUS.VOID || Boolean(invoice.voidedAt);
  const address = business?.address ?? {};

  return (
    <div className="scrollbar-thin max-w-full overflow-x-auto rounded-xl bg-slate-100 p-2 sm:p-4">
      <article
        ref={ref}
        className="invoice-doc relative mx-auto min-w-[640px] max-w-[820px] rounded-lg border border-slate-200 bg-white p-10 text-[13px] leading-relaxed text-slate-800 shadow-sm"
        aria-label={isDraft ? 'Draft invoice preview' : `Invoice ${invoice.invoiceNumber}`}
      >
        {isVoid && (
          <div className="pointer-events-none absolute right-10 top-28 rotate-[-12deg] rounded-md border-4 border-red-600/70 px-4 py-1 text-3xl font-black tracking-widest text-red-600/70" aria-hidden>
            VOID
          </div>
        )}

        {/* Letterhead */}
        <header className="flex items-start justify-between gap-8 border-b border-slate-200 pb-6">
          <div className="flex min-w-0 items-start gap-4">
            {business?.logo ? (
              <img src={business.logo} alt={`${business.name} logo`} className="h-14 w-14 shrink-0 rounded-md object-contain" />
            ) : (
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-xl font-bold text-white" aria-hidden>
                {(business?.name ?? 'B').slice(0, 1)}
              </span>
            )}
            <div className="min-w-0">
              <p className="text-base font-semibold text-slate-900">{business?.name}</p>
              <p className="text-slate-500">{address.street}</p>
              <p className="text-slate-500">{[address.postalCode, address.city].filter(Boolean).join(' ')}{address.country ? `, ${address.country}` : ''}</p>
              <p className="text-slate-500">{[business?.email, business?.phone].filter(Boolean).join(' · ')}</p>
              {business?.website && <p className="text-slate-500">{business.website}</p>}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-2xl font-bold tracking-tight text-slate-900">{isDraft ? 'DRAFT INVOICE' : 'INVOICE'}</p>
            <p className="mt-1 font-medium text-slate-600">{invoice.invoiceNumber ?? 'Draft — number assigned on finalization'}</p>
            {business?.taxId && <p className="mt-2 text-xs text-slate-500">VAT ID {business.taxId}</p>}
            {business?.registrationNumber && <p className="text-xs text-slate-500">{business.registrationNumber}</p>}
          </div>
        </header>

        {/* Bill to + details */}
        <section className="grid grid-cols-2 gap-10 py-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Bill to</p>
            <p className="mt-1.5 font-semibold text-slate-900">{billTo.companyName ?? '—'}</p>
            {billTo.contactPerson && <p>Attn. {billTo.contactPerson}</p>}
            {billTo.billingAddress && (
              <>
                <p>{billTo.billingAddress.street}</p>
                <p>{[billTo.billingAddress.postalCode, billTo.billingAddress.city].filter(Boolean).join(' ')}</p>
                <p>{billTo.billingAddress.country}</p>
              </>
            )}
            {billTo.taxId && <p className="mt-1 text-slate-500">VAT ID: {billTo.taxId}</p>}
            {billTo.customerNumber && <p className="text-slate-500">Customer no.: {billTo.customerNumber}</p>}
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Details</p>
            <div className="mt-1.5">
              <MetaRow label="Invoice date" value={formatDate(invoice.issueDate)} />
              <MetaRow label="Due date" value={formatDate(invoice.dueDate)} />
              <MetaRow label="Billing period" value={formatPeriod(invoice.billingPeriodStart, invoice.billingPeriodEnd)} />
              <MetaRow label="Payment terms" value={`${invoice.paymentTerms ?? 0} days`} />
              <MetaRow label="Currency" value={currency} />
            </div>
          </div>
        </section>

        {/* Lines */}
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <th className="px-3 py-2">Description</th>
              <th className="w-20 px-3 py-2 text-right">Hours</th>
              <th className="w-28 px-3 py-2 text-right">Rate</th>
              <th className="w-32 px-3 py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {(invoice.lineItems ?? []).map((line) => (
              <tr key={line.id} className="border-b border-slate-100 align-top">
                <td className="px-3 py-2.5 text-slate-900">{line.description}</td>
                <td className="tabular px-3 py-2.5 text-right">{formatHoursValue(line.quantityHours, { suffix: false })}</td>
                <td className="tabular px-3 py-2.5 text-right">{line.hourlyRate ? money(line.hourlyRate) : '—'}</td>
                <td className="tabular px-3 py-2.5 text-right font-medium text-slate-900">{money(line.amount)}</td>
              </tr>
            ))}
            {(invoice.lineItems ?? []).length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-slate-400">
                  No invoice lines yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Totals */}
        <section className="mt-5 flex justify-end">
          <div className="w-80 space-y-0.5">
            <TotalRow label="Subtotal" value={money(totals.subtotal)} />
            {totals.discountAmount > 0 && (
              <TotalRow
                label={`Discount${invoice.discountType === 'percent' ? ` (${pct(invoice.discountValue)}%)` : ''}`}
                value={`−${money(totals.discountAmount)}`}
              />
            )}
            <TotalRow label="Net amount (excl. tax)" value={money(totals.taxableAmount)} />
            <TotalRow label={`${invoice.taxLabel || 'Tax'} ${pct(invoice.taxRate)}% on ${money(totals.taxableAmount)}`} value={money(totals.taxAmount)} />
            <div className="pt-2">
              <TotalRow label="Total (incl. tax)" value={money(totals.total)} strong />
            </div>
            <TotalRow label="Amount paid" value={money(totals.amountPaid)} />
            <div className="flex justify-between gap-6 rounded-md bg-slate-50 px-2 py-1.5 font-semibold text-slate-900">
              <span>Balance due</span>
              <span className="tabular">{money(totals.balanceDue)}</span>
            </div>
          </div>
        </section>

        {payments.length > 0 && (
          <section className="mt-6">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Payments received</p>
            <table className="mt-1.5 w-full text-[12px]">
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100">
                    <td className="py-1.5">{formatDate(p.paymentDate)}</td>
                    <td className="py-1.5">{PAYMENT_METHODS.find((m) => m.value === p.method)?.label ?? p.method}</td>
                    <td className="py-1.5 text-slate-500">{p.reference || '—'}</td>
                    <td className="tabular py-1.5 text-right">{money(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* Instructions, notes */}
        <section className="mt-8 grid gap-5">
          {invoiceSettings?.paymentInstructions && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Payment instructions</p>
              <p className="mt-1 whitespace-pre-line">{invoiceSettings.paymentInstructions}</p>
            </div>
          )}
          {invoice.notes && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Notes</p>
              <p className="mt-1 whitespace-pre-line">{invoice.notes}</p>
            </div>
          )}
        </section>

        <footer className="mt-10 border-t border-slate-200 pt-4 text-center text-[11px] text-slate-400">
          {invoiceSettings?.footer || [business?.name, joinAddress(business?.address)].filter(Boolean).join(' · ')}
        </footer>
      </article>
    </div>
  );
});
