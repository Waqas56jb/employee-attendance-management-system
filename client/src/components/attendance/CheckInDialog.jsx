import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, ArrowRight, Building2, CalendarDays, Clock, FolderKanban, MapPin, Play, StickyNote } from 'lucide-react';
import { toast } from 'sonner';
import { useAssignments } from '../../hooks/useAssignments';
import { useAttendance } from '../../hooks/useAttendance';
import { useFormatters } from '../../hooks/useFormatters';
import { useGeolocation } from '../../hooks/useGeolocation';
import { useNow } from '../../hooks/useNow';
import { config } from '../../services/config';
import { getErrorMessage } from '../../services/errors';
import { PROJECT_STATUS } from '../../services/projectService';
import { cn } from '../../utils/cn';
import { formatLongDate } from '../../utils/formatters';
import { createCheckInSchema } from '../../utils/validation';
import { Alert } from '../common/Alert';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { FormField } from '../common/FormField';
import { Modal } from '../common/Modal';
import { LocationCapture } from './LocationCapture';
import { StepIndicator } from './StepIndicator';

const STEPS = ['Assignment', 'Details', 'Confirm'];

function OptionCard({ name, value, checked, disabled, onChange, title, subtitle, meta }) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors duration-150',
        checked ? 'border-brand-500 bg-brand-50/60 ring-1 ring-brand-500' : 'border-line hover:border-line-strong hover:bg-canvas',
        disabled && 'cursor-not-allowed opacity-55 hover:border-line hover:bg-transparent',
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={() => onChange(value)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-[rgb(var(--brand-600))]"
      />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-ink">{title}</span>
        {subtitle && <span className="mt-0.5 block text-xs text-ink-muted">{subtitle}</span>}
      </span>
      {meta && <span className="shrink-0">{meta}</span>}
    </label>
  );
}

function SummaryRow({ icon: Icon, label, children }) {
  return (
    <div className="flex gap-3 py-3">
      <Icon size={16} className="mt-0.5 shrink-0 text-ink-muted" aria-hidden="true" />
      <dt className="w-24 shrink-0 text-sm text-ink-muted">{label}</dt>
      <dd className="min-w-0 flex-1 text-sm font-medium text-ink">{children}</dd>
    </div>
  );
}

/**
 * Multi-step check-in: choose customer → project → details (time, location,
 * note) → confirm. The shift only starts when the employee confirms.
 */
