import { FormField, FormGrid, Input, Textarea } from '../common/FormField';
import { SelectField } from '../common/SelectField';

const DISCOUNT_TYPES = [
  { value: 'none', label: 'No discount' },
  { value: 'percent', label: 'Percentage of subtotal' },
  { value: 'fixed', label: 'Fixed amount' },
];

/** Step 5 (lower half) — discount, tax, dates, payment terms and notes. */
export function InvoiceTermsFields({ values, onChange, errors = {}, currency, dueDateRule }) {
  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-3 text-sm font-semibold text-ink">Discount</h3>
        <FormGrid>
          <FormField label="Discount type">
            <SelectField
              options={DISCOUNT_TYPES}
              value={values.discountType}
              onChange={(e) => onChange({ discountType: e.target.value, ...(e.target.value === 'none' ? { discountValue: '', discountReason: '' } : {}) })}
            />
          </FormField>
          {values.discountType !== 'none' && (
            <FormField
              label={values.discountType === 'percent' ? 'Discount (%)' : 'Discount amount'}
              required
              error={errors.discountValue}
              hint={values.discountType === 'percent' ? 'Applied to the subtotal before tax.' : 'Net amount before tax; cannot exceed the subtotal.'}
            >
              <Input
                inputMode="decimal"
                value={values.discountValue}
                onChange={(e) => onChange({ discountValue: e.target.value })}
                suffix={values.discountType === 'percent' ? '%' : currency}
              />
            </FormField>
          )}
          {values.discountType !== 'none' && (
            <FormField label="Discount reason" required error={errors.discountReason} className="sm:col-span-2">
              <Input
                value={values.discountReason}
                maxLength={200}
                placeholder="E.g. Loyalty discount agreed in framework contract"
                onChange={(e) => onChange({ discountReason: e.target.value })}
              />
            </FormField>
          )}
        </FormGrid>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold text-ink">Tax</h3>
        <FormGrid>
          <FormField label="Tax rate" required error={errors.taxRate} hint="Use 0 % for reverse-charge or tax-exempt services.">
            <Input inputMode="decimal" value={values.taxRate} onChange={(e) => onChange({ taxRate: e.target.value })} suffix="%" />
          </FormField>
          <FormField label="Tax label" error={errors.taxLabel} hint='Shown on the invoice, e.g. "VAT" or "VAT (reverse charge)".'>
            <Input value={values.taxLabel} maxLength={40} onChange={(e) => onChange({ taxLabel: e.target.value })} />
          </FormField>
        </FormGrid>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold text-ink">Dates & payment terms</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FormField label="Issue date" required error={errors.issueDate}>
            <Input type="date" value={values.issueDate} onChange={(e) => onChange({ issueDate: e.target.value }, 'dates')} />
          </FormField>
          <FormField label="Payment terms (days)" required error={errors.paymentTerms}>
            <Input type="number" min={0} max={365} step={1} inputMode="numeric" value={values.paymentTerms} onChange={(e) => onChange({ paymentTerms: e.target.value }, 'dates')} />
          </FormField>
          <FormField
            label="Due date"
            required
            error={errors.dueDate}
            hint={dueDateRule === 'end_of_month_plus_terms' ? 'Calculated as end of month + terms; editable.' : 'Calculated as issue date + terms; editable.'}
          >
            <Input type="date" min={values.issueDate || undefined} value={values.dueDate} onChange={(e) => onChange({ dueDate: e.target.value })} />
          </FormField>
        </div>
      </section>

      <FormField label="Notes" optional error={errors.notes} hint="Printed on the invoice (e.g. PO number, reverse-charge statement).">
        <Textarea rows={3} maxLength={1000} value={values.notes} onChange={(e) => onChange({ notes: e.target.value })} />
      </FormField>
    </div>
  );
}
