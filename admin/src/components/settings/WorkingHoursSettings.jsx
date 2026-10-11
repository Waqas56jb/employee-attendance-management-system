import { useMemo } from 'react';
import { Controller } from 'react-hook-form';
import clsx from 'clsx';
import { Lock } from 'lucide-react';
import { useBusiness } from '../../hooks/useBusiness';
import { workingHoursSchema } from '../../utils/validation';
import { PERIOD_PRESETS } from '../../utils/dateUtils';
import { TIMEZONES } from '../../services/settingsService';
import { Checkbox, FormField, FormGrid, FormSection, Input } from '../common/FormField';
import { SelectField } from '../common/SelectField';
import { Callout } from '../common/Callout';
import { BackendHint, UiEffectHint } from './BackendHint';
import { SettingsSaveBar } from './SettingsSaveBar';
import { useSettingsForm } from './useSettingsForm';

const TIMEZONE_OPTIONS = TIMEZONES.map((tz) => ({ value: tz, label: tz.replace(/_/g, ' ') }));
// Values follow JS Date#getDay (0 = Sunday); displayed Monday first.
const WEEKDAYS = [
  { value: 1, short: 'Mon', label: 'Monday' },
  { value: 2, short: 'Tue', label: 'Tuesday' },
  { value: 3, short: 'Wed', label: 'Wednesday' },
  { value: 4, short: 'Thu', label: 'Thursday' },
  { value: 5, short: 'Fri', label: 'Friday' },
  { value: 6, short: 'Sat', label: 'Saturday' },
  { value: 0, short: 'Sun', label: 'Sunday' },
];
const LOCATION_OPTIONS = [
  { value: 'disabled', label: 'Disabled — no location is recorded' },
  { value: 'optional', label: 'Optional — recorded when the employee allows it' },
  { value: 'required', label: 'Required — check-in is blocked without location' },
];
const BILLING_PERIODS = ['this_week', 'last_week', 'this_month', 'last_month'];
const BILLING_PERIOD_OPTIONS = PERIOD_PRESETS.filter((p) => BILLING_PERIODS.includes(p.value));

function toForm(settings) {
  return {
    timezone: settings.timezone ?? 'Europe/Berlin',
    workingDays: [...(settings.workingDays ?? [1, 2, 3, 4, 5])].sort(),
    expectedDailyHours: String(settings.expectedDailyHours ?? 8),
    defaultBreakMinutes: String(settings.defaultBreakMinutes ?? 0),
    reviewShiftsOverHours: String(settings.reviewShiftsOverHours ?? 12),
    openShiftAlertHours: String(settings.openShiftAlertHours ?? 14),
    // Audit reasons are mandatory in this app, so this is always on.
    requireCorrectionReason: true,
    locationCapture: settings.locationCapture ?? 'optional',
    defaultBillingPeriod: settings.defaultBillingPeriod ?? 'last_month',
  };
}

function WeekdayPicker({ value = [], onChange, onBlur, invalid, describedBy }) {
  const toggle = (day) => {
    const next = value.includes(day) ? value.filter((d) => d !== day) : [...value, day];
    onChange(next.sort());
  };
  return (
    <div role="group" aria-labelledby="working-days-label" aria-describedby={describedBy} className="flex flex-wrap gap-2">
      {WEEKDAYS.map((day) => {
        const checked = value.includes(day.value);
        return (
          <label
            key={day.value}
            className={clsx(
              'flex h-10 min-w-[3.5rem] cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors focus-within:ring-2 focus-within:ring-brand-500',
              checked ? 'border-brand-300 bg-brand-50 text-brand-700' : 'border-line-strong bg-surface text-ink-secondary hover:bg-subtle',
              invalid && !checked && 'border-danger/50',
            )}
          >
            <input type="checkbox" className="sr-only" checked={checked} onChange={() => toggle(day.value)} onBlur={onBlur} aria-label={day.label} />
            {day.short}
          </label>
        );
      })}
    </div>
  );
}

