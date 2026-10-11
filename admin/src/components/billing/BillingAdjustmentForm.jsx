import { useId } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Save } from 'lucide-react';
import clsx from 'clsx';
import { billableAdjustmentSchema } from '../../utils/validation';
import { calculateLineAmount, hoursToMinutes, minutesToHours } from '../../utils/calculations';
import { formatMoney } from '../../utils/currency';
import { formatDate, formatTime } from '../../utils/dateUtils';
import { formatDuration, formatHours } from '../../utils/formatters';
import { useAttendance } from '../../hooks/useAttendance';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { FormField, FormGrid, Input, Textarea } from '../common/FormField';
import { Callout } from '../common/Callout';
import { AdjustmentHistory } from './AdjustmentHistory';

function PreviewCell({ label, children, emphasis }) {
  return (
    <div>
      <dt className="text-2xs font-medium uppercase tracking-wide text-ink-muted">{label}</dt>
      <dd className={clsx('tabular mt-0.5 text-sm', emphasis ? 'font-semibold text-ink' : 'text-ink-secondary')}>{children}</dd>
    </div>
  );
}

/**
 * Adjusts the billable time of one attendance record. The recorded duration
 * never changes; the adjustment and its reason are kept in the audit history.
 */
export function BillingAdjustmentForm({ open, onClose, row, currency, employeeName, projectName }) {
  const formId = useId();
  const { adjustBillableMinutes } = useAttendance();
  const [run] = useAsyncAction();
  const { record } = row;

  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(billableAdjustmentSchema),
    defaultValues: { billableHours: minutesToHours(row.billableMinutes), reason: '' },
  });

  const rawHours = watch('billableHours');
  const parsed = Number(String(rawHours ?? '').replace(',', '.'));
  const validHours = rawHours !== '' && Number.isFinite(parsed) && parsed >= 0 && parsed <= 24;
  const newMinutes = validHours ? hoursToMinutes(parsed) : null;
  const newHours = newMinutes === null ? null : minutesToHours(newMinutes);
  const newAmount = row.rate && newHours !== null ? calculateLineAmount(newHours, row.rate.amount) : null;
  const difference = newAmount === null ? null : newAmount - row.amount;

  const onSubmit = async (values) => {
    try {
      await run(() => adjustBillableMinutes(record.id, hoursToMinutes(values.billableHours), values.reason), {
        success: 'Billable hours updated',
        rethrow: true,
      });
      onClose();
    } catch (error) {
      if (error?.field) setError(error.field, { message: error.message });
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      dismissible={!isSubmitting}
      size="lg"
      title="Adjust billable hours"
      description={`${employeeName} · ${projectName} · ${formatDate(record.checkInAt)}, ${formatTime(record.checkInAt)}–${record.checkOutAt ? formatTime(record.checkOutAt) : '…'}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form={formId} icon={Save} loading={isSubmitting}>
            Save adjustment
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        <Callout tone="info">
          The recorded attendance time ({formatDuration(row.recordedMinutes)}) stays unchanged. Only the hours charged to the customer change, and the
          adjustment is logged with your reason.
        </Callout>
        {row.code === 'in_draft' && <Callout tone="warning">This record is on a draft invoice. The draft will be flagged for recalculation.</Callout>}

        <FormGrid>
          <FormField label="New billable hours" required error={errors.billableHours?.message} hint="Decimal hours, e.g. 7.5 = 7h 30m. Enter the recorded value to undo an adjustment.">
            <Input {...register('billableHours')} type="number" inputMode="decimal" step="0.01" min="0" max="24" suffix="h" data-autofocus />
          </FormField>
          <FormField label="Reason" required error={errors.reason?.message} className="sm:col-span-2">
            <Textarea {...register('reason')} rows={2} maxLength={500} placeholder="e.g. Agreed with customer to deduct an extended break" />
          </FormField>
        </FormGrid>

        <section aria-label="Adjustment preview" className="rounded-lg border border-line bg-subtle px-4 py-3">
          <h3 className="mb-2 text-sm font-semibold text-ink">Preview</h3>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
            <PreviewCell label="Recorded">{formatHours(row.recordedMinutes, { suffix: true })}</PreviewCell>
            <PreviewCell label="Billable now">{formatHours(row.billableMinutes, { suffix: true })}</PreviewCell>
            <PreviewCell label="Adjusted" emphasis>
              {newMinutes === null ? '—' : formatHours(newMinutes, { suffix: true })}
            </PreviewCell>
            <PreviewCell label="Amount effect" emphasis>
              {!row.rate ? (
                <span className="text-warning-ink">No rate</span>
              ) : difference === null ? (
                '—'
              ) : (
                <span className={clsx(difference > 0 && 'text-success-ink', difference < 0 && 'text-danger-ink')}>
                  {difference > 0 ? '+' : ''}
                  {formatMoney(difference, currency)}
                </span>
              )}
            </PreviewCell>
          </dl>
          {row.rate && newAmount !== null && (
            <p className="mt-2 text-xs text-ink-muted">
              Line total {formatMoney(row.amount, currency)} → {formatMoney(newAmount, currency)} at {formatMoney(row.rate.amount, row.rate.currency)}/h.
            </p>
          )}
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold text-ink">Adjustment history</h3>
          <AdjustmentHistory record={record} />
        </section>
      </form>
    </Modal>
  );
}
