import { useMemo } from 'react';
import clsx from 'clsx';
import { FormField, FormGrid, Input } from '../common/FormField';
import { SelectField } from '../common/SelectField';
import { LINE_GROUPING } from '../../utils/calculations';
import { formatPeriod, getPresetRange } from '../../utils/dateUtils';

const QUICK = [
  { value: 'this_week', label: 'This week' },
  { value: 'last_week', label: 'Last week' },
  { value: 'this_month', label: 'This month' },
  { value: 'last_month', label: 'Last month' },
];

/** Step 2 — billing period, optional project/employee filter and line grouping. */
export function InvoicePeriodStep({ values, onChange, projects, employees, attendance, errors = {} }) {
  const customerProjects = useMemo(
    () => projects.filter((p) => p.customerId === values.customerId).sort((a, b) => a.name.localeCompare(b.name)),
    [projects, values.customerId],
  );
  const employeeOptions = useMemo(() => {
    const ids = new Set();
    customerProjects.forEach((p) => (p.assignedEmployeeIds ?? []).forEach((id) => ids.add(id)));
    attendance.forEach((a) => a.customerId === values.customerId && ids.add(a.employeeId));
    return employees
      .filter((e) => ids.has(e.id))
      .sort((a, b) => a.fullName.localeCompare(b.fullName))
      .map((e) => ({ value: e.id, label: `${e.fullName}${e.status !== 'active' ? ` (${e.status})` : ''}` }));
  }, [customerProjects, attendance, employees, values.customerId]);

  return (
    <div className="space-y-5">
      <div>
        <p className="label">Quick select</p>
        <div className="flex flex-wrap gap-2">
          {QUICK.map((preset) => {
            const range = getPresetRange(preset.value);
            const active = range.from === values.billingPeriodStart && range.to === values.billingPeriodEnd;
            return (
              <button
                key={preset.value}
                type="button"
                aria-pressed={active}
                onClick={() => onChange({ billingPeriodStart: range.from, billingPeriodEnd: range.to })}
                className={clsx(
                  'rounded-full border px-3 py-1 text-sm font-medium transition-colors',
                  active ? 'border-brand-300 bg-brand-50 text-brand-700' : 'border-line-strong bg-surface text-ink-secondary hover:bg-subtle',
                )}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      <FormGrid>
        <FormField label="Period start" required error={errors.billingPeriodStart}>
          <Input type="date" value={values.billingPeriodStart} max={values.billingPeriodEnd || undefined} onChange={(e) => onChange({ billingPeriodStart: e.target.value })} />
        </FormField>
        <FormField label="Period end" required error={errors.billingPeriodEnd}>
          <Input type="date" value={values.billingPeriodEnd} min={values.billingPeriodStart || undefined} onChange={(e) => onChange({ billingPeriodEnd: e.target.value })} />
        </FormField>
        <FormField label="Project" optional hint="Leave empty to include all of this customer's projects.">
          <SelectField
            placeholder="All projects"
            options={customerProjects.map((p) => ({ value: p.id, label: `${p.name}${p.projectNumber ? ` (${p.projectNumber})` : ''}` }))}
            value={values.projectId}
            onChange={(e) => onChange({ projectId: e.target.value })}
          />
        </FormField>
        <FormField label="Employee" optional hint="Invoice only one employee's hours.">
          <SelectField placeholder="All employees" options={employeeOptions} value={values.employeeId} onChange={(e) => onChange({ employeeId: e.target.value })} />
        </FormField>
        <FormField label="Line grouping" required hint="How attendance is combined into invoice lines. Different rates are never merged.">
          <SelectField options={LINE_GROUPING} value={values.grouping} onChange={(e) => onChange({ grouping: e.target.value })} />
        </FormField>
      </FormGrid>

      {values.billingPeriodStart && values.billingPeriodEnd && values.billingPeriodEnd >= values.billingPeriodStart && (
        <p className="text-sm text-ink-muted">
          Attendance with a check-in between <span className="font-medium text-ink">{formatPeriod(values.billingPeriodStart, values.billingPeriodEnd)}</span> will be
          considered.
        </p>
      )}
    </div>
  );
}
