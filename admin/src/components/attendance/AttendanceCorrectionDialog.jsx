import { useEffect, useId, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { ArrowRight } from 'lucide-react';
import clsx from 'clsx';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Callout } from '../common/Callout';
import { FormField, FormGrid, Input, Textarea } from '../common/FormField';
import { SelectField } from '../common/SelectField';
import { useAttendance } from '../../hooks/useAttendance';
import { useCustomers } from '../../hooks/useCustomers';
import { useProjects } from '../../hooks/useProjects';
import { useLookups } from '../../hooks/useLookups';
import { attendanceCorrectionSchema } from '../../utils/validation';
import { validateShiftTimes } from '../../utils/calculations';
import { formatDateTime, fromDateTimeInput, toDateTimeInput } from '../../utils/dateUtils';
import { formatDuration } from '../../utils/formatters';
import { customerOptions, previewMinutes, projectOptionsFor, useAttendanceRules } from './attendanceHelpers';

/** Keeps the original ISO timestamp when the minute-precision input was not changed. */
function resolveTimestamp(input, original) {
  if (!input) return null;
  if (original && toDateTimeInput(original) === input) return original;
  return fromDateTimeInput(input);
}

function toForm(record) {
  return {
    checkInAt: toDateTimeInput(record.checkInAt),
    checkOutAt: toDateTimeInput(record.checkOutAt),
    customerId: record.customerId,
    projectId: record.projectId,
    checkInNote: record.checkInNote ?? '',
    checkOutNote: record.checkOutNote ?? '',
    reason: '',
  };
}

function ChangeRow({ label, before, after }) {
  const changed = before !== after;
  return (
    <div className="grid grid-cols-[6.5rem_1fr] items-start gap-2 py-1.5 text-sm">
      <dt className="text-xs font-medium text-ink-muted">{label}</dt>
      <dd className={clsx('flex min-w-0 flex-wrap items-center gap-1.5', !changed && 'text-ink-secondary')}>
        <span className={clsx(changed && 'text-ink-muted line-through')}>{before || '—'}</span>
        {changed && (
          <>
            <ArrowRight size={13} className="shrink-0 text-ink-muted" aria-label="changes to" />
            <span className="font-medium text-ink">{after || '—'}</span>
          </>
        )}
      </dd>
    </div>
  );
}

/**
 * Correction of times, customer/project and notes with a mandatory reason.
 * Shows the recalculated duration and a before/after summary live.
 */