export function CheckInDialog({ open, onClose, defaultProjectId }) {
  const { projects, customers, projectsById, customersById, activeProjects } = useAssignments();
  const { checkIn, activeShift, submitting } = useAttendance();
  const fmt = useFormatters();
  const geo = useGeolocation();
  const now = useNow(1000, open);
  const [step, setStep] = useState(0);
  const [submitError, setSubmitError] = useState('');

  const schema = useMemo(() => createCheckInSchema(activeProjects), [activeProjects]);
  const {
    register,
    watch,
    setValue,
    trigger,
    reset,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { customerId: '', projectId: '', note: '' } });

  const customerId = watch('customerId');
  const projectId = watch('projectId');
  const note = watch('note') ?? '';

  // Reset the flow each time the dialog opens (optionally pre-selecting a project).
  useEffect(() => {
    if (!open) return;
    const preset = defaultProjectId ? projectsById[defaultProjectId] : null;
    const usable = preset && preset.status === 'active';
    reset({ customerId: usable ? preset.customerId : '', projectId: usable ? preset.id : '', note: '' });
    setStep(usable ? 1 : 0);
    setSubmitError('');
    geo.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultProjectId]);

  const customerOptions = useMemo(
    () =>
      customers
        .map((c) => ({ ...c, activeCount: activeProjects.filter((p) => p.customerId === c.id).length }))
        .sort((a, b) => b.activeCount - a.activeCount || a.companyName.localeCompare(b.companyName)),
    [customers, activeProjects],
  );

  const customerProjects = useMemo(
    () =>
      projects
        .filter((p) => p.customerId === customerId)
        .sort((a, b) => (a.status === 'active' ? -1 : 1) - (b.status === 'active' ? -1 : 1)),
    [projects, customerId],
  );

  const selectCustomer = (id) => {
    setValue('customerId', id, { shouldValidate: true });
    const current = projectsById[projectId];
    if (!current || current.customerId !== id) {
      const onlyActive = activeProjects.filter((p) => p.customerId === id);
      setValue('projectId', onlyActive.length === 1 ? onlyActive[0].id : '', { shouldValidate: false });
    }
    setSubmitError('');
  };

  const locationBlocked = config.requireLocation && geo.status !== 'captured';

  const next = async () => {
    if (step === 0) {
      const ok = await trigger(['customerId', 'projectId']);
      if (ok) setStep(1);
    } else if (step === 1) {
      const ok = await trigger('note');
      if (!ok) return;
      if (locationBlocked) {
        setSubmitError('A captured location is required before you can check in.');
        return;
      }
      if (geo.status === 'requesting') {
        setSubmitError('Please wait until the location request finishes.');
        return;
      }
      setSubmitError('');
      setStep(2);
    }
  };

  const onConfirm = handleSubmit(async (values) => {
    if (submitting) return;
    setSubmitError('');
    try {
      const record = await checkIn({ ...values, location: geo.status === 'captured' ? geo.location : null });
      toast.success('Shift started', {
        description: `${projectsById[record.projectId]?.name} · checked in at ${fmt.time(record.checkInAt)}`,
      });
      onClose(record);
    } catch (error) {
      const message = getErrorMessage(error, 'Your shift could not be started. Please try again.');
      setSubmitError(message);
      toast.error('Check-in failed', { description: message });
    }
  });

  const customer = customersById[customerId];
  const project = projectsById[projectId];
  const isSubmitting = submitting === 'check-in';

  const footer = activeShift ? (
    <Button variant="secondary" onClick={() => onClose()}>
      Close
    </Button>
  ) : (
    <>
      {step > 0 ? (
        <Button variant="secondary" leftIcon={ArrowLeft} onClick={() => setStep((s) => s - 1)} disabled={isSubmitting}>
          Back
        </Button>
      ) : (
        <Button variant="secondary" onClick={() => onClose()}>
          Cancel
        </Button>
      )}
      {step < 2 ? (
        <Button rightIcon={ArrowRight} onClick={next} disabled={step === 0 && !activeProjects.length}>
          Continue
        </Button>
      ) : (
        <Button variant="success" leftIcon={Play} onClick={onConfirm} loading={isSubmitting}>
          {isSubmitting ? 'Starting shift…' : 'Confirm & start shift'}
        </Button>
      )}
    </>
  );

  return (
    <Modal
      open={open}
      onClose={() => onClose()}
      title="Check in"
      description="Start recording your working time for a customer project."
      icon={Play}
      size="lg"
      dismissible={!isSubmitting}
      footer={footer}
    >
      {activeShift ? (
        <Alert tone="warning" title="You already have an active shift">
          Started at {fmt.time(activeShift.checkInAt)} on {projectsById[activeShift.projectId]?.name ?? 'a project'}. Check out
          before starting a new shift.
        </Alert>
      ) : (
        <form onSubmit={(e) => e.preventDefault()} noValidate>
          <StepIndicator steps={STEPS} current={step} />

          {step === 0 && (
            <div className="space-y-6">
              {!activeProjects.length && (
                <Alert tone="warning" title="No active projects">
                  You have no projects that are currently active. Contact your supervisor if you expected to work today.
                </Alert>
              )}
              <fieldset>
                <legend className="label">
                  Customer <span className="text-danger-ink" aria-hidden="true">*</span>
                </legend>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="radiogroup" aria-describedby={errors.customerId ? 'customer-error' : undefined}>
                  {customerOptions.map((c) => (
                    <OptionCard
                      key={c.id}
                      name="customer"
                      value={c.id}
                      checked={customerId === c.id}
                      disabled={!c.activeCount}
                      onChange={selectCustomer}
                      title={c.companyName}
                      subtitle={c.activeCount ? `${c.activeCount} active project${c.activeCount > 1 ? 's' : ''}` : 'No active projects'}
                    />
                  ))}
                </div>
                {errors.customerId && (
                  <p id="customer-error" role="alert" className="mt-1.5 text-xs font-medium text-danger-ink">
                    {errors.customerId.message}
                  </p>
                )}
              </fieldset>

              <fieldset disabled={!customerId}>
                <legend className="label">
                  Project <span className="text-danger-ink" aria-hidden="true">*</span>
                </legend>
                {!customerId ? (
                  <p className="rounded-xl border border-dashed border-line-strong px-4 py-5 text-center text-sm text-ink-muted">
                    Select a customer first to see its projects.
                  </p>
                ) : (
                  <div className="space-y-2" role="radiogroup" aria-describedby={errors.projectId ? 'project-error' : undefined}>
                    {customerProjects.map((p) => (
                      <OptionCard
                        key={p.id}
                        name="project"
                        value={p.id}
                        checked={projectId === p.id}
                        disabled={p.status !== 'active'}
                        onChange={(id) => setValue('projectId', id, { shouldValidate: true })}
                        title={p.name}
                        subtitle={p.location}
                        meta={
                          p.status !== 'active' && (
                            <Badge tone={PROJECT_STATUS[p.status]?.tone}>{PROJECT_STATUS[p.status]?.label}</Badge>
                          )
                        }
                      />
                    ))}
                  </div>
                )}
                {errors.projectId && (
                  <p id="project-error" role="alert" className="mt-1.5 text-xs font-medium text-danger-ink">
                    {errors.projectId.message}
                  </p>
                )}
              </fieldset>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-canvas px-4 py-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Current local time</p>
                  <p className="tabular mt-0.5 font-mono text-xl font-semibold text-ink">{fmt.time(now, true)}</p>
                </div>
                <p className="text-right text-sm text-ink-secondary">{formatLongDate(now)}</p>
              </div>

              <div className="rounded-xl border border-line px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Selected</p>
                <p className="mt-1 text-sm font-medium text-ink">{project?.name}</p>
                <p className="text-sm text-ink-muted">{customer?.companyName}</p>
              </div>

              <LocationCapture geo={geo} />

              <FormField id="checkin-note" label="Work note" optional hint={`${note.length}/280 — e.g. the task you are starting.`} error={errors.note?.message}>
                <textarea
                  id="checkin-note"
                  rows={3}
                  maxLength={280}
                  className="input resize-none"
                  placeholder="What are you working on today?"
                  aria-invalid={errors.note ? true : undefined}
                  {...register('note')}
                />
              </FormField>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-ink-secondary">Review the details below. Your check-in time is recorded when you confirm.</p>
              <dl className="divide-y divide-line rounded-xl border border-line px-4">
                <SummaryRow icon={Building2} label="Customer">
                  {customer?.companyName}
                </SummaryRow>
                <SummaryRow icon={FolderKanban} label="Project">
                  {project?.name}
                </SummaryRow>
                <SummaryRow icon={MapPin} label="Site">
                  {project?.location}
                </SummaryRow>
                <SummaryRow icon={CalendarDays} label="Date">
                  {formatLongDate(now)}
                </SummaryRow>
                <SummaryRow icon={Clock} label="Start time">
                  <span className="tabular">{fmt.time(now)}</span>
                  <span className="ml-1.5 text-xs font-normal text-ink-muted">(at confirmation)</span>
                </SummaryRow>
                <SummaryRow icon={MapPin} label="Location">
                  {geo.status === 'captured' ? 'Captured from your browser' : 'Not captured'}
                </SummaryRow>
                <SummaryRow icon={StickyNote} label="Note">
                  {note.trim() ? note.trim() : <span className="font-normal text-ink-muted">No note</span>}
                </SummaryRow>
              </dl>
            </div>
          )}

          {submitError && (
            <Alert tone="danger" className="mt-5" live>
              {submitError}
            </Alert>
          )}
        </form>
      )}
    </Modal>
  );
}

export default CheckInDialog;
