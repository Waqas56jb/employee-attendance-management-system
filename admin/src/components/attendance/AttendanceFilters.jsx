import { useMemo } from 'react';
import { SearchInput } from '../common/SearchInput';
import { SelectField } from '../common/SelectField';
import { DateRangePicker } from '../common/DateRangePicker';
import { ATTENDANCE_FILTER_STATUS_OPTIONS, SHIFT_OPTIONS } from './attendanceHelpers';

/**
 * Attendance list filters (all stored in the URL). The project list is
 * limited to the selected customer's projects.
 */
export function AttendanceFilters({ filters, setFilter, employees, customers, projects, hideEmployee = false }) {
  const projectOptions = useMemo(
    () =>
      projects
        .filter((p) => !filters.customer || p.customerId === filters.customer)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((p) => ({ value: p.id, label: p.name })),
    [projects, filters.customer],
  );
  const customerOptions = useMemo(
    () => [...customers].sort((a, b) => a.companyName.localeCompare(b.companyName)).map((c) => ({ value: c.id, label: c.companyName })),
    [customers],
  );
  const employeeOptions = useMemo(
    () => [...employees].sort((a, b) => a.fullName.localeCompare(b.fullName)).map((e) => ({ value: e.id, label: e.fullName })),
    [employees],
  );

  const onCustomer = (value) => {
    const project = projects.find((p) => p.id === filters.project);
    setFilter({ customer: value, project: project && value && project.customerId !== value ? '' : filters.project });
  };

  return (
    <>
      <SearchInput value={filters.q} onChange={(v) => setFilter('q', v)} placeholder="Search employee…" label="Search by employee" className="w-full sm:w-56" />
      <DateRangePicker value={{ from: filters.from, to: filters.to }} onChange={(r) => setFilter({ from: r.from, to: r.to })} compact label="Work date" />
      {!hideEmployee && (
        <SelectField
          size="sm"
          aria-label="Filter by employee"
          placeholder="All employees"
          options={employeeOptions}
          value={filters.employee}
          onChange={(e) => setFilter('employee', e.target.value)}
          className="w-full sm:w-44"
        />
      )}
      <SelectField
        size="sm"
        aria-label="Filter by customer"
        placeholder="All customers"
        options={customerOptions}
        value={filters.customer}
        onChange={(e) => onCustomer(e.target.value)}
        className="w-full sm:w-48"
      />
      <SelectField
        size="sm"
        aria-label="Filter by project"
        placeholder={filters.customer ? 'All projects of customer' : 'All projects'}
        options={projectOptions}
        value={filters.project}
        onChange={(e) => setFilter('project', e.target.value)}
        className="w-full sm:w-48"
      />
      <SelectField
        size="sm"
        aria-label="Filter by status"
        placeholder="All statuses"
        options={ATTENDANCE_FILTER_STATUS_OPTIONS}
        value={filters.status}
        onChange={(e) => setFilter('status', e.target.value)}
        className="w-full sm:w-44"
      />
      <SelectField
        size="sm"
        aria-label="Filter by shift state"
        placeholder="Open & completed"
        options={SHIFT_OPTIONS}
        value={filters.shift}
        onChange={(e) => setFilter('shift', e.target.value)}
        className="w-full sm:w-44"
      />
    </>
  );
}
