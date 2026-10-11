import { Link } from 'react-router-dom';
import { Calculator } from 'lucide-react';
import clsx from 'clsx';
import { formatMoney } from '../../utils/currency';
import { formatDate } from '../../utils/dateUtils';
import { formatHoursValue, pluralize } from '../../utils/formatters';
import { invoiceLabel } from '../../services/invoiceService';

/**
 * "Effect preview" for a proposed hourly rate, fed by previewRateImpact().
 * Shows what changes for unbilled approved work and what stays frozen.
 */
export function RateImpactPreview({ impact, currency, effectiveFrom }) {
  if (!impact) {
    return (
      <div className="rounded-lg border border-dashed border-line bg-subtle px-4 py-3 text-sm text-ink-muted">
        Select a customer, enter an hourly rate and a start date to preview the effect on unbilled hours.
      </div>
    );
  }
  const diffTone = impact.difference > 0 ? 'text-success-ink' : impact.difference < 0 ? 'text-danger-ink' : 'text-ink';
  return (
    <section aria-label="Effect preview" className="rounded-lg border border-line bg-subtle">
      <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
        <Calculator size={15} className="text-brand-700" aria-hidden />
        <h3 className="text-sm font-semibold text-ink">Effect preview</h3>
        <span className="ml-auto text-2xs text-ink-muted">From {formatDate(effectiveFrom)}</span>
      </div>
      <dl className="grid grid-cols-1 gap-x-4 gap-y-3 px-4 py-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-2xs font-medium uppercase tracking-wide text-ink-muted">Current rate on that date</dt>
          <dd className="tabular mt-0.5 text-ink">
            {impact.currentRate ? `${formatMoney(impact.currentRate.amount, impact.currentRate.currency)}/h` : <span className="text-warning-ink">No rate</span>}
          </dd>
        </div>
        <div>
          <dt className="text-2xs font-medium uppercase tracking-wide text-ink-muted">Unbilled approved hours affected</dt>
          <dd className="tabular mt-0.5 text-ink">
            {formatHoursValue(impact.unbilledHours)} <span className="text-ink-muted">({pluralize(impact.unbilledRecords, 'record')})</span>
          </dd>
        </div>
        <div>
          <dt className="text-2xs font-medium uppercase tracking-wide text-ink-muted">Value at current rate</dt>
          <dd className="tabular mt-0.5 text-ink">{formatMoney(impact.currentAmount, currency)}</dd>
        </div>
        <div>
          <dt className="text-2xs font-medium uppercase tracking-wide text-ink-muted">Value at new rate</dt>
          <dd className="tabular mt-0.5 text-ink">
            {formatMoney(impact.newAmount, currency)}{' '}
            <span className={clsx('font-medium', diffTone)}>
              ({impact.difference > 0 ? '+' : ''}
              {formatMoney(impact.difference, currency)})
            </span>
          </dd>
        </div>
      </dl>
      <ul className="space-y-1 border-t border-line px-4 py-3 text-xs text-ink-secondary">
        <li>
          {impact.billedRecords > 0
            ? `${pluralize(impact.billedRecords, 'record')} in this period ${impact.billedRecords === 1 ? 'is' : 'are'} already on finalized invoices and stay unchanged — finalized invoices are never rewritten.`
            : 'No records in this period are on finalized invoices.'}
        </li>
        <li>
          {impact.draftInvoices.length > 0 ? (
            <>
              {pluralize(impact.draftInvoices.length, 'Draft invoice')} affected (will need recalculation):{' '}
              {impact.draftInvoices.map((inv, i) => (
                <span key={inv.id}>
                  {i > 0 && ', '}
                  <Link to={`/invoices/${inv.id}`} className="font-medium text-brand-700 hover:underline" target="_blank" rel="noreferrer">
                    {invoiceLabel(inv)}
                  </Link>
                </span>
              ))}
            </>
          ) : (
            'No draft invoices cover this period.'
          )}
        </li>
      </ul>
    </section>
  );
}
