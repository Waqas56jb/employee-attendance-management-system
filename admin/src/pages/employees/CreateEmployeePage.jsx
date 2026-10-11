import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { UserPlus } from 'lucide-react';
import { useEmployees } from '../../hooks/useEmployees';
import { useProjects } from '../../hooks/useProjects';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { Callout } from '../../components/common/Callout';
import { EmployeeForm } from '../../components/employees/EmployeeForm';
import { ASSIGNABLE_PROJECT_STATUSES } from '../../services/employeeService';
import { todayKey } from '../../utils/dateUtils';

export default function CreateEmployeePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { createEmployee, suggestEmployeeNumber } = useEmployees();
  const { projectsById } = useProjects();

  // Optional ?project=<id> preselects an assignable project (e.g. from a project page).
  const [defaults] = useState(() => {
    const preset = projectsById[params.get('project')];
    return {
      fullName: '',
      employeeNumber: suggestEmployeeNumber(),
      email: '',
      phone: '',
      jobTitle: '',
      department: '',
      employmentStartDate: todayKey(),
      status: 'active',
      notes: '',
      assignedProjectIds: preset && ASSIGNABLE_PROJECT_STATUSES.includes(preset.status) ? [preset.id] : [],
    };
  });

  const onSubmit = async (values) => {
    const employee = await createEmployee(values);
    toast.success('Employee created', {
      description: 'Inviting employees to the mobile app requires backend integration. No invitation has been sent.',
    });
    navigate(`/employees/${employee.id}`);
  };

  return (
    <>
      <PageHeader
        title="Add employee"
        description="Create the employee profile and assign the projects they will work on."
        breadcrumbs={[{ label: 'Employees', to: '/employees' }, { label: 'Add employee' }]}
      />
      <div className="mx-auto max-w-4xl space-y-6">
        <Callout tone="demo" title="Employee app access">
          In this demo the employee profile is stored in your browser only. Sending login invitations to the employee app requires a
          backend integration — no email is sent when you save.
        </Callout>
        <EmployeeForm
          mode="create"
          variant="page"
          defaultValues={defaults}
          onSubmit={onSubmit}
          footer={({ isSubmitting }) => (
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="secondary" to="/employees" disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" icon={UserPlus} loading={isSubmitting}>
                Create employee
              </Button>
            </div>
          )}
        />
      </div>
    </>
  );
}
