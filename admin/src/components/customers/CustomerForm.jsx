import { useId } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { SlidersHorizontal } from 'lucide-react';
import { customerSchema } from '../../utils/validation';
import { SUPPORTED_CURRENCIES, getCurrencyMeta } from '../../utils/currency';
import { useBusiness } from '../../hooks/useBusiness';
import { FormField, FormGrid, FormSection, Input, Textarea } from '../common/FormField';
import { SelectField } from '../common/SelectField';
import { Button } from '../common/Button';
import { MoneyDisplay } from '../common/MoneyDisplay';
import { StatusBadge } from '../common/StatusBadge';
import { CUSTOMER_STATUS_OPTIONS } from './customerUtils';

/*
 * Empty tax rate must mean "use the invoice-settings default". The shared
 * schema coerces '' to 0 (reverse charge) because the number branch of its
 * union is tried first, so the literal '' is checked first here.
 */
const taxRateField = z
  .union([
    z.literal(''),
    z.coerce
      .number({ invalid_type_error: 'Tax rate must be a number.' })
      .min(0, 'Tax rate cannot be negative.')
      .max(100, 'Tax rate cannot exceed 100%.'),
  ])
  .optional();

const createSchema = customerSchema.extend({ taxRate: taxRateField });
// Rates have a history and are managed on the Hourly rates page once the customer exists.
const editSchema = createSchema.extend({ defaultHourlyRate: z.any().optional() });

const CURRENCY_OPTIONS = SUPPORTED_CURRENCIES.map((c) => ({ value: c.code, label: `${c.code} — ${c.label}` }));

function Section({ variant, title, description, children }) {
  if (variant === 'page') {
    return (
      <FormSection title={title} description={description}>
        {children}
      </FormSection>
    );
  }
  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        {description && <p className="mt-0.5 text-xs text-ink-muted">{description}</p>}
      </div>
      {children}
    </section>
  );
}

/**
 * Create / edit customer form.
 * Edit mode: the hourly rate is read-only (link to rate management), the
 * status is changed with the status actions, and the currency is locked once
 * invoices exist.
 */
