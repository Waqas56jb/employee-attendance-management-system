import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Archive, BadgeCheck, Briefcase, CalendarDays, Clock, Pencil, RotateCcw, Timer, Trash2, UserCheck, UserMinus } from 'lucide-react';
import { useEmployees } from '../../hooks/useEmployees';
import { useProjects } from '../../hooks/useProjects';
import { useCustomers } from '../../hooks/useCustomers';
import { useAttendance } from '../../hooks/useAttendance';
import { useBusiness } from '../../hooks/useBusiness';
import { useNow } from '../../hooks/useNow';
import { PageHeader } from '../../components/common/PageHeader';
import { Avatar } from '../../components/common/Avatar';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Callout } from '../../components/common/Callout';
import { Card, CardBody, CardHeader } from '../../components/common/Card';
import { DescriptionList } from '../../components/common/DescriptionList';
import { ErrorState } from '../../components/common/ErrorState';
import { StatCard } from '../../components/common/StatCard';
import { EmployeeStatusBadge } from '../../components/employees/EmployeeStatusBadge';
import { EmployeeProjectAssignments } from '../../components/employees/EmployeeProjectAssignments';
import { EmployeeAttendanceSummary } from '../../components/employees/EmployeeAttendanceSummary';
import { EmployeeProjectHistory } from '../../components/employees/EmployeeProjectHistory';
import { EmployeeBillableSummary } from '../../components/employees/EmployeeBillableSummary';
import { useEmployeeActions } from '../../components/employees/useEmployeeActions';
import { isClosedRecord, sumBillable, sumRecorded } from '../../services/reportService';
import { elapsedMinutes, isShiftOpen } from '../../utils/calculations';
import { formatDate, formatDateTime, formatTime, getPresetRange, isInDateRange } from '../../utils/dateUtils';
import { formatDuration } from '../../utils/formatters';

