import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Ban, Building2, CheckCheck, Clock, Flag, LogOut, MapPin, MessageSquareText, PencilLine, RotateCcw, Wallet } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Card, CardBody, CardHeader } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Avatar } from '../../components/common/Avatar';
import { StatusBadge } from '../../components/common/StatusBadge';
import { DescriptionList } from '../../components/common/DescriptionList';
import { ErrorState } from '../../components/common/ErrorState';
import { Callout } from '../../components/common/Callout';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { FormField, Textarea } from '../../components/common/FormField';
import { AttendanceCorrectionDialog } from '../../components/attendance/AttendanceCorrectionDialog';
import { CloseShiftDialog } from '../../components/attendance/CloseShiftDialog';
import { AuditHistory } from '../../components/attendance/AuditHistory';
import { isBillableAdjusted, liveDuration, SOURCE_LABELS, useAttendanceRules } from '../../components/attendance/attendanceHelpers';
import { useAttendance } from '../../hooks/useAttendance';
import { useBilling } from '../../hooks/useBilling';
import { useLookups } from '../../hooks/useLookups';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { invoiceLabel } from '../../services/invoiceService';
import { displayAttendanceStatus, getBillableMinutes, isShiftOpen } from '../../utils/calculations';
import { formatDate, formatDateTime, toDateKey } from '../../utils/dateUtils';
import { formatDuration, formatHours } from '../../utils/formatters';

