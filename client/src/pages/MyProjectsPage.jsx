import { useMemo, useState } from 'react';
import { FolderKanban, SearchX } from 'lucide-react';
import { Button } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';
import { Skeleton } from '../components/common/LoadingSpinner';
import { PageHeader } from '../components/common/PageHeader';
import { PageContainer } from '../components/layout/PageContainer';
import { ProjectCard } from '../components/projects/ProjectCard';
import { ProjectFilters } from '../components/projects/ProjectFilters';
import { useAssignments } from '../hooks/useAssignments';
import { useAttendanceSummary } from '../hooks/useAttendance';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const ORDER = { active: 0, upcoming: 1, 'on-hold': 2, completed: 3 };
const EMPTY_FILTERS = { search: '', status: '', customerId: '' };

export function MyProjectsPage() {
  useDocumentTitle('My Projects');
  const { projects, customers, isLoading, status, reload } = useAssignments();
  const { minutesByProject } = useAttendanceSummary();
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  const counts = useMemo(
    () => projects.reduce((acc, p) => ({ ...acc, [p.status]: (acc[p.status] || 0) + 1 }), { all: projects.length }),
    [projects],
  );

  const visible = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return projects
      .filter((p) => (!filters.status || p.status === filters.status) && (!filters.customerId || p.customerId === filters.customerId))
      .filter((p) => !q || [p.name, p.customerName, p.location, p.description].join(' ').toLowerCase().includes(q))
      .sort((a, b) => ORDER[a.status] - ORDER[b.status] || a.name.localeCompare(b.name));
  }, [projects, filters]);

  return (
    <PageContainer>
      <PageHeader title="My Projects" description="Projects you are assigned to, with your recorded hours and on-site contacts." />

      <div className="mb-6">
        <ProjectFilters filters={filters} onChange={(c) => setFilters((f) => ({ ...f, ...c }))} customers={customers} counts={counts} />
      </div>

      {status === 'error' ? (
        <div className="card">
          <EmptyState
            icon={FolderKanban}
            title="Projects could not be loaded"
            description="Please try again."
            action={<Button onClick={reload}>Try again</Button>}
          />
        </div>
      ) : isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-72 rounded-xl" />
          ))}
        </div>
      ) : !projects.length ? (
        <div className="card">
          <EmptyState icon={FolderKanban} title="No projects assigned" description="When your supervisor assigns you to a project it will appear here." />
        </div>
      ) : !visible.length ? (
        <div className="card">
          <EmptyState
            icon={SearchX}
            title="No projects match your filters"
            description="Try a different search term or status."
            action={
              <Button variant="secondary" onClick={() => setFilters(EMPTY_FILTERS)}>
                Clear filters
              </Button>
            }
          />
        </div>
      ) : (
        <>
          <p className="mb-3 text-sm text-ink-muted" aria-live="polite">
            Showing {visible.length} of {projects.length} projects
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visible.map((project) => (
              <ProjectCard key={project.id} project={project} recordedMinutes={minutesByProject[project.id] || 0} />
            ))}
          </div>
        </>
      )}
    </PageContainer>
  );
}

export default MyProjectsPage;
