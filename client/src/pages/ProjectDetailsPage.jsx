import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { FolderX } from 'lucide-react';
import { Button } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';
import { Skeleton } from '../components/common/LoadingSpinner';
import { PageHeader } from '../components/common/PageHeader';
import { PageContainer } from '../components/layout/PageContainer';
import { ProjectDetails } from '../components/projects/ProjectDetails';
import { ProjectStatusBadge } from '../components/projects/ProjectStatusBadge';
import { useAssignments } from '../hooks/useAssignments';
import { useAsync } from '../hooks/useAsync';
import { useAttendance } from '../hooks/useAttendance';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { ERROR_CODES } from '../services/errors';
import { getMyProjectById } from '../services/projectService';

export function ProjectDetailsPage() {
  const { projectId } = useParams();
  const { data: project, error, status, reload } = useAsync(() => getMyProjectById(projectId), [projectId]);
  const { customersById } = useAssignments();
  const { records } = useAttendance();
  useDocumentTitle(project?.name ?? 'Project');

  const projectRecords = useMemo(() => records.filter((r) => r.projectId === projectId), [records, projectId]);

  if (status === 'loading') {
    return (
      <PageContainer>
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-4 h-8 w-72" />
        <Skeleton className="mt-2 h-4 w-48" />
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Skeleton className="h-64 rounded-xl lg:col-span-2" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </PageContainer>
    );
  }

  if (status === 'error') {
    const notFound = error?.code === ERROR_CODES.NOT_FOUND;
    return (
      <PageContainer>
        <PageHeader title={notFound ? 'Project not found' : 'Project unavailable'} backTo="/projects" backLabel="My Projects" />
        <div className="card">
          <EmptyState
            icon={FolderX}
            title={notFound ? 'This project is not available to you' : 'Something went wrong'}
            description={
              notFound
                ? 'The project does not exist or is not assigned to you. Only projects you are assigned to can be viewed.'
                : 'The project could not be loaded. Please try again.'
            }
            action={notFound ? <Button to="/projects">View my projects</Button> : <Button onClick={reload}>Try again</Button>}
          />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title={project.name}
        description={project.customerName}
        backTo="/projects"
        backLabel="My Projects"
        eyebrow={<ProjectStatusBadge status={project.status} />}
      />
      <ProjectDetails project={project} customer={customersById[project.customerId]} records={projectRecords} />
    </PageContainer>
  );
}

export default ProjectDetailsPage;
