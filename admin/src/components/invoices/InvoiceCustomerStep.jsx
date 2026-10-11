import { useMemo } from 'react';
import { Building2 } from 'lucide-react';
import { Callout } from '../common/Callout';
import { DescriptionList } from '../common/DescriptionList';
import { FormField } from '../common/FormField';
import { SelectField } from '../common/SelectField';
import { StatusBadge } from '../common/StatusBadge';
import { getCurrentRate } from '../../utils/calculations';
import { formatMoney } from '../../utils/currency';
import { joinAddress } from '../../utils/formatters';

/** Step 1 — customer selection with their billing details. */
export function InvoiceCustomerStep({ customers, hourlyRates, customerId, onChange, error, locked }) {
  const options = useMemo(
    () =>
      customers
        .filter((c) => c.status !== 'archived')
        .sort((a, b) => a.companyName.localeCompare(b.companyName))
        .map((c) => ({ value: c.id, label: `${c.companyName}${c.status === 'inactive' ? ' (inactive)' : ''}` })),
    [customers],
  );
  const customer = customers.find((c) => c.id === customerId);
  const rate = customer ? getCurrentRate(hourlyRates, customer.id, customer.currency) : null;

  return (
    <div className="space-y-5">
      <FormField
        label="Customer"
        required
        error={error}
        hint={locked ? 'The customer of an existing draft cannot be changed. Delete the draft and start a new one instead.' : 'Archived customers are hidden.'}
      >
        <SelectField placeholder="Select a customer…" options={options} value={customerId} onChange={(e) => onChange(e.target.value)} disabled={locked} />
      </FormField>

      {customer ? (
        <div className="rounded-lg border border-line bg-subtle/50 p-4">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Building2 size={16} className="text-ink-muted" aria-hidden />
            <p className="font-semibold text-ink">{customer.companyName}</p>
            <StatusBadge kind="customer" status={customer.status} />
            <span className="text-xs text-ink-muted">{customer.customerNumber}</span>
          </div>
          <DescriptionList
            columns={3}
            items={[
              { label: 'Contact', value: [customer.contactPerson, customer.email, customer.phone].filter(Boolean).join(' · ') },
              { label: 'Billing address', value: joinAddress(customer.billingAddress) },
              { label: 'VAT ID', value: customer.taxId },
              { label: 'Payment terms', value: `${customer.paymentTerms} days` },
              { label: 'Currency', value: customer.currency },
              { label: 'Tax rate', value: customer.taxRate === null || customer.taxRate === undefined ? 'Settings default' : `${customer.taxRate}%` },
              { label: 'Current hourly rate', value: rate ? `${formatMoney(rate.amount, rate.currency)} / h` : 'No active rate' },
            ]}
          />
          {customer.status === 'inactive' && (
            <Callout tone="warning" className="mt-4">
              This customer is inactive. You can still invoice past work.
            </Callout>
          )}
          {!rate && (
            <Callout tone="warning" className="mt-4">
              No hourly rate applies today. Hours without a valid rate for their work date are excluded from invoices.
            </Callout>
          )}
        </div>
      ) : (
        <p className="text-sm text-ink-muted">Choose who you are invoicing. Their billing details, currency and tax defaults are applied automatically.</p>
      )}
    </div>
  );
}
