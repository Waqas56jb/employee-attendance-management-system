import { useEffect, useId } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Callout } from '../common/Callout';
import { FormField, Input, Textarea } from '../common/FormField';
import { DescriptionList } from '../common/DescriptionList';
import { useAttendance } from '../../hooks/useAttendance';
import { useLookups } from '../../hooks/useLookups';
import { closeShiftSchema } from '../../utils/validation';
import { validateShiftTimes } from '../../utils/calculations';
import { formatDateTime, fromDateTimeInput, toDateTimeInput } from '../../utils/dateUtils';
import { formatDuration } from '../../utils/formatters';
import { previewMinutes, useAttendanceRules } from './attendanceHelpers';

/** Suggested check-out: expected day length after check-in, never in the future. */
function suggestCheckout(record, rules) {
  const start = new Date(record.checkInAt).getTime();
  const expected = start + (rules.expectedDailyHours * 60 + rules.defaultBreakMinutes) * 60000;
  return new Date(Math.min(expected, Date.now()));
}

/**
 * Administrative closing of an open shift. Always explicit: the administrator
 * enters the actual check-out time and a reason, which is stored in the audit log.
 */
export function CloseShiftDialog({ record, open, onClose, onClosed }) {
  const formId = useId();
  const { closeOpenShift } = useAttendance();
  const { employeesById, projectsById, customersById } = useLookups();
  const rules = useAttendanceRules();
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(closeShiftSchema), defaultValues: { checkOutAt: '', reason: '' } });

  useEffect(() => {
    if (open && record) reset({ checkOutAt: toDateTimeInput(suggestCheckout(record, rules)), reason: '' });
    // Only reset when the dialog opens for a record, not on every clock tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, record?.id, reset]);

  if (!record) return null;
  const checkOutValue = watch('checkOutAt');
  const minutes = previewMinutes(toDateTimeInput(record.checkInAt), checkOutValue);

  const onSubmit = async (values) => {
    const iso = fromDateTimeInput(values.checkOutAt);
    const timeError = validateShiftTimes(record.checkInAt, iso);
    if (timeError) {
      setError('checkOutAt', { message: timeError });
      return;
    }
    try {
      await closeOpenShift(record.id, { checkOutAt: iso, reason: values.reason });
      toast.success('Shift closed (administrative correction recorded)');
      onClosed?.();
      onClose();
    } catch (error) {
      if (error.field) setError(error.field === 'checkOutAt' ? 'checkOutAt' : 'reason', { message: error.message });
      else toast.error(error.message);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      dismissible={!isSubmitting}
      title="Close shift — administrative correction"
      description="Use this only when an employee forgot to check out. The employee's original check-in is kept."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={isSubmitting}>
            Close shift
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <Callout tone="warning" title="Administrative correction">
          This record will be marked as corrected and the change is written to the audit history with your name, the time and the reason.
        </Callout>
        <div className="rounded-lg border border-line bg-subtle/60 p-3">
          <DescriptionList
            items={[
              { label: 'Employee', value: employeesById[record.employeeId]?.fullName },
              { label: 'Checked in', value: formatDateTime(record.checkInAt) },
              { label: 'Customer', value: customersById[record.customerId]?.companyName },
              { label: 'Project', value: projectsById[record.projectId]?.name },
            ]}
          />
        </div>
        <FormField
          label="Actual check-out time"
          required
          error={errors.checkOutAt?.message}
          hint={minutes ? `Resulting shift duration: ${formatDuration(minutes)}` : 'Must be after check-in and not in the future.'}
        >
          <Input type="datetime-local" min={toDateTimeInput(record.checkInAt)} max={toDateTimeInput(rules.now)} {...register('checkOutAt')} />
        </FormField>
        <FormField label="Correction reason" required error={errors.reason?.message}>
          <Textarea rows={3} maxLength={500} placeholder="e.g. Supervisor confirmed the employee left the site at 15:30." {...register('reason')} />
        </FormField>
      </form>
    </Modal>
  );
}