export default function EmployeeDetailsPage() {
  const { employeeId } = useParams();
  const navigate = useNavigate();
  const { employeesById } = useEmployees();
  const { projectsById } = useProjects();
  const { customersById } = useCustomers();
  const { attendance } = useAttendance();
  const { workingHours } = useBusiness();
  const now = useNow(30000);
  const { trigger, elements } = useEmployeeActions({ onDeleted: () => navigate('/employees', { replace: true }) });

  const employee = employeesById[employeeId];

  const records = useMemo(() => attendance.filter((a) => a.employeeId === employeeId), [attendance, employeeId]);

  const stats = useMemo(() => {
    const week = getPresetRange('this_week');
    const month = getPresetRange('this_month');
    const inRange = (range) => records.filter((r) => isInDateRange(r.checkInAt, range.from, range.to));
    const minutesByProject = {};
    records.filter(isClosedRecord).forEach((r) => {
      minutesByProject[r.projectId] = (minutesByProject[r.projectId] ?? 0) + r.recordedDurationMinutes;
    });
    return {
      total: sumRecorded(records),
      week: sumRecorded(inRange(week)),
      month: sumRecorded(inRange(month)),
      billable: sumBillable(records, workingHours),
      shifts: records.filter(isClosedRecord).length,
      openShift: records.find(isShiftOpen) ?? null,
      minutesByProject,
      customerIds: [...new Set(records.map((r) => r.customerId))],
    };
  }, [records, workingHours]);

  if (!employee) {
    return (
      <ErrorState
        title="Employee not found"
        message="This employee does not exist or was deleted. Archived employees are still available from the employee list."
        backTo="/employees"
        backLabel="Back to employees"
      />
    );
  }

  const open = stats.openShift;
  const hasHistory = records.length > 0;

  const actions = (
    <>
      <Button variant="secondary" icon={Pencil} onClick={() => trigger('edit', employee)}>
        Edit
      </Button>
      <Button variant="secondary" icon={Briefcase} onClick={() => trigger('assign', employee)}>
        Manage assignments
      </Button>
      {employee.status === 'active' && (
        <Button variant="secondary" icon={UserMinus} onClick={() => trigger('deactivate', employee)}>
          Deactivate
        </Button>
      )}
      {employee.status === 'inactive' && (
        <Button variant="secondary" icon={UserCheck} onClick={() => trigger('activate', employee)}>
          Activate
        </Button>
      )}
      {employee.status === 'archived' ? (
        <Button variant="secondary" icon={RotateCcw} onClick={() => trigger('restore', employee)}>
          Restore
        </Button>
      ) : (
        <Button variant="danger-ghost" icon={Archive} onClick={() => trigger('archive', employee)}>
          Archive
        </Button>
      )}
      {!hasHistory && (
        <Button variant="danger-ghost" icon={Trash2} onClick={() => trigger('delete', employee)}>
          Delete
        </Button>
      )}
    </>
  );

  return (
    <>
      <PageHeader
        documentTitle={employee.fullName}
        title={
          <span className="flex min-w-0 items-center gap-3">
            <Avatar name={employee.fullName} size="md" />
            <span className="min-w-0 truncate">{employee.fullName}</span>
          </span>
        }
        breadcrumbs={[{ label: 'Employees', to: '/employees' }, { label: employee.fullName }]}
        meta={
          <>
            <EmployeeStatusBadge status={employee.status} />
            <span className="text-sm text-ink-muted">
              {employee.jobTitle} · {employee.employeeNumber}
            </span>
            {open && (
              <Badge tone="info" dot pulse>
                On shift since {formatTime(open.checkInAt)}
              </Badge>
            )}
          </>
        }
        actions={actions}
      />

      <div className="space-y-6">
        {employee.status !== 'active' && (
          <Callout tone={employee.status === 'archived' ? 'warning' : 'info'} title={employee.status === 'archived' ? 'Archived employee' : 'Inactive employee'}>
            {employee.fullName} cannot be assigned to new projects. Attendance, billing and invoice history remain available below.
            {employee.status === 'archived' && ' Restore the employee to make changes to assignments.'}
          </Callout>
        )}

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <StatCard label="Total hours worked" value={formatDuration(stats.total)} icon={Clock} hint={`${stats.shifts} completed shifts`} />
          <StatCard label="Hours this week" value={formatDuration(stats.week)} icon={CalendarDays} tone="info" hint="Since Monday" />
          <StatCard label="Hours this month" value={formatDuration(stats.month)} icon={CalendarDays} tone="info" />
          <StatCard label="Approved billable" value={formatDuration(stats.billable)} icon={BadgeCheck} tone="success" hint="All time" />
          <StatCard
            label="Current shift"
            value={open ? formatDuration(elapsedMinutes(open.checkInAt, now)) : 'Off shift'}
            icon={Timer}
            tone={open ? 'info' : 'neutral'}
            hint={open ? `${projectsById[open.projectId]?.name ?? 'Project'} · since ${formatTime(open.checkInAt)}` : 'No open shift'}
            to={open ? `/attendance/${open.id}` : undefined}
            className="col-span-2 lg:col-span-1"
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <Card className="lg:col-span-3">
            <CardHeader title="Personal & employment information" />
            <CardBody>
              <DescriptionList
                items={[
                  { label: 'Full name', value: employee.fullName },
                  { label: 'Employee ID', value: employee.employeeNumber },
                  {
                    label: 'Email',
                    value: (
                      <a href={`mailto:${employee.email}`} className="text-brand-700 hover:underline">
                        {employee.email}
                      </a>
                    ),
                  },
                  {
                    label: 'Phone',
                    value: (
                      <a href={`tel:${employee.phone.replace(/\s/g, '')}`} className="text-brand-700 hover:underline">
                        {employee.phone}
                      </a>
                    ),
                  },
                  { label: 'Job title', value: employee.jobTitle },
                  { label: 'Department', value: employee.department },
                  { label: 'Employment start date', value: formatDate(employee.employmentStartDate) },
                  { label: 'Status', value: <EmployeeStatusBadge status={employee.status} /> },
                  { label: 'Employee app access', value: 'Managed by the backend (not part of this demo)' },
                  { label: 'Last updated', value: formatDateTime(employee.updatedAt) },
                  { label: 'Notes', value: employee.notes, span: true },
                ]}
              />
            </CardBody>
          </Card>
          <div className="lg:col-span-2">
            <EmployeeProjectAssignments
              employee={employee}
              projectsById={projectsById}
              customersById={customersById}
              minutesByProject={stats.minutesByProject}
              onManage={() => trigger('assign', employee)}
            />
          </div>
        </div>

        <EmployeeAttendanceSummary records={records} projectsById={projectsById} customersById={customersById} />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <EmployeeProjectHistory records={records} projectsById={projectsById} customersById={customersById} assignedIds={employee.assignedProjectIds} />
          <EmployeeBillableSummary employeeId={employee.id} customerIds={stats.customerIds} />
        </div>
      </div>

      {elements}
    </>
  );
}
