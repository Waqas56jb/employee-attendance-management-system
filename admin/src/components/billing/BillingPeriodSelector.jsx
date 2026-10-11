import clsx from 'clsx';
import { getPresetRange, matchPreset } from '../../utils/dateUtils';
import { SUPPORTED_CURRENCIES } from '../../utils/currency';
import { FormField } from '../common/FormField';
import { SelectField } from '../common/SelectField';

export const BILLING_PERIOD_PRESETS = [
  { value: 'this_week', label: 'This week' },
  { value: 'last_week', label: 'Last week' },
  { value: 'this_month', label: 'This month' },
  { value: 'last_month', label: 'Last month' },
];

/**
 * Billing selection: customer, period (quick presets or custom dates),
 * optional project / employee and the invoice currency.
 *
 * value:    { customer, from, to, project, employee, currency }
 * onChange: (patch) => void
 * employees: the employees relevant to the selected customer (page decides)
 */
export function BillingPeriodSelector({ value, onChange, customers, projects, employees, customerCurrency }) {
  const preset = matchPreset({ from: value.from, to: value.to }, BILLING_PERIOD_PRESETS);
  const customerProjects = projects.filter((p) => p.customerId === value.customer);
  const employeeOptions = employees.map((e) => ({ value: e.id, label: e.fullName }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <FormField label="Customer" required className="xl:col-span-2">
          <SelectField
            value={value.customer}
            onChange={(e) => onChange({ customer: e.target.value, project: '', employee: '', currency: '' })}
            placeholder="Select a customer…"
            options={customers.map((c) => ({ value: c.id, label: c.companyName }))}
          />
        </FormField>
        <FormField label="Project" optional>
          <SelectField
            value={value.project}
            disabled={!value.customer}
            onChange={(e) => onChange({ project: e.target.value })}
            placeholder={value.customer ? 'All projects' : 'Select a customer first'}
            options={customerProjects.map((p) => ({ value: p.id, label: p.name }))}
          />
        </FormField>
        <FormField label="Employee" optional>
          <SelectField value={value.employee} onChange={(e) => onChange({ employee: e.target.value })} placeholder="All employees" options={employeeOptions} />
        </FormField>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
        <fieldset className="min-w-0">
          <legend className="label">Billing period</legend>
          <div className="flex flex-wrap gap-1.5" role="group">
            {BILLING_PERIOD_PRESETS.map((p) => (
              <button
                key={p.value}
                type="button"
                aria-pressed={preset === p.value}
                onClick={() => onChange(getPresetRange(p.value))}
                className={clsx(
                  'h-9 rounded-lg border px-3 text-sm font-medium transition-colors',
                  preset === p.value ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-line-strong bg-surface text-ink-secondary hover:bg-subtle',
                )}
              >
                {p.label}
              </button>
            ))}
            <span
              className={clsx(
                'flex h-9 items-center rounded-lg border px-3 text-sm font-medium',
                preset === 'custom' ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-dashed border-line text-ink-muted',
              )}
              aria-live="polite"
            >
              Custom
            </span>
          </div>
        </fieldset>
        <div className="flex flex-wrap items-end gap-3">
          <FormField label="From">
            <input
              type="date"
              className="input h-9 w-[10rem] py-1.5"
              value={value.from}
              max={value.to || undefined}
              onChange={(e) => onChange({ from: e.target.value })}
            />
          </FormField>
          <FormField label="To">
            <input
              type="date"
              className="input h-9 w-[10rem] py-1.5"
              value={value.to}
              min={value.from || undefined}
              onChange={(e) => onChange({ to: e.target.value })}
            />
          </FormField>
          <FormField label="Invoice currency">
            <SelectField
              size="sm"
              className="w-32"
              value={value.currency || customerCurrency || ''}
              disabled={!value.customer}
              onChange={(e) => onChange({ currency: e.target.value === customerCurrency ? '' : e.target.value })}
              options={SUPPORTED_CURRENCIES.map((c) => ({ value: c.code, label: c.code }))}
            />
          </FormField>
        </div>
      </div>
    </div>
  );
}
