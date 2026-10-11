import { useMemo } from 'react';
import { useBusiness } from '../../hooks/useBusiness';
import { useInvoices } from '../../hooks/useInvoices';
import { invoiceSettingsSchema } from '../../utils/validation';
import { SUPPORTED_CURRENCIES, formatMoney } from '../../utils/currency';
import { calculateInvoiceTotals, LINE_GROUPING } from '../../utils/calculations';
import { formatInvoiceNumber, highestUsedSequence } from '../../utils/invoiceNumber';
import { formatDate, todayKey } from '../../utils/dateUtils';
import { dueDateFor } from '../../services/invoiceService';
import { Checkbox, FormField, FormGrid, FormSection, Input, Textarea } from '../common/FormField';
import { SelectField } from '../common/SelectField';
import { Callout } from '../common/Callout';
import { InvoiceFooterPreview } from './InvoiceFooterPreview';
import { SettingsSaveBar } from './SettingsSaveBar';
import { useSettingsForm } from './useSettingsForm';

const CURRENCY_OPTIONS = SUPPORTED_CURRENCIES.map((c) => ({ value: c.code, label: `${c.code} — ${c.label}` }));
const DUE_DATE_RULES = [
  { value: 'issue_plus_terms', label: 'Issue date + payment terms' },
  { value: 'end_of_month_plus_terms', label: 'End of issue month + payment terms' },
];
const SAMPLE_NET = 100000; // 1,000.00 in minor units

function toForm(settings) {
  return {
    prefix: settings.prefix ?? 'INV',
    nextSequence: String(settings.nextSequence ?? 1),
    defaultPaymentTerms: String(settings.defaultPaymentTerms ?? 14),
    currency: settings.currency ?? 'EUR',
    defaultTaxRate: String(settings.defaultTaxRate ?? 0),
    pricesIncludeTax: Boolean(settings.pricesIncludeTax),
    dueDateRule: settings.dueDateRule ?? 'issue_plus_terms',
    paymentInstructions: settings.paymentInstructions ?? '',
    footer: settings.footer ?? '',
    defaultNotes: settings.defaultNotes ?? '',
    defaultGrouping: settings.defaultGrouping ?? 'employee_project',
  };
}

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

