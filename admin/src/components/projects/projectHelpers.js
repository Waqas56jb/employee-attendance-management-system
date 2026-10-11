import { sumBillable, sumRecorded } from '../../services/reportService';
import { formatDate } from '../../utils/dateUtils';
import { formatHours } from '../../utils/formatters';

export const PROJECT_FILTER_DEFAULTS = { q: '', status: '', customer: '', employee: '' };

/** projectId → { recorded, billable } minutes (recorded = closed shifts; billable = approved). */
export function projectHourTotals(attendance, workingHours) {
  const groups = {};
  attendance.forEach((record) => {
    (groups[record.projectId] = groups[record.projectId] ?? []).push(record);
  });
  return Object.fromEntries(
    Object.entries(groups).map(([projectId, records]) => [projectId, { recorded: sumRecorded(records), billable: sumBillable(records, workingHours), count: records.length }]),
  );
}

export function emptyProjectForm({ projectNumber = '', customer = null } = {}) {
  return {
    name: '',
    projectNumber,
    customerId: customer?.id ?? '',
    description: '',
    address: customer?.serviceAddress ?? '',
    startDate: '',
    endDate: '',
    status: 'planned',
    assignedEmployeeIds: [],
    instructions: '',
    targetHours: undefined,
    internalNotes: '',
  };
}

export function projectToForm(project) {
  return {
    name: project.name,
    projectNumber: project.projectNumber,
    customerId: project.customerId,
    description: project.description ?? '',
    address: project.address ?? '',
    startDate: project.startDate ?? '',
    endDate: project.endDate ?? '',
    status: project.status,
    assignedEmployeeIds: [...(project.assignedEmployeeIds ?? [])],
    instructions: project.instructions ?? '',
    targetHours: project.targetHours ?? undefined,
    internalNotes: project.internalNotes ?? '',
  };
}

export function filterProjects(projects, f, { customersById }) {
  const q = f.q.trim().toLowerCase();
  return projects.filter((p) => {
    if (f.status && p.status !== f.status) return false;
    if (f.customer && p.customerId !== f.customer) return false;
    if (f.employee && !p.assignedEmployeeIds.includes(f.employee)) return false;
    if (q) {
      const text = `${p.name} ${p.projectNumber} ${customersById[p.customerId]?.companyName ?? ''}`.toLowerCase();
      if (!text.includes(q)) return false;
    }
    return true;
  });
}

export function projectCsvColumns({ customersById, employeesById }, totals) {
  return [
    { header: 'Project reference', value: (p) => p.projectNumber },
    { header: 'Project', value: (p) => p.name },
    { header: 'Customer', value: (p) => customersById[p.customerId]?.companyName ?? '' },
    { header: 'Work address', value: (p) => p.address },
    { header: 'Assigned employees', value: (p) => p.assignedEmployeeIds.map((id) => employeesById[id]?.fullName).filter(Boolean).join('; ') },
    { header: 'Start date', value: (p) => (p.startDate ? formatDate(p.startDate, 'yyyy-MM-dd') : '') },
    { header: 'End date', value: (p) => (p.endDate ? formatDate(p.endDate, 'yyyy-MM-dd') : '') },
    { header: 'Recorded hours', value: (p) => formatHours(totals[p.id]?.recorded ?? 0) },
    { header: 'Billable hours (approved)', value: (p) => formatHours(totals[p.id]?.billable ?? 0) },
    { header: 'Target hours', value: (p) => p.targetHours ?? '' },
    { header: 'Status', value: (p) => p.status },
  ];
}
