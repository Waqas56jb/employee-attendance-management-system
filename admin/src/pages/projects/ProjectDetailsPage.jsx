import { useId, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Archive, CheckCircle2, CirclePause, Info, PencilLine, PlayCircle } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '../../components/common/PageHeader';
import { Card, CardBody, CardHeader } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { StatusBadge } from '../../components/common/StatusBadge';
import { DescriptionList } from '../../components/common/DescriptionList';
import { ErrorState } from '../../components/common/ErrorState';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Callout } from '../../components/common/Callout';
import { ProjectForm } from '../../components/projects/ProjectForm';
import { ProjectEmployeeAssignments } from '../../components/projects/ProjectEmployeeAssignments';
import { ProjectHoursSummary } from '../../components/projects/ProjectHoursSummary';
import { ProjectInvoiceHistory } from '../../components/projects/ProjectInvoiceHistory';
import { ProjectWorkNotes } from '../../components/projects/ProjectWorkNotes';
import { ProjectCustomerSummary } from '../../components/projects/ProjectCustomerSummary';
import { projectToForm } from '../../components/projects/projectHelpers';
import { AttendanceTimeline } from '../../components/attendance/AttendanceTimeline';
import { useProjects } from '../../hooks/useProjects';
import { useLookups } from '../../hooks/useLookups';
import { useAttendance } from '../../hooks/useAttendance';
import { useInvoices } from '../../hooks/useInvoices';
import { useBusiness } from '../../hooks/useBusiness';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { isClosedRecord } from '../../services/reportService';
import { formatDate, formatDateTime } from '../../utils/dateUtils';

const STATUS_ACTIONS = {
  active: { label: 'Mark active', icon: PlayCircle, title: 'Set project to active', message: 'Assigned employees can record attendance on this project again.' },
  on_hold: { label: 'Put on hold', icon: CirclePause, title: 'Put project on hold', message: 'Use this to pause work temporarily.' },
  completed: { label: 'Mark completed', icon: CheckCircle2, title: 'Mark project as completed', message: 'Use this when all work on the project is done.' },
  archived: { label: 'Archive', icon: Archive, title: 'Archive project', message: 'Archived projects are hidden from active lists.' },
};

function availableStatusActions(status) {
  switch (status) {
    case 'planned':
      return ['active', 'on_hold', 'archived'];
    case 'active':
      return ['on_hold', 'completed', 'archived'];
    case 'on_hold':
      return ['active', 'completed', 'archived'];
    case 'completed':
      return ['active', 'archived'];
    case 'archived':
      return ['active'];
    default:
      return [];
  }
}

