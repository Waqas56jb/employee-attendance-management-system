import { useMemo } from 'react';
import { SearchInput } from '../common/SearchInput';
import { SelectField } from '../common/SelectField';
import { PROJECT_STATUSES } from '../../services/projectService';

export function ProjectFilters({ filters, setFilter, customers, employees }) {
  const customerOptions = useMemo(
    () => [...customers].sort((a, b) => a.companyName.localeCompare(b.companyName)).map((c) => ({ value: c.id, label: c.companyName })),
    [customers],
  );
  const employeeOptions = useMemo(
    () =>
      employees
        .filter((e) => e.status !== 'archived' || e.assignedProjectIds.length > 0)
        .sort((a, b) => a.fullName.localeCompare(b.fullName))
        .map((e) => ({ value: e.id, label: e.fullName })),
    [employees],
  );

  return (
    <>
      <SearchInput value={filters.q} onChange={(v) => setFilter('q', v)} placeholder="Search project or customer…" label="Search projects" className="w-full sm:w-64" />
      <SelectField
        size="sm"
        aria-label="Filter by status"
        placeholder="All statuses"
        options={PROJECT_STATUSES}
        value={filters.status}
        onChange={(e) => setFilter('status', e.target.value)}
        className="w-full sm:w-40"
      />
      <SelectField
        size="sm"
        aria-label="Filter by customer"
        placeholder="All customers"
        options={customerOptions}
        value={filters.customer}
        onChange={(e) => setFilter('customer', e.target.value)}
        className="w-full sm:w-52"
      />
      <SelectField
        size="sm"
        aria-label="Filter by assigned employee"
        placeholder="All employees"
        options={employeeOptions}
        value={filters.employee}
        onChange={(e) => setFilter('employee', e.target.value)}
        className="w-full sm:w-48"
      />
    </>
  );
}