export function CustomerForm({ mode = 'create', defaultValues, onSubmit, formId, variant = 'page', footer, customer, currentRate, currencyLocked = false }) {
  const { invoiceSettings } = useBusiness();
  const fallbackId = useId();
  const id = formId ?? fallbackId;
  const isEdit = mode === 'edit';

  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(isEdit ? editSchema : createSchema), defaultValues });

  const currency = watch('currency');
  const symbol = getCurrencyMeta(currency).code;

  const submit = async (values) => {
    try {
      await onSubmit(values);
    } catch (error) {
      if (error?.field) setError(error.field, { type: 'server', message: error.message }, { shouldFocus: true });
      else toast.error(error?.message ?? 'The customer could not be saved.');
    }
  };

  return (
    <form id={id} onSubmit={handleSubmit(submit)} noValidate className="space-y-6">
      <Section variant={variant} title="Company & contact" description="Who you work for and who receives invoices.">
        <FormGrid>
          <FormField label="Company name" required error={errors.companyName?.message}>
            <Input autoComplete="off" placeholder="e.g. Hartmann Logistik GmbH" data-autofocus {...register('companyName')} />
          </FormField>
          <FormField label="Customer reference ID" required error={errors.customerNumber?.message} hint="Must be unique. Shown on invoices.">
            <Input autoComplete="off" className="uppercase" {...register('customerNumber')} />
          </FormField>
          <FormField label="Contact person" required error={errors.contactPerson?.message}>
            <Input autoComplete="off" {...register('contactPerson')} />
          </FormField>
          <FormField label="Billing email" required error={errors.email?.message}>
            <Input type="email" autoComplete="off" placeholder="accounts@customer.com" {...register('email')} />
          </FormField>
          <FormField label="Phone" required error={errors.phone?.message}>
            <Input type="tel" autoComplete="off" {...register('phone')} />
          </FormField>
          {isEdit ? (
            <div>
              <p className="label">Status</p>
              <div className="flex min-h-10 items-center">
                <StatusBadge kind="customer" status={defaultValues.status} />
              </div>
              <p className="mt-1.5 text-xs text-ink-muted">Use the status actions on the customer page to change it.</p>
            </div>
          ) : (
            <FormField label="Status" required error={errors.status?.message}>
              <SelectField options={CUSTOMER_STATUS_OPTIONS} {...register('status')} />
            </FormField>
          )}
        </FormGrid>
      </Section>

      <Section variant={variant} title="Addresses" description="The billing address appears on invoices; the service address is where work happens.">
        <FormGrid>
          <FormField label="Billing address (street)" required error={errors.billingStreet?.message} className="sm:col-span-2">
            <Input autoComplete="off" placeholder="Street and number" {...register('billingStreet')} />
          </FormField>
          <FormField label="Postal code" required error={errors.postalCode?.message}>
            <Input autoComplete="off" {...register('postalCode')} />
          </FormField>
          <FormField label="City" required error={errors.city?.message}>
            <Input autoComplete="off" {...register('city')} />
          </FormField>
          <FormField label="Country" required error={errors.country?.message}>
            <Input autoComplete="off" placeholder="e.g. Germany" {...register('country')} />
          </FormField>
          <FormField label="Tax / VAT ID" optional error={errors.taxId?.message} hint="Required for reverse-charge invoices in the EU.">
            <Input autoComplete="off" {...register('taxId')} />
          </FormField>
          <FormField label="Service address" optional error={errors.serviceStreet?.message} className="sm:col-span-2" hint="Full address of the site, if different from billing.">
            <Input autoComplete="off" {...register('serviceStreet')} />
          </FormField>
        </FormGrid>
      </Section>

      <Section variant={variant} title="Billing" description="Defaults used when creating invoices for this customer.">
        <FormGrid>
          {currencyLocked ? (
            <div>
              <p className="label">Default currency</p>
              <Input value={defaultValues.currency} readOnly aria-label="Default currency" className="bg-subtle" />
              <p className="mt-1.5 text-xs text-ink-muted">The currency cannot be changed after invoices exist.</p>
            </div>
          ) : (
            <FormField label="Default currency" required error={errors.currency?.message} hint={isEdit ? 'Existing rates are converted to the new currency code (amounts are not exchanged).' : undefined}>
              <SelectField options={CURRENCY_OPTIONS} {...register('currency')} />
            </FormField>
          )}
          <FormField label="Payment terms" required error={errors.paymentTerms?.message} hint="Days until an invoice is due.">
            <Input type="number" inputMode="numeric" min={0} max={180} step={1} suffix="days" {...register('paymentTerms')} />
          </FormField>
          {isEdit ? (
            <div>
              <p className="label">Default hourly rate</p>
              <div className="flex min-h-10 flex-wrap items-center gap-3">
                {currentRate ? (
                  <span className="text-sm font-medium text-ink">
                    <MoneyDisplay amount={currentRate.amount} currency={currentRate.currency} />
                    <span className="text-ink-muted"> /h today</span>
                  </span>
                ) : (
                  <span className="text-sm font-medium text-warning-ink">No active rate today</span>
                )}
                <Button variant="secondary" size="xs" icon={SlidersHorizontal} to={`/billing/rates?customer=${customer?.id ?? ''}`}>
                  Manage rates
                </Button>
              </div>
              <p className="mt-1.5 text-xs text-ink-muted">Rates have a dated history so past work keeps the rate it was billed at.</p>
            </div>
          ) : (
            <FormField label="Default hourly billing rate" required error={errors.defaultHourlyRate?.message} hint="Creates the initial rate, effective today.">
              <Input type="number" inputMode="decimal" min={0} step="0.01" suffix={`${symbol}/h`} placeholder="0.00" {...register('defaultHourlyRate')} />
            </FormField>
          )}
          <FormField
            label="Tax rate override"
            optional
            error={errors.taxRate?.message}
            hint={`Leave empty to use the invoice default (${invoiceSettings.defaultTaxRate}%). Use 0 for reverse charge or exempt customers.`}
          >
            <Input type="number" inputMode="decimal" min={0} max={100} step="0.01" suffix="%" {...register('taxRate')} />
          </FormField>
          <FormField label="Notes" optional error={errors.notes?.message} className="sm:col-span-2">
            <Textarea rows={3} placeholder="PO numbers, cost centres, site rules…" {...register('notes')} />
          </FormField>
        </FormGrid>
      </Section>

      {typeof footer === 'function' ? footer({ isSubmitting }) : footer}
    </form>
  );
}
