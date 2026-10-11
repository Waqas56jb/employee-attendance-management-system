import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, ArrowRight, Square } from 'lucide-react';
import { toast } from 'sonner';
import { useAssignments } from '../../hooks/useAssignments';
import { useAttendance } from '../../hooks/useAttendance';
import { useFormatters } from '../../hooks/useFormatters';
import { useGeolocation } from '../../hooks/useGeolocation';
import { useNow } from '../../hooks/useNow';
import { config } from '../../services/config';
import { getErrorMessage } from '../../services/errors';
import { elapsedMs, minutesBetween } from '../../utils/dateUtils';
import { formatDayLabel, formatDuration, formatElapsed } from '../../utils/formatters';
import { checkOutSchema } from '../../utils/validation';
import { Alert } from '../common/Alert';
import { Button } from '../common/Button';
import { FormField } from '../common/FormField';
import { Modal } from '../common/Modal';
import { LocationCapture } from './LocationCapture';

/** Check-out: review the active shift, add an optional note, then confirm. */
export function CheckOutDialog({ open, onClose }) {
  const { activeShift, checkOut, submitting } = useAttendance();
  const { projectsById, customersById } = useAssignments();
  const fmt = useFormatters();
  const geo = useGeolocation();
  const now = useNow(1000, open && Boolean(activeShift));
  const [confirming, setConfirming] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const {
    register,
    watch,
    reset,
    handleSubmit,
    trigger,
    formState: { errors },
  } = useForm({ resolver: zodResolver(checkOutSchema), defaultValues: { note: '' } });
  const note = watch('note') ?? '';

  useEffect(() => {
    if (!open) return;
    reset({ note: '' });
    setConfirming(false);
    setSubmitError('');
    geo.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const isSubmitting = submitting === 'check-out';
  const project = activeShift ? projectsById[activeShift.projectId] : null;
  const customer = activeShift ? customersById[activeShift.customerId] : null;
  const elapsed = activeShift ? elapsedMs(activeShift.checkInAt, now) : 0;
  const locationBlocked = config.requireLocation && geo.status !== 'captured';

  const toConfirm = async () => {
    if (!(await trigger('note'))) return;
    if (locationBlocked) {
      setSubmitError('A captured location is required before you can check out.');
      return;
    }
    if (geo.status === 'requesting') {
      setSubmitError('Please wait until the location request finishes.');
      return;
    }
    setSubmitError('');
    setConfirming(true);
  };

  const onConfirm = handleSubmit(async ({ note: completionNote }) => {
    if (submitting) return;
    setSubmitError('');
    try {
      const record = await checkOut({ note: completionNote, location: geo.status === 'captured' ? geo.location : null });
      toast.success('Shift completed', {
        description: `${formatDuration(record.durationMinutes)} recorded for ${projectsById[record.projectId]?.name ?? 'your project'}.`,
      });
      onClose(record);
    } catch (error) {
      const message = getErrorMessage(error, 'Your shift could not be ended. Please try again.');
      setSubmitError(message);
      toast.error('Check-out failed', { description: message });
    }
  });

  const footer = !activeShift ? (
    <Button variant="secondary" onClick={() => onClose()}>
      Close
    </Button>
  ) : confirming ? (
    <>
      <Button variant="secondary" leftIcon={ArrowLeft} onClick={() => setConfirming(false)} disabled={isSubmitting}>
        Back
      </Button>
      <Button variant="danger" leftIcon={Square} onClick={onConfirm} loading={isSubmitting}>
        {isSubmitting ? 'Ending shift…' : 'Yes, end my shift'}
      </Button>
    </>
  ) : (
    <>
      <Button variant="secondary" onClick={() => onClose()}>
        Keep working
      </Button>
      <Button rightIcon={ArrowRight} onClick={toConfirm}>
        Continue to check out
      </Button>
    </>
  );

  return (
    <Modal
      open={open}
      onClose={() => onClose()}
      title="Check out"
      description="End your current shift and record your working time."
      icon={Square}
      size="md"
      dismissible={!isSubmitting}
      footer={footer}
    >
      {!activeShift ? (
        <Alert tone="info" title="No active shift">
          You are not checked in, so there is nothing to check out from.
        </Alert>
      ) : (
        <form onSubmit={(e) => e.preventDefault()} noValidate className="space-y-5">
          <div className="rounded-xl border border-line bg-canvas p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{project?.name ?? 'Project'}</p>
                <p className="truncate text-sm text-ink-muted">{customer?.companyName ?? 'Customer'}</p>
              </div>
              <div className="text-right">
                <p className="text-2xs font-medium uppercase tracking-wide text-ink-muted">Elapsed</p>
                <p className="tabular font-mono text-xl font-semibold text-ink" aria-live="off">
                  {formatElapsed(elapsed)}
                </p>
              </div>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-line pt-3 text-sm">
              <div>
                <dt className="text-xs text-ink-muted">Checked in</dt>
                <dd className="font-medium text-ink">
                  {formatDayLabel(activeShift.checkInAt)}, {fmt.time(activeShift.checkInAt)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">{confirming ? 'Check-out time' : 'Current time'}</dt>
                <dd className="tabular font-medium text-ink">{fmt.time(now)}</dd>
              </div>
            </dl>
          </div>

          {confirming ? (
            <Alert tone="warning" title="End this shift now?">
              Your check-out will be recorded at the moment you confirm, for a total of about{' '}
              <strong>{formatDuration(minutesBetween(activeShift.checkInAt, now))}</strong>. Completed shifts cannot be edited in this app.
            </Alert>
          ) : (
            <>
              <LocationCapture geo={geo} />
              <FormField
                id="checkout-note"
                label="Completion note"
                optional
                hint={`${note.length}/280 — summarize what you completed.`}
                error={errors.note?.message}
              >
                <textarea
                  id="checkout-note"
                  rows={3}
                  maxLength={280}
                  className="input resize-none"
                  placeholder="e.g. Installed 6 cameras; cabling in aisle 7 remains."
                  aria-invalid={errors.note ? true : undefined}
                  {...register('note')}
                />
              </FormField>
            </>
          )}

          {submitError && (
            <Alert tone="danger" live>
              {submitError}
            </Alert>
          )}
        </form>
      )}
    </Modal>
  );
}

export default CheckOutDialog;
