import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Callout } from '../common/Callout';
import { FormField, FormGrid, Input, Textarea } from '../common/FormField';
import { SelectField } from '../common/SelectField';
import { useAttendance } from '../../hooks/useAttendance';
import { useCustomers } from '../../hooks/useCustomers';
import { useEmployees } from '../../hooks/useEmployees';
import { useProjects } from '../../hooks/useProjects';
import { validateShiftTimes } from '../../utils/calculations';
import { fromDateTimeInput, toDateTimeInput } from '../../utils/dateUtils';
import { formatDuration } from '../../utils/formatters';
import { customerOptions, manualAttendanceSchema, previewMinutes, projectOptionsFor, useAttendanceRules } from './attendanceHelpers';

const EMPTY = { employeeId: '', customerId: '', projectId: '', checkInAt: '', checkOutAt: '', checkInNote: '', checkOutNote: '', reason: '' };

/**
 * Manual attendance entry (e.g. when the employee app was unavailable).
 * Render inside a Modal; the submit button lives in the modal footer and
 * targets `formId`.
 */
export function AttendanceForm({ formId, defaults, onCreated, onSubmittingChange }) {
  const { createManualAttendance } = useAttendance();
  const { employees } = useEmployees();
  const { customers } = useCustomers();
  const { projects, projectsById } = useProjects();
  const rules = useAttendanceRules(60000);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(manualAttendanceSchema), defaultValues: { ...EMPTY, ...defaults } });

  useEffect(() => {
    onSubmittingChange?.(isSubmitting);
  }, [isSubmitting, onSubmittingChange]);

  const employeeId = watch('employeeId');
  const customerId = watch('customerId');
  const projectId = watch('projectId');
  const checkInAt = watch('checkInAt');
  const checkOutAt = watch('checkOutAt');

  useEffect(() => {
    if (projectId && projectsById[projectId]?.customerId !== customerId) setValue('projectId', '');
  }, [customerId, projectId, projectsById, setValue]);

  // Suggest the customer of the employee's first active assigned project.
  useEffect(() => {
    if (!employeeId || customerId) return;
    const assigned = projects.find((p) => p.status === 'active' && p.assignedEmployeeIds.includes(employeeId));
    if (assigned) {
      setValue('customerId', assigned.customerId);
      setValue('projectId', assigned.id);
    }
    // Only react to the employee changing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  const employeeOptions = useMemo(
    () =>
      employees
        .filter((e) => e.status !== 'archived')
        .sort((a, b) => a.fullName.localeCompare(b.fullName))
        .map((e) => ({ value: e.id, label: `${e.fullName} (${e.employeeNumber})${e.status !== 'active' ? ' · inactive' : ''}` })),
    [employees],
  );
  const custOptions = useMemo(() => customerOptions(customers), [customers]);
  const projOptions = useMemo(() => projectOptionsFor(projects, customerId), [projects, customerId]);
  const minutes = previewMinutes(checkInAt, checkOutAt);

  const onSubmit = async (values) => {
    const inIso = fromDateTimeInput(values.checkInAt);
    const outIso = values.checkOutAt ? fromDateTimeInput(values.checkOutAt) : null;
    const timeError = validateShiftTimes(inIso, outIso);
    if (timeError) {
      setError(outIso && timeError.includes('Check-out') ? 'checkOutAt' : 'checkInAt', { message: timeError });
      return;
    }
    try {
      const record = await createManualAttendance({ ...values, checkInAt: inIso, checkOutAt: outIso });
      toast.success('Manual attendance record added');
      onCreated?.(record);
    } catch (error) {
      if (error.field && error.field in EMPTY) setError(error.field, { message: error.message });
      else toast.error(error.message);
    }
  };

  return (
    <form id={formId} onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <Callout tone="info">
        Attendance is normally recorded by employees in the employee app. Add a manual record only when that was not possible — it is marked as
        &ldquo;Administrator (manual entry)&rdquo; and stored with your reason in the audit history.
      </Callout>
      <FormGrid>
        <FormField label="Employee" required error={errors.employeeId?.message} className="sm:col-span-2">
          <SelectField placeholder="Select employee" options={employeeOptions} {...register('employeeId')} />
        </FormField>
        <FormField label="Customer" required error={errors.customerId?.message}>
          <SelectField placeholder="Select customer" options={custOptions} {...register('customerId')} />
        </FormField>
        <FormField label="Project" required error={errors.projectId?.message} hint={customerId ? undefined : 'Select a customer first.'}>
          <SelectField placeholder={customerId ? 'Select project' : '—'} options={projOptions} disabled={!customerId} {...register('projectId')} />
        </FormField>
        <FormField label="Check-in" required error={errors.checkInAt?.message}>
          <Input type="datetime-local" max={toDateTimeInput(rules.now)} {...register('checkInAt')} />
        </FormField>
        <FormField
          label="Check-out"
          optional
          error={errors.checkOutAt?.message}
          hint={minutes ? `Duration: ${formatDuration(minutes)}` : 'Leave empty to create an open (active) shift.'}
        >
          <Input type="datetime-local" min={checkInAt || undefined} max={toDateTimeInput(rules.now)} {...register('checkOutAt')} />
        </FormField>
        <FormField label="Check-in note" optional error={errors.checkInNote?.message}>
          <Textarea rows={2} maxLength={500} {...register('checkInNote')} />
        </FormField>
        <FormField label="Check-out note" optional error={errors.checkOutNote?.message}>
          <Textarea rows={2} maxLength={500} {...register('checkOutNote')} />
        </FormField>
        <FormField label="Reason for manual entry" required error={errors.reason?.message} className="sm:col-span-2">
          <Textarea rows={3} maxLength={500} placeholder="e.g. Employee's phone was broken; times confirmed by the site supervisor." {...register('reason')} />
        </FormField>
      </FormGrid>
    </form>
  );
}