export function AttendanceCorrectionDialog({ record, open, onClose, onSaved }) {
  const formId = useId();
  const { correctAttendance, getBillingImpact } = useAttendance();
  const { customers } = useCustomers();
  const { projects } = useProjects();
  const { customersById, projectsById, employeesById } = useLookups();
  const rules = useAttendanceRules(60000);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(attendanceCorrectionSchema), defaultValues: record ? toForm(record) : undefined });

  useEffect(() => {
    if (open && record) reset(toForm(record));
    // Reset only when the dialog opens for a record, not on unrelated data refreshes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, record?.id, reset]);

  const values = watch();
  const customerId = values.customerId;
  const projectId = values.projectId;

  // Clear the project when it does not belong to the newly selected customer.
  useEffect(() => {
    if (!projectId) return;
    if (projectsById[projectId]?.customerId !== customerId) setValue('projectId', '', { shouldValidate: false });
  }, [customerId, projectId, projectsById, setValue]);

  const projectOptions = useMemo(() => projectOptionsFor(projects, customerId, record?.projectId), [projects, customerId, record?.projectId]);
  const custOptions = useMemo(() => customerOptions(customers, record?.customerId), [customers, record?.customerId]);
  const impact = record && open ? getBillingImpact(record.id) : null;

  if (!record) return null;

  const newMinutes = previewMinutes(values.checkInAt, values.checkOutAt);
  const liveTimeError =
    values.checkInAt && (values.checkOutAt || !record.checkOutAt)
      ? validateShiftTimes(fromDateTimeInput(values.checkInAt), values.checkOutAt ? fromDateTimeInput(values.checkOutAt) : null, { now: rules.now })
      : null;

  const onSubmit = async (form) => {
    const checkInAt = resolveTimestamp(form.checkInAt, record.checkInAt);
    const checkOutAt = resolveTimestamp(form.checkOutAt, record.checkOutAt);
    if (record.checkOutAt && !checkOutAt) {
      setError('checkOutAt', { message: 'A completed shift cannot be reopened. Enter a check-out time.' });
      return;
    }
    const timeError = validateShiftTimes(checkInAt, checkOutAt);
    if (timeError) {
      setError(checkOutAt && timeError.includes('Check-out') ? 'checkOutAt' : 'checkInAt', { message: timeError });
      return;
    }
    try {
      const result = await correctAttendance(record.id, { ...form, checkInAt, checkOutAt });
      if (result?.affectedInvoices?.length) {
        toast.success('Attendance corrected', {
          description: impact?.finalized
            ? 'The finalized invoice was not changed; an audit note was added to it.'
            : 'The draft invoice containing this record was flagged for recalculation.',
        });
      } else {
        toast.success('Attendance corrected');
      }
      onSaved?.(result);
      onClose();
    } catch (error) {
      if (error.field && ['checkInAt', 'checkOutAt', 'customerId', 'projectId'].includes(error.field)) setError(error.field, { message: error.message });
      else toast.error(error.message);
    }
  };

  const before = {
    checkIn: formatDateTime(record.checkInAt),
    checkOut: record.checkOutAt ? formatDateTime(record.checkOutAt) : 'Open',
    duration: formatDuration(record.recordedDurationMinutes),
    customer: customersById[record.customerId]?.companyName ?? '',
    project: projectsById[record.projectId]?.name ?? '',
  };
  const after = {
    checkIn: values.checkInAt ? formatDateTime(new Date(values.checkInAt)) : '',
    checkOut: values.checkOutAt ? formatDateTime(new Date(values.checkOutAt)) : 'Open',
    duration: formatDuration(newMinutes),
    customer: customersById[customerId]?.companyName ?? '',
    project: projectsById[projectId]?.name ?? '',
  };
  // Unchanged inputs keep the original values so the summary does not show rounding noise.
  if (values.checkInAt === toDateTimeInput(record.checkInAt)) after.checkIn = before.checkIn;
  if (values.checkOutAt === toDateTimeInput(record.checkOutAt) && record.checkOutAt) after.checkOut = before.checkOut;
  if (after.checkIn === before.checkIn && after.checkOut === before.checkOut) after.duration = before.duration;

  return (
    <Modal
      open={open}
      onClose={onClose}
      dismissible={!isSubmitting}
      size="lg"
      title="Correct attendance record"
      description={`${employeesById[record.employeeId]?.fullName ?? 'Employee'} · ${formatDateTime(record.checkInAt)}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={isSubmitting}>
            Save correction
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        {impact && (
          <Callout tone="warning" title={impact.finalized ? 'Record is on a finalized invoice' : 'Record is on a draft invoice'}>
            {impact.message}
          </Callout>
        )}

        <FormGrid>
          <FormField label="Check-in" required error={errors.checkInAt?.message}>
            <Input type="datetime-local" max={toDateTimeInput(rules.now)} {...register('checkInAt')} />
          </FormField>
          <FormField
            label="Check-out"
            required={Boolean(record.checkOutAt)}
            optional={!record.checkOutAt}
            error={errors.checkOutAt?.message}
            hint={!record.checkOutAt ? 'Leave empty to keep the shift open.' : undefined}
          >
            <Input type="datetime-local" min={values.checkInAt || undefined} max={toDateTimeInput(rules.now)} {...register('checkOutAt')} />
          </FormField>
          <FormField label="Customer" required error={errors.customerId?.message}>
            <SelectField placeholder="Select customer" options={custOptions} {...register('customerId')} />
          </FormField>
          <FormField
            label="Project"
            required
            error={errors.projectId?.message}
            hint={customerId && projectOptions.length === 0 ? 'This customer has no projects.' : 'Only projects of the selected customer are listed.'}
          >
            <SelectField placeholder={customerId ? 'Select project' : 'Select a customer first'} options={projectOptions} disabled={!customerId} {...register('projectId')} />
          </FormField>
          <FormField label="Check-in note" optional error={errors.checkInNote?.message}>
            <Textarea rows={2} maxLength={500} {...register('checkInNote')} />
          </FormField>
          <FormField label="Check-out note" optional error={errors.checkOutNote?.message}>
            <Textarea rows={2} maxLength={500} {...register('checkOutNote')} />
          </FormField>
        </FormGrid>

        <div className="rounded-lg border border-line bg-subtle/60 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-sm font-semibold text-ink">Change summary</h3>
            <p className="text-sm text-ink-secondary">
              Recalculated duration:{' '}
              <span className={clsx('tabular font-semibold', liveTimeError ? 'text-danger-ink' : 'text-ink')}>
                {values.checkOutAt ? formatDuration(newMinutes) : 'Open shift'}
              </span>
            </p>
          </div>
          {liveTimeError && <p className="mt-1 text-xs font-medium text-danger-ink">{liveTimeError}</p>}
          <dl className="mt-2 divide-y divide-line">
            <ChangeRow label="Check-in" before={before.checkIn} after={after.checkIn} />
            <ChangeRow label="Check-out" before={before.checkOut} after={after.checkOut} />
            <ChangeRow label="Duration" before={before.duration} after={values.checkOutAt ? after.duration : '—'} />
            <ChangeRow label="Customer" before={before.customer} after={after.customer} />
            <ChangeRow label="Project" before={before.project} after={after.project} />
          </dl>
          {record.billableDurationMinutes !== null && record.billableDurationMinutes !== undefined && (
            <p className="mt-2 text-xs text-ink-muted">
              This record has an adjusted billable duration ({formatDuration(record.billableDurationMinutes)}). Changing the times resets it to the recorded duration; the old
              value stays in the audit history.
            </p>
          )}
        </div>

        <FormField label="Correction reason" required error={errors.reason?.message} hint="Stored in the audit history with your name and the time of the change.">
          <Textarea rows={3} maxLength={500} placeholder="e.g. Employee app was offline; site supervisor confirmed the actual times." {...register('reason')} />
        </FormField>
      </form>
    </Modal>
  );
}
