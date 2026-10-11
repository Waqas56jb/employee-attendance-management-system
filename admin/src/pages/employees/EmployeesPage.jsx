import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { useEmployees } from '../../hooks/useEmployees';
import { useProjects } from '../../hooks/useProjects';
import { useCustomers } from '../../hooks/useCustomers';
import { useAttendance } from '../../hooks/useAttendance';
import { useQueryState } from '../../hooks/useQueryState';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { FilterBar } from '../../components/common/FilterBar';
import { ExportButton } from '../../components/common/ExportButton';
import { getStatusMeta } from '../../components/common/StatusBadge';
import { EmployeeFilters } from '../../components/employees/EmployeeFilters';
import { EmployeeTable } from '../../components/employees/EmployeeTable';
import { matchesStatusFilter, recordedMinutesByEmployee } from '../../components/employees/employeeUtils';
import { useEmployeeActions } from '../../components/employees/useEmployeeActions';
import { getPresetRange } from '../../utils/dateUtils';
import { formatHours } from '../../utils/formatters';

const FILTER_DEFAULTS = { q: '', status: '', project: '' };

export default function EmployeesPage() {
  const navigate = useNavigate();
  const { employees } = useEmployees();
  const { projects, projectsById } = useProjects();
  const { customersById } = useCustomers();
  const { attendance } = useAttendance();
  const [filters, setFilter, resetFilters, isFiltered] = useQueryState(FILTER_DEFAULTS);
  const { trigger, elements } = useEmployeeActions();

  const weekMinutes = useMemo(() => recordedMinutesByEmployee(attendance, getPresetRange('this_week')), [attendance]);

  const enriched = useMemo(
    () =>
      employees.map((e) => ({
        ...e,
        projects: e.assignedProjectIds.map((id) => projectsById[id]).filter(Boolean),
        weekMinutes: weekMinutes[e.id] ?? 0,
      })),
    [employees, projectsById, weekMinutes],
  );

  const rows = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    return enriched.filter(
      (e) =>
        matchesStatusFilter(e.status, filters.status) &&
        (!filters.project || e.assignedProjectIds.includes(filters.project)) &&
        (!q || [e.fullName, e.employeeNumber, e.email, e.phone].some((v) => v?.toLowerCase().includes(q))),
    );
  }, [enriched, filters]);

  const projectOptions = useMemo(
    () =>
      [...projects]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((p) => ({ value: p.id, label: `${p.name} · ${customersById[p.customerId]?.companyName ?? ''}` })),
    [projects, customersById],
  );

  const activeCount = employees.filter((e) => e.status === 'active').length;

  const exportColumns = [
    { header: 'Employee ID', value: (e) => e.employeeNumber },
    { header: 'Full name', value: (e) => e.fullName },
    { header: 'Job title', value: (e) => e.jobTitle },
    { header: 'Department', value: (e) => e.department },
    { header: 'Email', value: (e) => e.email },
    { header: 'Phone', value: (e) => e.phone },
    { header: 'Start date', value: (e) => e.employmentStartDate },
    { header: 'Status', value: (e) => getStatusMeta('employee', e.status).label },
    { header: 'Assigned projects', value: (e) => e.projects.map((p) => p.name).join('; ') },
    { header: 'Hours this week', value: (e) => formatHours(e.weekMinutes) },
  ];

  const addButton = (
    <Button icon={UserPlus} to="/employees/new">
      Add employee
    </Button>
  );

  return (
    <>
      <PageHeader
        title="Employees"
        description={`${activeCount} active of ${employees.filter((e) => e.status !== 'archived').length} employees. Hours this week are recorded hours since Monday.`}
        breadcrumbs={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Employees' }]}
        actions={addButton}
      />

      <Card>
        <FilterBar
          count={rows.length}
          noun="employee"
          isFiltered={isFiltered}
          onReset={resetFilters}
          actions={<ExportButton rows={rows} columns={exportColumns} filename="employees" />}
        >
          <EmployeeFilters filters={filters} onChange={setFilter} projectOptions={projectOptions} />
        </FilterBar>
        <EmployeeTable
          rows={rows}
          onAction={trigger}
          onRowClick={(e) => navigate(`/employees/${e.id}`)}
          isFiltered={isFiltered}
          emptyAction={
            isFiltered ? (
              <Button variant="secondary" onClick={resetFilters}>
                Reset filters
              </Button>
            ) : (
              addButton
            )
          }
        />
      </Card>

      {elements}
    </>
  );
}
