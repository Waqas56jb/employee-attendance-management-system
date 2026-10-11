import { SearchInput } from '../common/SearchInput';
import { SelectField } from '../common/SelectField';
import { CUSTOMER_STATUS_FILTERS } from './customerUtils';

export function CustomerFilters({ filters, onChange, projectOptions }) {
  return (
    <>
      <SearchInput
        value={filters.q}
        onChange={(v) => onChange('q', v)}
        placeholder="Search name, reference, contact, email…"
        label="Search customers"
        className="w-full sm:w-72"
      />
      <SelectField
        aria-label="Filter by status"
        size="sm"
        value={filters.status}
        onChange={(e) => onChange('status', e.target.value)}
        options={CUSTOMER_STATUS_FILTERS}
        className="w-full sm:w-48"
      />
      <SelectField
        aria-label="Filter by project"
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