export function InvoiceSettingsForm() {
  const { invoiceSettings, updateInvoiceSettings } = useBusiness();
  const { invoices } = useInvoices();
  const defaults = useMemo(() => toForm(invoiceSettings), [invoiceSettings]);
  const { form, onSubmit, discard } = useSettingsForm({
    schema: invoiceSettingsSchema,
    defaults,
    save: updateInvoiceSettings,
    success: 'Invoice settings saved.',
  });
  const {
    register,
    watch,
    formState: { errors, isDirty, isSubmitting },
  } = form;
  const values = watch();

  const year = new Date().getFullYear();
  const prefix = (values.prefix || '').trim().toUpperCase() || 'INV';
  const sequence = Math.max(1, Math.floor(toNumber(values.nextSequence)) || 1);
  const exampleNumber = formatInvoiceNumber(prefix, year, sequence);
  const numbers = useMemo(() => invoices.map((i) => i.invoiceNumber), [invoices]);
  const highest = highestUsedSequence(prefix, numbers, year);

  const issueDate = todayKey();
  const terms = Math.max(0, Math.floor(toNumber(values.defaultPaymentTerms)));
  const exampleDueDate = dueDateFor(issueDate, terms, values.dueDateRule);

  const taxRate = Math.min(100, Math.max(0, toNumber(values.defaultTaxRate)));
  const sample = calculateInvoiceTotals({ lineItems: [{ amount: SAMPLE_NET }], taxRate });
  const currency = values.currency || 'EUR';

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <FormSection title="Numbering" description="Numbers are assigned when an invoice is finalized. Drafts use a temporary DRAFT label.">
        <FormGrid>
          <FormField label="Invoice number prefix" required error={errors.prefix?.message} hint="Letters and numbers only, stored in upper case.">
            <Input {...register('prefix')} maxLength={10} className="uppercase" />
          </FormField>
          <FormField
            label="Next sequence number"
            required
            error={errors.nextSequence?.message}
            hint={
              highest > 0
                ? `Highest number used for ${prefix} in ${year}: ${highest}. Values of ${highest} or lower are rejected to prevent duplicate invoice numbers.`
                : `No ${prefix} invoices have been finalized in ${year} yet.`
            }
          >
            <Input type="number" inputMode="numeric" min={1} step={1} {...register('nextSequence')} className="tabular" />
          </FormField>
        </FormGrid>
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-line bg-subtle px-4 py-3 text-sm">
          <span className="text-ink-muted">Next invoice number:</span>
          <span className="font-mono font-semibold text-ink tabular">{exampleNumber}</span>
          <span className="text-xs text-ink-muted">Format: PREFIX-YEAR-SEQUENCE. The counter restarts per year.</span>
        </div>
      </FormSection>

      <FormSection title="Payment terms & tax" description="Defaults for new invoices. Customers can override payment terms and tax rate.">
        <FormGrid>
          <FormField label="Default payment terms" required error={errors.defaultPaymentTerms?.message}>
            <Input type="number" inputMode="numeric" min={0} max={180} step={1} suffix="days" {...register('defaultPaymentTerms')} className="tabular" />
          </FormField>
          <FormField label="Due-date calculation" required error={errors.dueDateRule?.message}>
            <SelectField options={DUE_DATE_RULES} {...register('dueDateRule')} />
          </FormField>
          <p className="text-xs text-ink-muted sm:col-span-2">
            Example: an invoice issued today ({formatDate(issueDate)}) with {terms} {terms === 1 ? 'day' : 'days'} is due on{' '}
            <span className="font-semibold text-ink">{formatDate(exampleDueDate)}</span>.
          </p>

          <FormField label="Default currency" required error={errors.currency?.message} hint="Existing invoices keep their own currency.">
            <SelectField options={CURRENCY_OPTIONS} {...register('currency')} />
          </FormField>
          <FormField
            label="Default tax rate"
            required
            error={errors.defaultTaxRate?.message}
            hint="Used only when a customer has no tax rate of its own."
          >
            <Input type="number" inputMode="decimal" min={0} max={100} step="0.01" suffix="%" {...register('defaultTaxRate')} className="tabular" />
          </FormField>
        </FormGrid>
        <Callout tone="info" className="mt-4">
          Tax is not assumed to be identical for all customers. Each customer can set its own rate — for example 0 % for intra-EU reverse charge — which
          takes precedence over this default.
        </Callout>

        <div className="mt-5 border-t border-line pt-5">
          <Checkbox
            {...register('pricesIncludeTax')}
            label="Prices include tax (display preference)"
            description="Controls how prices are labelled. It does not change the calculation."
          />
          <Callout tone="warning" title="Totals are always calculated as net + tax" className="mt-3">
            Hourly rates and line amounts are treated as pre-tax (net) amounts; tax is added on top. Example at {taxRate} %:
          </Callout>
          <dl className="mt-3 grid max-w-sm grid-cols-[1fr_auto] gap-x-6 gap-y-1 text-sm tabular">
            <dt className="text-ink-muted">Net amount (pre-tax)</dt>
            <dd className="text-right">{formatMoney(sample.subtotal, currency)}</dd>
            <dt className="text-ink-muted">Tax {taxRate} %</dt>
            <dd className="text-right">{formatMoney(sample.taxAmount, currency)}</dd>
            <dt className="border-t border-line pt-1 font-semibold text-ink">Total (tax-inclusive)</dt>
            <dd className="border-t border-line pt-1 text-right font-semibold text-ink">{formatMoney(sample.total, currency)}</dd>
          </dl>
        </div>
      </FormSection>

      <FormSection title="Invoice lines" description="How approved attendance is grouped into lines when an invoice is generated.">
        <FormField label="Default line grouping" required error={errors.defaultGrouping?.message} hint="Can be changed per invoice. Lines with different rates are never merged.">
          <SelectField options={LINE_GROUPING} {...register('defaultGrouping')} className="sm:max-w-sm" />
        </FormField>
      </FormSection>

      <FormSection title="Texts" description="Printed on invoices and PDF exports.">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
          <div className="min-w-0 space-y-4">
            <FormField label="Payment instructions" optional error={errors.paymentInstructions?.message} hint="Bank details and payment reference.">
              <Textarea rows={3} maxLength={600} {...register('paymentInstructions')} />
            </FormField>
            <FormField label="Default notes" optional error={errors.defaultNotes?.message} hint="Prefilled on new invoices; editable per invoice.">
              <Textarea rows={3} maxLength={600} {...register('defaultNotes')} />
            </FormField>
            <FormField label="Invoice footer" optional error={errors.footer?.message} hint="Legal details shown at the bottom of every page.">
              <Textarea rows={2} maxLength={300} {...register('footer')} />
            </FormField>
          </div>
          <div className="min-w-0">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">Preview</p>
            <InvoiceFooterPreview values={values} />
          </div>
        </div>
      </FormSection>

      <SettingsSaveBar isDirty={isDirty} isSubmitting={isSubmitting} onDiscard={discard} />
    </form>
  );
}
