import { useCallback, useId, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Plus } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { FilterBar } from '../../components/common/FilterBar';
import { ExportButton } from '../../components/common/ExportButton';
import { EmptyState } from '../../components/common/EmptyState';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { FormField, Textarea } from '../../components/common/FormField';
import { AttendanceSummaryCards } from '../../components/attendance/AttendanceSummaryCards';
import { ActiveShiftsPanel } from '../../components/attendance/ActiveShiftsPanel';
import { AttendanceFilters } from '../../components/attendance/AttendanceFilters';
import { AttendanceTable } from '../../components/attendance/AttendanceTable';
import { AttendanceCorrectionDialog } from '../../components/attendance/AttendanceCorrectionDialog';
import { AttendanceForm } from '../../components/attendance/AttendanceForm';
import { ATTENDANCE_FILTER_DEFAULTS, attendanceCsvColumns, filterAttendance, useAttendanceRules } from '../../components/attendance/attendanceHelpers';
import { useAttendance } from '../../hooks/useAttendance';
import { useEmployees } from '../../hooks/useEmployees';
import { useCustomers } from '../../hooks/useCustomers';
import { useProjects } from '../../hooks/useProjects';
import { useLookups } from '../../hooks/useLookups';
import { useQueryState } from '../../hooks/useQueryState';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { formatDateTime } from '../../utils/dateUtils';
import { formatDuration } from '../../utils/formatters';

export default function AttendancePage() {
  const navigate = useNavigate();
  const { attendance, approveAttendance } = useAttendance();
  const { employees } = useEmployees();
  const { customers } = useCustomers();
  const { projects } = useProjects();
  const lookups = useLookups();
  const rules = useAttendanceRules(30000);
  const [filters, setFilter, resetFilters, isFiltered] = useQueryState(ATTENDANCE_FILTER_DEFAULTS);
  const [run] = useAsyncAction();

  const [correcting, setCorrecting] = useState(null);
  const [approving, setApproving] = useState(null);
  const [approvalNote, setApprovalNote] = useState('');
  const [manualOpen, setManualOpen] = useState(false);
  const [manualBusy, setManualBusy] = useState(false);
  const manualFormId = useId();

  const rows = useMemo(() => filterAttendance(attendance, filters, { ...lookups, rules }), [attendance, filters, lookups, rules]);
  const csvColumns = useMemo(() => attendanceCsvColumns(lookups, rules), [lookups, rules]);

  const onCorrect = useCallback((record) => setCorrecting(record), []);
  const onApprove = useCallback((record) => {
    setApprovalNote('');
    setApproving(record);
  }, []);

  return (
    <>
      <PageHeader
        title="Attendance"
        description="Check-ins and check-outs from the employee app. Review, correct and approve records before they are billed."
        breadcrumbs={[{ label: 'Overview', to: '/dashboard' }, { label: 'Attendance' }]}
        actions={
          <Button icon={Plus} onClick={() => setManualOpen(true)}>
            Add manual record
          </Button>
        }
      />

      <div className="space-y-6">
        <AttendanceSummaryCards records={attendance} range={{ from: filters.from, to: filters.to }} rules={rules} />

        <ActiveShiftsPanel records={attendance} />

        <Card>
          <FilterBar
            count={rows.length}
            noun="record"
            isFiltered={isFiltered}
            onReset={resetFilters}
            actions={<ExportButton rows={rows} columns={csvColumns} filename="attendance" />}
          >
            <AttendanceFilters filters={filters} setFilter={setFilter} employees={employees} customers={customers} projects={projects} />
          </FilterBar>
          <AttendanceTable
            rows={rows}
            lookups={lookups}
            rules={rules}
            onCorrect={onCorrect}
            onApprove={onApprove}
            pageSize={15}
            emptyState={
              <EmptyState
                icon={Clock}
                title={isFiltered ? 'No records match these filters' : 'No attendance records yet'}
                description={isFiltered ? 'Try a different period, status or customer.' : 'Records appear here as soon as employees check in from the employee app.'}
                action={
                  isFiltered ? (
                    <Button variant="secondary" onClick={resetFilters}>
                      Reset filters
                    </Button>
                  ) : null
                }
              />
            }
          />
        </Card>
      </div>

      <AttendanceCorrectionDialog record={correcting} open={Boolean(correcting)} onClose={() => setCorrecting(null)} />

      <ConfirmDialog
        open={Boolean(approving)}
        onClose={() => setApproving(null)}
        tone="warning"
        title="Approve attendance record"
        confirmLabel="Approve"
        message={
          approving && (
            <>
              Approve <strong className="text-ink">{lookups.employeesById[approving.employeeId]?.fullName}</strong>&rsquo;s shift on {formatDateTime(approving.checkInAt)} (
              {formatDuration(approving.recordedDurationMinutes)}). Approved records become eligible for billing.
            </>
          )
        }
        onConfirm={() => run(() => approveAttendance(approving.id, approvalNote), { success: 'Attendance approved', rethrow: true })}
      >
        <FormField label="Approval note" optional hint="Saved in the audit history.">
          <Textarea rows={2} maxLength={500} value={approvalNote} onChange={(e) => setApprovalNote(e.target.value)} placeholder="e.g. Overtime confirmed by the customer." />
        </FormField>
      </ConfirmDialog>

      <Modal
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        dismissible={!manualBusy}
        size="lg"
        title="Add manual attendance record"
        description="For shifts that could not be recorded in the employee app."
        footer={
          <>
            <Button variant="secondary" onClick={() => setManualOpen(false)} disabled={manualBusy}>
              Cancel
            </Button>
            <Button type="submit" form={manualFormId} loading={manualBusy}>
              Add record
            </Button>
          </>
        }
      >
        <AttendanceForm
          formId={manualFormId}
          onSubmittingChange={setManualBusy}
          onCreated={(record) => {
            setManualOpen(false);
            navigate(`/attendance/${record.id}`);
          }}
        />
      </Modal>
    </>
  );
}