export default function ProjectDetailsPage() {
  const { projectId } = useParams();
  const { projectsById, updateProject, setProjectStatus } = useProjects();
  const { employeesById, customersById } = useLookups();
  const { attendance } = useAttendance();
  const { invoices } = useInvoices();
  const { workingHours } = useBusiness();
  const [run] = useAsyncAction();
  const [editing, setEditing] = useState(false);
  const [editBusy, setEditBusy] = useState(false);
  const [statusTarget, setStatusTarget] = useState(null);
  const editFormId = useId();

  const project = projectsById[projectId];
  const records = useMemo(() => attendance.filter((a) => a.projectId === projectId), [attendance, projectId]);
  const minutesByEmployee = useMemo(() => {
    const map = {};
    records.filter(isClosedRecord).forEach((r) => {
      map[r.employeeId] = (map[r.employeeId] ?? 0) + r.recordedDurationMinutes;
    });
    return map;
  }, [records]);

  if (!project) {
    return <ErrorState title="Project not found" message="The project may have been removed or the link is incorrect." backTo="/projects" backLabel="Back to projects" />;
  }

  const customer = customersById[project.customerId];
  const statusAction = statusTarget ? STATUS_ACTIONS[statusTarget] : null;

  const saveEdit = async (values) => {
    await updateProject(project.id, values);
    toast.success('Project updated');
    setEditing(false);
  };

  return (
    <>
      <PageHeader
        title={project.name}
        description={`${project.projectNumber} · ${customer?.companyName ?? 'Unknown customer'}`}
        breadcrumbs={[{ label: 'Projects', to: '/projects' }, { label: project.name }]}
        meta={
          <>
            <StatusBadge kind="project" status={project.status} />
            <span className="text-xs text-ink-muted">Updated {formatDateTime(project.updatedAt)}</span>
          </>
        }
        actions={
          <>
            <Button variant="secondary" icon={PencilLine} onClick={() => setEditing(true)}>
              Edit
            </Button>
            {availableStatusActions(project.status).map((status) => {
              const action = STATUS_ACTIONS[status];
              return (
                <Button key={status} variant={status === 'archived' ? 'danger-ghost' : 'secondary'} icon={action.icon} onClick={() => setStatusTarget(status)}>
                  {action.label}
                </Button>
              );
            })}
          </>
        }
      />

      <div className="space-y-4">
        {project.status === 'archived' && (
          <Callout tone="info" title="Archived project">
            This project is archived. Its attendance records and invoice history are kept for reporting and audit.
          </Callout>
        )}
        {project.status === 'on_hold' && (
          <Callout tone="warning" title="On hold">
            Work on this project is paused.
          </Callout>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <Card>
              <CardHeader icon={Info} title="Project information" />
              <CardBody>
                <DescriptionList
                  items={[
                    { label: 'Reference', value: project.projectNumber },
                    { label: 'Status', value: <StatusBadge kind="project" status={project.status} /> },
                    {
                      label: 'Customer',
                      value: customer ? (
                        <Link to={`/customers/${customer.id}`} className="font-medium text-brand-700 hover:underline">
                          {customer.companyName}
                        </Link>
                      ) : (
                        '—'
                      ),
                    },
                    { label: 'Work address', value: project.address },
                    { label: 'Start date', value: formatDate(project.startDate) },
                    { label: 'End date', value: project.endDate ? formatDate(project.endDate) : 'Open-ended' },
                    { label: 'Description', value: project.description, span: true },
                    { label: 'Instructions for employees', value: project.instructions, span: true },
                    { label: 'Internal notes', value: project.internalNotes, span: true },
                  ]}
                />
              </CardBody>
            </Card>

            <ProjectHoursSummary project={project} records={records} employeesById={employeesById} workingHours={workingHours} />

            <AttendanceTimeline records={records} employeesById={employeesById} />

            <ProjectInvoiceHistory projectId={project.id} invoices={invoices} />
          </div>

          <div className="space-y-4">
            <ProjectCustomerSummary customer={customer} />
            <ProjectEmployeeAssignments project={project} minutesByEmployee={minutesByEmployee} />
            <ProjectWorkNotes records={records} employeesById={employeesById} />
          </div>
        </div>
      </div>

      <Modal
        open={editing}
        onClose={() => setEditing(false)}
        dismissible={!editBusy}
        size="xl"
        title={`Edit ${project.name}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(false)} disabled={editBusy}>
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
            compact
            project={project}
            defaultValues={projectToForm(project)}
            onSubmit={saveEdit}
            formId={editFormId}
            showActions={false}
            onSubmittingChange={setEditBusy}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(statusTarget)}
        onClose={() => setStatusTarget(null)}
        tone={statusTarget === 'archived' ? 'danger' : 'warning'}
        title={statusAction?.title ?? ''}
        confirmLabel={statusAction?.label ?? 'Confirm'}
        requireReason
        message={
          <>
            {statusAction?.message} All attendance records and invoice history are retained.
          </>
        }
        onConfirm={(reason) =>
          run(() => setProjectStatus(project.id, statusTarget, reason), { success: `Project status updated to ${statusTarget?.replace('_', ' ')}`, rethrow: true })
        }
      />
    </>
  );
}