export function WorkingHoursSettings() {
  const { workingHours, updateWorkingHours } = useBusiness();
  const defaults = useMemo(() => toForm(workingHours), [workingHours]);
  const { form, onSubmit, discard } = useSettingsForm({
    schema: workingHoursSchema,
    defaults,
    save: updateWorkingHours,
    success: 'Working-hours settings saved.',
  });
  const {
    register,
    control,
    watch,
    formState: { errors, isDirty, isSubmitting },
  } = form;

  const reviewHours = Number(watch('reviewShiftsOverHours')) || 0;
  const selectedDays = watch('workingDays') ?? [];
  const expected = Number(watch('expectedDailyHours')) || 0;
  const weeklyHours = Math.round(expected * selectedDays.length * 100) / 100;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <Callout tone="info" title="What changes the admin panel today">
        The review threshold, the open-shift alert and the default billing period take effect in this panel immediately. Time zone, working days,
        location capture and break rules are stored here but must be enforced by the backend and the employee app. Overtime is not automatically
        classified as billable overtime — no overtime rule is defined.
      </Callout>

      <FormSection title="Schedule" description="Your standard working week.">
        <FormGrid>
          <FormField label="Business time zone" required error={errors.timezone?.message} labelAction={<BackendHint />} hint="Defines which work date a shift belongs to.">
            <SelectField options={TIMEZONE_OPTIONS} {...register('timezone')} />
          </FormField>
          <FormField label="Expected daily hours" required error={errors.expectedDailyHours?.message} hint="Reference value for reports.">
            <Input type="number" inputMode="decimal" min={1} max={16} step="0.25" suffix="hours" {...register('expectedDailyHours')} className="tabular" />
          </FormField>
          <div className="sm:col-span-2">
            <div className="flex items-center justify-between gap-2">
              <p id="working-days-label" className="label">
                Standard working days<span className="ml-0.5 text-danger" aria-hidden>*</span>
              </p>
              <BackendHint />
            </div>
            <Controller
              control={control}
              name="workingDays"
              render={({ field }) => (
                <WeekdayPicker
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  invalid={Boolean(errors.workingDays)}
                  describedBy={errors.workingDays ? 'working-days-error' : 'working-days-hint'}
                />
              )}
            />
            {errors.workingDays ? (
              <p id="working-days-error" role="alert" className="mt-1.5 text-xs font-medium text-danger-ink">
                {errors.workingDays.message}
              </p>
            ) : (
              <p id="working-days-hint" className="mt-1.5 text-xs text-ink-muted">
                {selectedDays.length} {selectedDays.length === 1 ? 'day' : 'days'} × {expected || 0} h ≈ {weeklyHours} h per week.
              </p>
            )}
          </div>
        </FormGrid>
      </FormSection>

      <FormSection title="Breaks">
        <FormField
          label="Default break duration"
          required
          error={errors.defaultBreakMinutes?.message}
          labelAction={<BackendHint />}
          className="sm:max-w-xs"
        >
          <Input type="number" inputMode="numeric" min={0} max={180} step={1} suffix="min" {...register('defaultBreakMinutes')} className="tabular" />
        </FormField>
        <Callout tone="warning" title="Breaks are not deducted automatically" className="mt-4">
          Attendance records do not record breaks, so recorded and billable hours are never reduced by this value. It is informational until the
          backend records breaks.
        </Callout>
      </FormSection>

      <FormSection title="Attendance review" description="Rules that flag records for an administrator to check.">
        <FormGrid>
          <FormField
            label="Flag shifts longer than"
            required
            error={errors.reviewShiftsOverHours?.message}
            labelAction={<UiEffectHint />}
            hint={reviewHours > 0 ? `Completed shifts over ${reviewHours} h need review before billing.` : 'Set to 0 to disable this check.'}
          >
            <Input type="number" inputMode="decimal" min={0} max={24} step="0.5" suffix="hours" {...register('reviewShiftsOverHours')} className="tabular" />
          </FormField>
          <FormField
            label="Open-shift alert after"
            required
            error={errors.openShiftAlertHours?.message}
            labelAction={<UiEffectHint />}
            hint="Open shifts older than this (or from a previous day) are shown as missing checkout."
          >
            <Input type="number" inputMode="decimal" min={1} max={48} step="0.5" suffix="hours" {...register('openShiftAlertHours')} className="tabular" />
          </FormField>
        </FormGrid>

        <div className="mt-5 rounded-lg border border-line bg-subtle px-4 py-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <Checkbox
              checked
              disabled
              readOnly
              label={
                <span className="inline-flex items-center gap-1.5">
                  Require a reason for every correction <Lock size={13} className="text-ink-muted" aria-label="Locked" />
                </span>
              }
              description="Always on. Corrections, approvals, cancellations and billable adjustments are audited, so a reason is mandatory in this app."
            />
          </div>
        </div>
      </FormSection>

      <FormSection title="Location">
        <FormField
          label="Location capture at check-in"
          required
          error={errors.locationCapture?.message}
          labelAction={<BackendHint />}
          hint="Enforced by the employee app and backend; the admin panel only stores the preference."
          className="sm:max-w-md"
        >
          <SelectField options={LOCATION_OPTIONS} {...register('locationCapture')} />
        </FormField>
      </FormSection>

      <FormSection title="Billing">
        <FormField
          label="Default billing period"
          required
          error={errors.defaultBillingPeriod?.message}
          labelAction={<UiEffectHint />}
          hint="Preselected period on billing screens."
          className="sm:max-w-xs"
        >
          <SelectField options={BILLING_PERIOD_OPTIONS} {...register('defaultBillingPeriod')} />
        </FormField>
        <p className="mt-4 text-xs text-ink-muted">
          Hours beyond the expected daily hours are billed at the normal applicable rate. There is no automatic billable-overtime classification.
        </p>
      </FormSection>

      <SettingsSaveBar isDirty={isDirty} isSubmitting={isSubmitting} onDiscard={discard} />
    </form>
  );
}
