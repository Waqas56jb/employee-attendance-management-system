import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { PageHeader } from '../../components/common/PageHeader';
import { ProjectForm } from '../../components/projects/ProjectForm';
import { emptyProjectForm } from '../../components/projects/projectHelpers';
import { useProjects } from '../../hooks/useProjects';
import { useCustomers } from '../../hooks/useCustomers';

export default function CreateProjectPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { createProject, suggestProjectNumber } = useProjects();
  const { customersById } = useCustomers();

  const prefillId = params.get('customer');
  const prefillCustomer = prefillId && customersById[prefillId]?.status !== 'archived' ? customersById[prefillId] : null;
  // Computed once per mount so later data changes don't reset the form.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const defaults = useMemo(() => emptyProjectForm({ projectNumber: suggestProjectNumber(), customer: prefillCustomer }), []);

  const backTo = prefillCustomer ? `/customers/${prefillCustomer.id}` : '/projects';

  const onSubmit = async (values) => {
    const project = await createProject(values);
    toast.success(`Project ${project.name} created`);
    navigate(`/projects/${project.id}`);
  };

  return (
    <>
      <PageHeader
        title="Create project"
        description="Projects connect a customer, a work site and the employees who record attendance there."
        breadcrumbs={[
          { label: 'Projects', to: '/projects' },
          ...(prefillCustomer ? [{ label: prefillCustomer.companyName, to: `/customers/${prefillCustomer.id}` }] : []),
          { label: 'New project' },
        ]}
      />
      <ProjectForm defaultValues={defaults} onSubmit={onSubmit} onCancel={() => navigate(backTo)} submitLabel="Create project" />
    </>
  );
}
