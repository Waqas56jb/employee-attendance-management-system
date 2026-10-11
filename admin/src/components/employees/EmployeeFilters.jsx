import { SearchInput } from '../common/SearchInput';
import { SelectField } from '../common/SelectField';
import { EMPLOYEE_STATUS_FILTERS } from './employeeUtils';

export function EmployeeFilters({ filters, onChange, projectOptions }) {
  return (
    <>
      <SearchInput
        value={filters.q}
        onChange={(v) => onChange('q', v)}
        placeholder="Search name, ID, email, phone…"
        label="Search employees"
        className="w-full sm:w-72"
      />
      <SelectField
        aria-label="Filter by status"
        size="sm"
        value={filters.status}
        onChange={(e) => onChange('status', e.target.value)}
        options={EMPLOYEE_STATUS_FILTERS}
        className="w-full sm:w-48"
      />
      <SelectField
        aria-label="Filter by assigned project"
        size="sm"
        value={filters.project}
        onChange={(e) => onChange('project', e.target.value)}
        placeholder="All projects"
        options={projectOptions}
        className="w-full sm:w-60"
      />
    </>
  );
}
