import { PROJECT_STATUS } from '../../services/projectService';
import { SearchInput } from '../common/SearchInput';
import { SegmentedControl } from '../common/SegmentedControl';
import { Select } from '../common/Select';

export function ProjectFilters({ filters, onChange, customers, counts }) {
  const statusOptions = [
    { value: '', label: 'All', count: counts.all },
    ...Object.entries(PROJECT_STATUS).map(([value, meta]) => ({ value, label: meta.label, count: counts[value] ?? 0 })),
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <SearchInput
          id="project-search"
          className="flex-1"
          value={filters.search}
          onChange={(search) => onChange({ search })}
          placeholder="Search projects, customers or locations"
          label="Search projects"
        />
        <div className="sm:w-56">
          <label htmlFor="project-customer" className="sr-only">
            Customer
          </label>
          <Select id="project-customer" value={filters.customerId} onChange={(e) => onChange({ customerId: e.target.value })}>
            <option value="">All customers</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.companyName}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div className="scrollbar-thin -mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        <SegmentedControl label="Filter by status" value={filters.status} onChange={(status) => onChange({ status })} options={statusOptions} />
      </div>
    </div>
  );
}

export default ProjectFilters;
