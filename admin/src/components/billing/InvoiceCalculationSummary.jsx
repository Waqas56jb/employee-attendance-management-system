import { useMemo } from 'react';
import clsx from 'clsx';
import { calculateInvoiceTotals } from '../../utils/calculations';
import { formatMoney } from '../../utils/currency';
import { formatHours, formatHoursValue, formatNumber } from '../../utils/formatters';

function Row({ label, value, hint, strong = false, muted = false, className }) {
  return (
    <div className={clsx('flex items-start justify-between gap-4 py-1.5', className)}>
      <dt className={clsx('min-w-0 text-sm', strong ? 'font-semibold text-ink' : 'text-ink-secondary')}>
        {label}
        {hint && <span className="block text-xs font-normal text-ink-muted">{hint}</span>}
      </dt>
      <dd className={clsx('tabular shrink-0 text-right text-sm', strong ? 'text-base font-semibold text-ink' : muted ? 'text-ink-muted' : 'text-ink')}>
        {value}
      </dd>
    </div>
  );
}

/**
 * Reusable totals breakdown for invoices and drafts.
 * discountValue is in minor units for "fixed" discounts, a percentage for "percent".
 * Line amounts are net; tax is calculated on the net amount after discount.
 */
export function InvoiceCalculationSummary({
  lineItems = [],
  discountType = 'none',
  discountValue = 0,
  discountReason,
  taxRate = 0,
  taxLabel = 'VAT',
  currency = 'EUR',
  amountPaid = 0,
  showHours = true,
  showPayments = false,
  className,
}) {
  const totals = useMemo(
    () => calculateInvoiceTotals({ lineItems, discountType, discountValue, taxRate: Number(taxRate) || 0, amountPaid }),
    [lineItems, discountType, discountValue, taxRate, amountPaid],
  );
  const money = (value) => formatMoney(value, currency);
  const hoursLines = lineItems.filter((l) => l.type === 'hours');
  const customLines = lineItems.filter((l) => l.type !== 'hours');
  const rates = [...new Set(hoursLines.map((l) => l.hourlyRate))].sort((a, b) => a - b);
  const taxPercent = Number(taxRate) || 0;

  return (
    <div className={className}>
      {showHours && (
        <dl className="mb-3 border-b border-line pb-3">
          <Row label="Total recorded hours" hint="Check-in to check-out, included records" value={formatHours(totals.recordedMinutes, { suffix: true })} />
          <Row label="Total billable hours" hint="Quantity on attendance lines" value={formatHoursValue(totals.billableHours)} />
          <Row
            label={rates.length > 1 ? 'Hourly rates' : 'Hourly rate'}
            value={rates.length ? rates.map((r) => `${money(r)}/h`).join(', ') : '—'}
          />
          {customLines.length > 0 && <Row label="Additional service lines" value={formatNumber(customLines.length)} />}
        </dl>
      )}
      <dl>
        <Row label="Subtotal" hint="Sum of line amounts, excl. tax" value={money(totals.subtotal)} />
        {discountType !== 'none' && totals.discountAmount > 0 && (
          <Row
            label={`Discount${discountType === 'percent' ? ` (${formatNumber(discountValue, 2).replace(/\.00$/, '')}%)` : ''}`}
            hint={discountReason || undefined}
            value={`−${money(totals.discountAmount)}`}
          />
        )}
        <Row label="Net amount (pre-tax)" value={money(totals.taxableAmount)} />
        <Row
          label={`${taxLabel || 'Tax'} ${formatNumber(taxPercent, 2).replace(/\.00$/, '')}%`}
          hint={`on net amount ${money(totals.taxableAmount)}`}
          value={money(totals.taxAmount)}
        />
        <Row label="Total (tax-inclusive)" value={money(totals.total)} strong className="mt-1 border-t border-line pt-3" />
        {showPayments && (
          <>
            <Row label="Amount paid" value={totals.amountPaid ? `−${money(totals.amountPaid)}` : money(0)} muted={!totals.amountPaid} />
            <Row label="Outstanding balance" value={money(totals.balanceDue)} strong />
          </>
        )}
      </dl>
      {taxPercent === 0 && (
        <p className="mt-2 text-xs text-ink-muted">No tax is charged on this invoice (e.g. intra-EU reverse charge — state the legal note in the invoice notes).</p>
      )}
    </div>
  );
}
