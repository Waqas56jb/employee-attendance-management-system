import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { changePassword } from '../../services/authService';
import { config } from '../../services/config';
import { getErrorMessage } from '../../services/errors';
import { passwordChangeSchema } from '../../utils/validation';
import { Alert } from '../common/Alert';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { Card, CardHeader } from '../common/Card';
import { FormField, fieldAria } from '../common/FormField';

function PasswordInput({ id, error, hint, registration, autoComplete }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        type={visible ? 'text' : 'password'}
        className="input pr-10"
        autoComplete={autoComplete}
        {...fieldAria(id, error, hint)}
        {...registration}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-ink-muted hover:bg-subtle hover:text-ink"
        aria-label={visible ? 'Hide password' : 'Show password'}
      >
        {visible ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
      </button>
    </div>
  );
}

/**
 * Password change form, validated client-side and prepared for the backend
 * endpoint. In demo mode the service refuses the change and the UI says so.
 */
export function SecuritySettings() {
  const [result, setResult] = useState(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setResult(null);
    try {
      await changePassword(values);
      reset();
      setResult({ tone: 'success', message: 'Your password has been changed.' });
      toast.success('Password changed');
    } catch (error) {
      setResult({ tone: 'warning', message: getErrorMessage(error) });
    }
  });

  return (
    <Card>
      <CardHeader
        title="Change password"
        description="Use at least 10 characters with upper- and lowercase letters and a number."
        icon={KeyRound}
        action={config.useMockApi && <Badge tone="warning">Unavailable in demo mode</Badge>}
      />
      {config.useMockApi && (
        <Alert tone="info" className="mb-5">
          Password changes must be processed by the secure backend, which is not connected in this demo. You can try the form, but
          no password will be changed.
        </Alert>
      )}
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <FormField id="current-password" label="Current password" error={errors.currentPassword?.message}>
          <PasswordInput
            id="current-password"
            error={errors.currentPassword}
            autoComplete="current-password"
            registration={register('currentPassword')}
          />
        </FormField>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField id="new-password" label="New password" error={errors.newPassword?.message}>
            <PasswordInput id="new-password" error={errors.newPassword} autoComplete="new-password" registration={register('newPassword')} />
          </FormField>
          <FormField id="confirm-password" label="Confirm new password" error={errors.confirmPassword?.message}>
            <PasswordInput
              id="confirm-password"
              error={errors.confirmPassword}
              autoComplete="new-password"
              registration={register('confirmPassword')}
            />
          </FormField>
        </div>
        {result && (
          <Alert tone={result.tone} live>
            {result.message}
          </Alert>
        )}
        <div className="flex justify-end border-t border-line pt-4">
          <Button type="submit" variant="secondary" loading={isSubmitting}>
            Update password
          </Button>
        </div>
      </form>
    </Card>
  );
}

export default SecuritySettings;
