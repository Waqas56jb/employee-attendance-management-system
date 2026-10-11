import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Bell, CalendarClock, Database, Monitor, Moon, Palette, RotateCcw, Save, Sun, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/common/Button';
import { Card, CardHeader } from '../components/common/Card';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { FormField, fieldAria } from '../components/common/FormField';
import { PageHeader } from '../components/common/PageHeader';
import { SegmentedControl } from '../components/common/SegmentedControl';
import { Select } from '../components/common/Select';
import { Switch } from '../components/common/Switch';
import { PageContainer } from '../components/layout/PageContainer';
import { SecuritySettings } from '../components/profile/SecuritySettings';
import { useAuth } from '../hooks/useAuth';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { usePreferences } from '../hooks/usePreferences';
import { config } from '../services/config';
import { getErrorMessage } from '../services/errors';
import { resetDemoData } from '../services/mockDb';
import { CLOCK_FORMATS, DATE_FORMATS, formatDate, formatTime } from '../utils/formatters';
import { displayNameSchema } from '../utils/validation';

const NOTIFICATION_SETTINGS = [
  { key: 'shifts', label: 'Shift confirmations', description: 'Check-in and check-out confirmations.' },
  { key: 'assignments', label: 'Assignment updates', description: 'New projects and changes to your assignments.' },
  { key: 'reminders', label: 'Schedule reminders', description: 'Reminders about upcoming site visits.' },
  { key: 'announcements', label: 'Company announcements', description: 'General news from your organization.' },
];

function DisplayNameForm() {
  const { employee, updateProfile } = useAuth();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm({ resolver: zodResolver(displayNameSchema), defaultValues: { displayName: employee?.displayName ?? '' } });

  useEffect(() => reset({ displayName: employee?.displayName ?? '' }), [employee?.displayName, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      await updateProfile(values);
      toast.success('Display name updated');
    } catch (error) {
      toast.error('Display name not saved', { description: getErrorMessage(error) });
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3 sm:flex-row sm:items-start">
      <FormField
        id="settings-display-name"
        label="Preferred display name"
        className="flex-1"
        error={errors.displayName?.message}
        hint="Used in greetings across the app. Your legal name stays unchanged."
      >
        <input type="text" className="input" autoComplete="nickname" {...fieldAria('settings-display-name', errors.displayName, true)} {...register('displayName')} />
      </FormField>
      <Button type="submit" leftIcon={Save} loading={isSubmitting} disabled={!isDirty} className="sm:mt-7">
        Save
      </Button>
    </form>
  );
}

export function SettingsPage() {
  useDocumentTitle('Settings');
  const { preferences, updatePreferences } = usePreferences();
  const [confirmReset, setConfirmReset] = useState(false);
  const sample = new Date();

  const setNotification = (key, value) => {
    updatePreferences({ notifications: { ...preferences.notifications, [key]: value } });
    toast.success(`${NOTIFICATION_SETTINGS.find((s) => s.key === key).label} ${value ? 'enabled' : 'muted'}`);
  };

  const handleReset = () => {
    resetDemoData();
    // Reload so every context picks up the restored dataset.
    window.location.assign('/dashboard');
  };

  return (
    <PageContainer className="max-w-4xl">
      <PageHeader title="Settings" description="Personalize how the portal looks and behaves on this device." />

      <div className="space-y-6">
        <Card>
          <CardHeader title="Profile" icon={UserRound} />
          <DisplayNameForm />
        </Card>

        <Card>
          <CardHeader title="Appearance" description="Choose a theme for this device." icon={Palette} />
          <SegmentedControl
            label="Theme"
            value={preferences.theme}
            onChange={(theme) => updatePreferences({ theme })}
            className="w-full sm:w-auto"
            options={[
              { value: 'light', label: 'Light', icon: Sun },
              { value: 'dark', label: 'Dark', icon: Moon },
              { value: 'system', label: 'System', icon: Monitor },
            ]}
          />
        </Card>

        <Card>
          <CardHeader title="Date & time" description="Applies to every time and date shown in the app." icon={CalendarClock} />
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <div>
              <label htmlFor="clock-format" className="label">
                Clock format
              </label>
              <Select id="clock-format" value={preferences.clockFormat} onChange={(e) => updatePreferences({ clockFormat: e.target.value })}>
                {Object.entries(CLOCK_FORMATS).map(([value, meta]) => (
                  <option key={value} value={value}>
                    {meta.label}
                  </option>
                ))}
              </Select>
              <p className="mt-1.5 text-xs text-ink-muted">
                Now: <span className="tabular font-medium text-ink-secondary">{formatTime(sample, preferences.clockFormat)}</span>
              </p>
            </div>
            <div>
              <label htmlFor="date-format" className="label">
                Date format
              </label>
              <Select id="date-format" value={preferences.dateFormat} onChange={(e) => updatePreferences({ dateFormat: e.target.value })}>
                {Object.entries(DATE_FORMATS).map(([value, meta]) => (
                  <option key={value} value={value}>
                    {formatDate(sample, value)}
                    {value === 'medium' ? ' (default)' : ''}
                  </option>
                ))}
              </Select>
              <p className="mt-1.5 text-xs text-ink-muted">Used in tables and lists.</p>
            </div>
            <div>
              <label htmlFor="week-start" className="label">
                Week starts on
              </label>
              <Select
                id="week-start"
                value={String(preferences.weekStartsOn)}
                onChange={(e) => updatePreferences({ weekStartsOn: Number(e.target.value) })}
              >
                <option value="1">Monday</option>
                <option value="0">Sunday</option>
              </Select>
              <p className="mt-1.5 text-xs text-ink-muted">Affects weekly totals and charts.</p>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Notifications" description="Choose which in-app notifications you see. Nothing is sent by email or push." icon={Bell} />
          <div className="divide-y divide-line">
            {NOTIFICATION_SETTINGS.map((s) => (
              <div key={s.key} className="py-4 first:pt-0 last:pb-0">
                <Switch
                  id={`notify-${s.key}`}
                  label={s.label}
                  description={s.description}
                  checked={preferences.notifications[s.key]}
                  onChange={(value) => setNotification(s.key, value)}
                />
              </div>
            ))}
          </div>
        </Card>

        <SecuritySettings />

        {config.useMockApi && (
          <Card>
            <CardHeader
              title="Demo data"
              description="All demo data is stored in this browser's LocalStorage, which is not secure storage."
              icon={Database}
            />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-ink-secondary">
                Restore the original customers, projects, attendance records and notifications. Your preferences are kept.
              </p>
              <Button variant="secondary" leftIcon={RotateCcw} onClick={() => setConfirmReset(true)}>
                Reset demo data
              </Button>
            </div>
          </Card>
        )}
      </div>

      <ConfirmDialog
        open={confirmReset}
        title="Reset demo data?"
        description="Shifts you recorded, profile edits and notification read states will be replaced by the original demo dataset. Any active shift will be removed."
        confirmLabel="Reset data"
        tone="danger"
        icon={RotateCcw}
        onConfirm={handleReset}
        onCancel={() => setConfirmReset(false)}
      />
    </PageContainer>
  );
}

export default SettingsPage;