function LocationBlock({ label, location }) {
  if (!location) {
    return (
      <div>
        <p className="text-xs font-medium text-ink-muted">{label}</p>
        <p className="mt-1 text-sm text-ink-muted">Not captured</p>
      </div>
    );
  }
  const { latitude, longitude, accuracyMeters, capturedAt } = location;
  const url = `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=17/${latitude}/${longitude}`;
  return (
    <div>
      <p className="text-xs font-medium text-ink-muted">{label}</p>
      <p className="tabular mt-1 text-sm text-ink">
        {latitude.toFixed(5)}, {longitude.toFixed(5)}
      </p>
      <p className="text-xs text-ink-muted">
        {accuracyMeters ? `± ${accuracyMeters} m · ` : ''}
        {formatDateTime(capturedAt)}
      </p>
      <a href={url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline">
        <MapPin size={12} aria-hidden /> Open in OpenStreetMap
        <span className="sr-only">(opens in a new tab)</span>
      </a>
    </div>
  );
}

function BillingState({ record, row, impact, invoicesById }) {
  if (record.invoiceId && invoicesById[record.invoiceId]) {
    const invoice = invoicesById[record.invoiceId];
    return (
      <div className="space-y-1">
        <StatusBadge kind="billing" status="billed" />
        <p className="text-sm text-ink-secondary">
          Billed on{' '}
          <Link to={`/invoices/${invoice.id}`} className="font-medium text-brand-700 hover:underline">
            {invoiceLabel(invoice)}
          </Link>{' '}
          ({formatDate(invoice.issueDate)}). Billing values are frozen.
        </p>
      </div>
    );
  }
  if (impact && !impact.finalized) {
    return (
      <div className="space-y-1">
        <StatusBadge kind="billing" status="in_draft" />
        <p className="text-sm text-ink-secondary">
          Included in draft{' '}
          <Link to={`/invoices/${impact.invoice.id}`} className="font-medium text-brand-700 hover:underline">
            {invoiceLabel(impact.invoice)}
          </Link>
          .
        </p>
      </div>
    );
  }
  if (!row) return <StatusBadge kind="billing" status="invalid" />;
  const status = row.eligible ? 'eligible' : row.code;
  return (
    <div className="space-y-1">
      <StatusBadge kind="billing" status={status} />
      <p className="text-sm text-ink-secondary">{row.eligible ? 'Ready to be invoiced.' : row.reason}</p>
    </div>
  );
}

export default function AttendanceDetailsPage() {
  const { attendanceId } = useParams();
  const { attendanceById, getBillingImpact, approveAttendance, markForReview, cancelAttendance, restoreAttendance } = useAttendance();
  const { getBillingRows } = useBilling();
  const { employeesById, customersById, projectsById, invoicesById } = useLookups();
  const rules = useAttendanceRules(30000);
  const [run] = useAsyncAction();
  const [dialog, setDialog] = useState(null);
  const [approvalNote, setApprovalNote] = useState('');

  const record = attendanceById[attendanceId];
  if (!record) {
    return (
      <ErrorState
        title="Attendance record not found"
        message="The record may have been removed or the link is incorrect."
        backTo="/attendance"
        backLabel="Back to attendance"
      />
    );
  }

  const employee = employeesById[record.employeeId];
  const customer = customersById[record.customerId];
  const project = projectsById[record.projectId];
  const status = displayAttendanceStatus(record, rules);
  const open = isShiftOpen(record);
  const cancelled = record.status === 'cancelled';
  const impact = getBillingImpact(record.id);
  const dateKey = toDateKey(record.checkInAt);
  const billingRow = getBillingRows({ customerId: record.customerId, from: dateKey, to: dateKey }).find((r) => r.record.id === record.id);
  const adjusted = isBillableAdjusted(record);
  const close = () => setDialog(null);

  const actions = (
    <>
      {open && (
        <Button icon={LogOut} onClick={() => setDialog('close')}>
          Close shift
        </Button>
      )}
      {status === 'needs_review' && record.checkOutAt && (
        <Button
          icon={CheckCheck}
          onClick={() => {
            setApprovalNote('');
            setDialog('approve');
          }}
        >
          Approve
        </Button>
      )}
      {!cancelled && (
        <Button variant="secondary" icon={PencilLine} onClick={() => setDialog('correct')}>
          Correct
        </Button>
      )}
      {!cancelled && record.checkOutAt && status !== 'needs_review' && !record.invoiceId && (
        <Button variant="secondary" icon={Flag} onClick={() => setDialog('flag')}>
          Flag for review
        </Button>
      )}
      {!cancelled && (
        <Button
          variant="danger-ghost"
          icon={Ban}
          onClick={() => setDialog('cancel')}
          disabled={Boolean(record.invoiceId)}
          title={record.invoiceId ? 'Billed records cannot be cancelled' : undefined}
        >
          Cancel record
        </Button>
      )}
      {cancelled && (
        <Button variant="secondary" icon={RotateCcw} onClick={() => setDialog('restore')}>
          Restore
        </Button>
      )}
    </>
  );

  return (
    <>
      <PageHeader
        title={`${employee?.fullName ?? 'Attendance'} · ${formatDate(record.checkInAt, 'EEE dd MMM yyyy')}`}
        documentTitle="Attendance record"
        description={`${customer?.companyName ?? 'Unknown customer'} — ${project?.name ?? 'Unknown project'}`}
        breadcrumbs={[{ label: 'Attendance', to: '/attendance' }, { label: 'Record details' }]}
        meta={
          <>
            <StatusBadge kind="attendance" status={status} />
            <span className="text-xs text-ink-muted">Source: {SOURCE_LABELS[record.source] ?? record.source}</span>
            <span className="text-xs text-ink-muted">· Last updated {formatDateTime(record.updatedAt)}{record.updatedBy ? ` by ${record.updatedBy}` : ''}</span>
          </>
        }
        actions={actions}
      />

      <div className="space-y-4">
        {status === 'missing_checkout' && (
          <Callout tone="danger" title="Missing check-out">
            This shift has been open for more than {rules.openShiftAlertHours} hours or since a previous day. Close it with the actual end time once confirmed.
          </Callout>
        )}
        {status === 'needs_review' && (
          <Callout tone="warning" title="Needs review">
            {record.status === 'needs_review'
              ? 'This record was flagged for review and is excluded from billing until approved.'
              : `This shift is longer than ${rules.reviewShiftsOverHours} hours and is excluded from billing until approved.`}
          </Callout>
        )}
        {cancelled && (
          <Callout tone="info" title="Cancelled record">
            Cancelled records are kept for the audit trail and never billed. Restore the record if it was cancelled by mistake.
          </Callout>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <Card>
              <CardHeader icon={Clock} title="Shift" />
              <CardBody>
                <DescriptionList
                  items={[
                    { label: 'Check-in', value: formatDateTime(record.checkInAt) },
                    { label: 'Check-out', value: record.checkOutAt ? formatDateTime(record.checkOutAt) : <span className="text-info-ink">Still checked in</span> },
                    {
                      label: open ? 'Elapsed so far' : 'Recorded duration',
                      value: (
                        <span className="tabular">
                          {formatDuration(liveDuration(record, rules.now))}
                          {!open && record.recordedDurationMinutes ? <span className="text-ink-muted"> ({formatHours(record.recordedDurationMinutes)} h)</span> : null}
                        </span>
                      ),
                    },
                    {
                      label: 'Billable duration',
                      value: open ? (
                        '—'
                      ) : adjusted ? (
                        <span className="tabular">
                          {formatDuration(getBillableMinutes(record))} <span className="text-xs text-warning-ink">(adjusted from {formatDuration(record.recordedDurationMinutes)})</span>
                        </span>
                      ) : (
                        <span className="tabular">Same as recorded</span>
                      ),
                    },
                    { label: 'Record status', value: <StatusBadge kind="attendance" status={status} /> },
                    { label: 'Source', value: SOURCE_LABELS[record.source] ?? record.source },
                    { label: 'Reviewed', value: record.reviewedAt ? `${formatDateTime(record.reviewedAt)} by ${record.reviewedBy ?? '—'}` : 'Not yet reviewed' },
                    { label: 'Record ID', value: <span className="font-mono text-xs">{record.id}</span> },
                  ]}
                />
              </CardBody>
            </Card>

            <Card>
              <CardHeader icon={MessageSquareText} title="Work notes" />
              <CardBody>
                <DescriptionList
                  items={[
                    { label: 'Check-in note', value: record.checkInNote || <span className="text-ink-muted">No note</span>, span: true },
                    { label: 'Check-out note', value: record.checkOutNote || <span className="text-ink-muted">No note</span>, span: true },
                  ]}
                />
              </CardBody>
            </Card>

            <AuditHistory record={record} />
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader title="Employee" />
              <CardBody>
                {employee ? (
                  <div className="flex items-start gap-3">
                    <Avatar name={employee.fullName} size="md" />
                    <div className="min-w-0">
                      <Link to={`/employees/${employee.id}`} className="font-medium text-ink hover:text-brand-700 hover:underline">
                        {employee.fullName}
                      </Link>
                      <p className="text-xs text-ink-muted">
                        {employee.employeeNumber} · {employee.jobTitle}
                      </p>
                      <p className="truncate text-xs text-ink-muted">{employee.email}</p>
                      <div className="mt-1.5">
                        <StatusBadge kind="employee" status={employee.status} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-ink-muted">Employee no longer exists.</p>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader icon={Building2} title="Customer & project" />
              <CardBody>
                <DescriptionList
                  columns={1}
                  items={[
                    {
                      label: 'Customer',
                      value: customer ? (
                        <Link to={`/customers/${customer.id}`} className="font-medium text-brand-700 hover:underline">
                          {customer.companyName}
                        </Link>
                      ) : (
                        'Unknown'
                      ),
                    },
                    {
                      label: 'Project',
                      value: project ? (
                        <Link to={`/projects/${project.id}`} className="font-medium text-brand-700 hover:underline">
                          {project.name} ({project.projectNumber})
                        </Link>
                      ) : (
                        'Unknown'
                      ),
                    },
                    { label: 'Work address', value: project?.address },
                  ]}
                />
              </CardBody>
            </Card>

            <Card>
              <CardHeader icon={Wallet} title="Billing" />
              <CardBody className="space-y-3">
                <BillingState record={record} row={billingRow} impact={impact} invoicesById={invoicesById} />
                {impact?.finalized && record.invoiceId !== impact.invoice.id && <p className="text-xs text-ink-muted">{impact.message}</p>}
              </CardBody>
            </Card>

            <Card>
              <CardHeader icon={MapPin} title="Captured location" />
              <CardBody className="space-y-4">
                <LocationBlock label="At check-in" location={record.checkInLocation} />
                {record.checkOutAt && <LocationBlock label="At check-out" location={record.checkOutLocation} />}
                <p className="text-xs text-ink-muted">Location is captured by the employee app only when enabled in working-hours settings and permitted by the employee.</p>
              </CardBody>
            </Card>
          </div>
        </div>
      </div>

      <AttendanceCorrectionDialog record={record} open={dialog === 'correct'} onClose={close} />
      <CloseShiftDialog record={open ? record : null} open={dialog === 'close'} onClose={close} />

      <ConfirmDialog
        open={dialog === 'approve'}
        onClose={close}
        tone="warning"
        title="Approve attendance record"
        confirmLabel="Approve"
        message={`Approve this ${formatDuration(record.recordedDurationMinutes)} shift. Approved records become eligible for billing.`}
        onConfirm={() => run(() => approveAttendance(record.id, approvalNote), { success: 'Attendance approved', rethrow: true })}
      >
        <FormField label="Approval note" optional hint="Saved in the audit history.">
          <Textarea rows={2} maxLength={500} value={approvalNote} onChange={(e) => setApprovalNote(e.target.value)} />
        </FormField>
      </ConfirmDialog>

      <ConfirmDialog
        open={dialog === 'flag'}
        onClose={close}
        tone="warning"
        title="Flag for review"
        confirmLabel="Flag for review"
        requireReason
        message="The record is excluded from billing until an administrator approves it."
        onConfirm={(reason) => run(() => markForReview(record.id, reason), { success: 'Record flagged for review', rethrow: true })}
      />

      <ConfirmDialog
        open={dialog === 'cancel'}
        onClose={close}
        title="Cancel attendance record"
        confirmLabel="Cancel record"
        requireReason
        message="Use this for duplicates or invalid records. The record is kept for the audit trail but never billed. You can restore it later."
        onConfirm={(reason) => run(() => cancelAttendance(record.id, reason), { success: 'Record cancelled', rethrow: true })}
      >
        {impact && !impact.finalized && <Callout tone="warning">{impact.message}</Callout>}
      </ConfirmDialog>

      <ConfirmDialog
        open={dialog === 'restore'}
        onClose={close}
        tone="warning"
        title="Restore attendance record"
        confirmLabel="Restore"
        requireReason
        message={record.checkOutAt ? 'The restored record will need review before it can be billed.' : 'The shift will be restored as an open shift.'}
        onConfirm={(reason) => run(() => restoreAttendance(record.id, reason), { success: 'Record restored', rethrow: true })}
      />
    </>
  );
}
