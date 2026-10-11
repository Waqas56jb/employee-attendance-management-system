import { useCallback, useId, useMemo, useState } from 'react';
import { Briefcase, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { FilterBar } from '../../components/common/FilterBar';
import { ExportButton } from '../../components/common/ExportButton';
import { EmptyState } from '../../components/common/EmptyState';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { ProjectFilters } from '../../components/projects/ProjectFilters';
import { ProjectTable } from '../../components/projects/ProjectTable';
import { ProjectForm } from '../../components/projects/ProjectForm';
import { filterProjects, PROJECT_FILTER_DEFAULTS, projectCsvColumns, projectHourTotals, projectToForm } from '../../components/projects/projectHelpers';
import { useProjects } from '../../hooks/useProjects';
import { useCustomers } from '../../hooks/useCustomers';
import { useEmployees } from '../../hooks/useEmployees';
import { useAttendance } from '../../hooks/useAttendance';
import { useBusiness } from '../../hooks/useBusiness';
import { useQueryState } from '../../hooks/useQueryState';
import { useAsyncAction } from '../../hooks/useAsyncAction';

export default function ProjectsPage() {
  const { projects, updateProject, setProjectStatus } = useProjects();
  const { customers, customersById } = useCustomers();
  const { employees, employeesById } = useEmployees();
  const { attendance } = useAttendance();
  const { workingHours } = useBusiness();
  const [filters, setFilter, resetFilters, isFiltered] = useQueryState(PROJECT_FILTER_DEFAULTS);
  const [run] = useAsyncAction();
  const [editing, setEditing] = useState(null);
  const [editBusy, setEditBusy] = useState(false);
  const [archiving, setArchiving] = useState(null);
  const editFormId = useId();

  const totals = useMemo(() => projectHourTotals(attendance, workingHours), [attendance, workingHours]);
  const rows = useMemo(() => filterProjects(projects, filters, { customersById }), [projects, filters, customersById]);
  const csvColumns = useMemo(() => projectCsvColumns({ customersById, employeesById }, totals), [customersById, employeesById, totals]);

  const onEdit = useCallback((project) => setEditing(project), []);
  const onArchive = useCallback((project) => setArchiving(project), []);

  const saveEdit = async (values) => {
    await updateProject(editing.id, values);
    toast.success('Project updated');
    setEditing(null);
  };

  return (
    <>
      <PageHeader
        title="Projects"
        description="Work sites per customer, the assigned team and the hours recorded there."
        breadcrumbs={[{ label: 'Overview', to: '/dashboard' }, { label: 'Projects' }]}
        actions={
          <Button icon={Plus} to="/projects/new">
            Create project
          </Button>
        }
      />

      <Card>
        <FilterBar
          count={rows.length}
          noun="project"
          isFiltered={isFiltered}
          onReset={resetFilters}
          actions={<ExportButton rows={rows} columns={csvColumns} filename="projects" />}
        >
          <ProjectFilters filters={filters} setFilter={setFilter} customers={customers} employees={employees} />
        </FilterBar>
        <ProjectTable
          rows={rows}
          totals={totals}
          customersById={customersById}
          employeesById={employeesById}
          onEdit={onEdit}
          onArchive={onArchive}
          emptyState={
            <EmptyState
              icon={Briefcase}
              title={isFiltered ? 'No projects match these filters' : 'No projects yet'}
              description={isFiltered ? 'Try another status, customer or search term.' : 'Create a project to assign employees to a customer site.'}
              action={
                isFiltered ? (
                  <Button variant="secondary" onClick={resetFilters}>
                    Reset filters
                  </Button>
                ) : (
                  <Button icon={Plus} to="/projects/new">
                    Create project
                  </Button>
                )
              }
            />
          }
        />
      </Card>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        dismissible={!editBusy}
        size="xl"
        title={editing ? `Edit ${editing.name}` : 'Edit project'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)} disabled={editBusy}>
              Cancel
            </Button>
            <Button type="submit" form={editFormId} loading={editBusy}>
              Save changes
            </Button>
          </>
        }
      >
        {editing && (
          <ProjectForm
            key={editing.id}
            compact
            project={editing}
            defaultValues={projectToForm(editing)}
            onSubmit={saveEdit}
            formId={editFormId}
            showActions={false}
            onSubmittingChange={setEditBusy}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(archiving)}
        onClose={() => setArchiving(null)}
        title="Archive project"
        confirmLabel="Archive project"
        requireReason
        message={
          archiving && (
            <>
              Archive <strong className="text-ink">{archiving.name}</strong>? All recorded attendance and invoice history are retained, and the status can be changed again later from the
              project page.
            </>
          )
        }
        onConfirm={(reason) => run(() => setProjectStatus(archiving.id, 'archived', reason), { success: 'Project archived', rethrow: true })}
      />
    </>
  );
}
