import { useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { ATTENDANCE_STATUS_META } from '../common/StatusBadge';
import { Button } from '../common/Button';
import { SearchInput } from '../common/SearchInput';
import { Select } from '../common/Select';
import { PERIOD_PRESETS, toDateInputValue } from '../../utils/dateUtils';
import { cn } from '../../utils/cn';

export const DEFAULT_ATTENDANCE_FILTERS = {
  period: 'this-month',
  from: '',
  to: '',
  customerId: '',
  projectId: '',
  status: '',
  search: '',
};

/** Number of filters that differ from the defaults (search excluded). */
export function countActiveFilters(filters) {
  return ['period', 'customerId', 'projectId', 'status'].filter((k) => filters[k] !== DEFAULT_ATTENDANCE_FILTERS[k]).length;
}

export function AttendanceFilters({ filters, onChange, onClear, customers, projects }) {
  const [expanded, setExpanded] = useState(false);
  const activeCount = countActiveFilters(filters);
  const secondaryCount = ['customerId', 'projectId', 'status'].filter((k) => filters[k]).length;
  const projectOptions = filters.customerId ? projects.filter((p) => p.customerId === filters.customerId) : projects;
  const rangeInvalid = filters.period === 'custom' && filters.from && filters.to && filters.from > filters.to;
  const today = toDateInputValue(new Date());

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <SearchInput
          id="attendance-search"
          className="flex-1"
          value={filters.search}
          onChange={(search) => onChange({ search })}
          placeholder="Search customer, project or notes"
          label="Search attendance records"
        />
        <div className="flex gap-2">
          <div className="flex-1 sm:w-44 sm:flex-none">
            <label htmlFor="filter-period" className="sr-only">
              Period
            </label>
            <Select id="filter-period" value={filters.period} onChange={(e) => onChange({ period: e.target.value })}>
              {PERIOD_PRESETS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </Select>
          </div>
          <Button
            variant="secondary"
            leftIcon={SlidersHorizontal}
            className="md:hidden"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            aria-controls="attendance-more-filters"
          >
            Filters{secondaryCount ? ` (${secondaryCount})` : ''}
          </Button>
        </div>
      </div>

      {filters.period === 'custom' && (
        <div className="grid grid-cols-2 gap-3 sm:max-w-md">
          <div>
            <label htmlFor="filter-from" className="mb-1 block text-xs font-medium text-ink-secondary">
              From
            </label>
            <input
              id="filter-from"
              type="date"
              className="input h-10"
              value={filters.from}
              max={filters.to || today}
              onChange={(e) => onChange({ from: e.target.value })}
              aria-invalid={rangeInvalid || undefined}
            />
          </div>
          <div>
            <label htmlFor="filter-to" className="mb-1 block text-xs font-medium text-ink-secondary">
              To
            </label>
            <input
              id="filter-to"
              type="date"
              className="input h-10"
              value={filters.to}
              min={filters.from || undefined}
              max={today}
              onChange={(e) => onChange({ to: e.target.value })}
              aria-invalid={rangeInvalid || undefined}
            />
          </div>
          {rangeInvalid && (
            <p role="alert" className="col-span-2 text-xs font-medium text-danger-ink">
              The start date must be on or before the end date.
            </p>
          )}
        </div>
      )}

      <div id="attendance-more-filters" className={cn('gap-3 sm:grid-cols-2 md:grid md:grid-cols-4', expanded ? 'grid' : 'hidden')}>
        <div>
          <label htmlFor="filter-customer" className="sr-only">
            Customer
          </label>
          <Select id="filter-customer" value={filters.customerId} onChange={(e) => onChange({ customerId: e.target.value, projectId: '' })}>
            <option value="">All customers</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.companyName}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label htmlFor="filter-project" className="sr-only">
            Project
          </label>
          <Select id="filter-project" value={filters.projectId} onChange={(e) => onChange({ projectId: e.target.value })}>
            <option value="">All projects</option>
            {projectOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label htmlFor="filter-status" className="sr-only">
            Status
          </label>
          <Select id="filter-status" value={filters.status} onChange={(e) => onChange({ status: e.target.value })}>
            <option value="">All statuses</option>
            {Object.entries(ATTENDANCE_STATUS_META).map(([value, meta]) => (
              <option key={value} value={value}>
                {meta.label}
              </option>
            ))}
          </Select>
        </div>
        <Button variant="ghost" leftIcon={X} onClick={onClear} disabled={!activeCount && !filters.search} className="justify-self-start">
          Clear filters
        </Button>
      </div>
    </div>
  );
}

export default AttendanceFilters;
