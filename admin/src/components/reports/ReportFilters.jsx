import { useMemo } from 'react';
import { DateRangePicker } from '../common/DateRangePicker';
import { SelectField } from '../common/SelectField';
import { statusOptions } from '../common/StatusBadge';

/** Only the filters relevant to the selected report are rendered. */
export function ReportFilters({ filters, values, onChange, employees, customers, projects }) {
  const has = (k) => filters.includes(k);

  const employeeOptions = useMemo(
    () => [...employees].sort((a, b) => a.fullName.localeCompare(b.fullName)).map((e) => ({ value: e.id, label: e.status === 'active' ? e.fullName : `${e.fullName} (${e.status})` })),
    [employees],
  );
  const customerOptions = useMemo(
    () => [...customers].sort((a, b) => a.companyName.localeCompare(b.companyName)).map((c) => ({ value: c.id, label: c.companyName })),
    [customers],
  );
  const projectOptions = useMemo(
    () =>
      projects
        .filter((p) => !values.customer || p.customerId === values.customer)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((p) => ({ value: p.id, label: `${p.projectNumber} · ${p.name}` })),
    [projects, values.customer],
  );

  return (
    <>
      {has('range') && <DateRangePicker value={{ from: values.from, to: values.to }} onChange={(r) => onChange({ from: r.from, to: r.to })} label="Report period" />}
      {has('employee') && (
        <SelectField aria-label="Employee" size="sm" className="w-full sm:w-48" value={values.employee} onChange={(e) => onChange({ employee: e.target.value })} placeholder="All employees" options={employeeOptions} />
      )}
      {has('customer') && (
        <SelectField
          aria-label="Customer"
          size="sm"
          className="w-full sm:w-52"
          value={values.customer}
          onChange={(e) => {
            const customer = e.target.value;
            const keepProject = !values.project || projects.find((p) => p.id === values.project)?.customerId === customer;
            onChange(keepProject || !customer ? { customer } : { customer, project: '' });
          }}
          placeholder="All customers"
          options={customerOptions}
        />
      )}
      {has('project') && (
        <SelectField aria-label="Project" size="sm" className="w-full sm:w-56" value={values.project} onChange={(e) => onChange({ project: e.target.value })} placeholder="All projects" options={projectOptions} />
      )}
      {has('status') && (
        <SelectField aria-label="Invoice status" size="sm" className="w-full sm:w-44" value={values.status} onChange={(e) => onChange({ status: e.target.value })} placeholder="All statuses" options={statusOptions('invoice')} />
      )}
    </>
  );
}
