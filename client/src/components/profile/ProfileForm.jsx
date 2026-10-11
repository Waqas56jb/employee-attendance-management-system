import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Save } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../hooks/useAuth';
import { getErrorMessage } from '../../services/errors';
import { profileSchema } from '../../utils/validation';
import { Button } from '../common/Button';
import { Card, CardHeader } from '../common/Card';
import { FormField, fieldAria } from '../common/FormField';

/** Editable profile fields. Only display name and phone can be changed by employees. */
export function ProfileForm() {
  const { employee, updateProfile } = useAuth();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: { displayName: employee?.displayName ?? '', phone: employee?.phone ?? '' },
  });

  useEffect(() => {
    reset({ displayName: employee?.displayName ?? '', phone: employee?.phone ?? '' });
  }, [employee?.displayName, employee?.phone, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      await updateProfile(values);
      toast.success('Profile updated', { description: 'Your changes have been saved on this device.' });
    } catch (error) {
      toast.error('Profile not saved', { description: getErrorMessage(error) });
    }
  });

  return (
    <Card>
      <CardHeader title="Personal details" description="You can update how your name is shown and your contact number." />
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <FormField
            id="profile-display-name"
            label="Display name"
            required
            error={errors.displayName?.message}
            hint="Shown in greetings and menus."
          >
            <input
              type="text"
              className="input"
              autoComplete="nickname"
              {...fieldAria('profile-display-name', errors.displayName, true)}
              {...register('displayName')}
            />
          </FormField>
          <FormField id="profile-phone" label="Phone number" required error={errors.phone?.message} hint="Used by supervisors to reach you on site.">
            <input
              type="tel"
              className="input"
              autoComplete="tel"
              inputMode="tel"
              {...fieldAria('profile-phone', errors.phone, true)}
              {...register('phone')}
            />
          </FormField>
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-line pt-5 sm:flex-row sm:justify-end">
          <Button variant="secondary" disabled={!isDirty || isSubmitting} onClick={() => reset()}>
            Discard changes
          </Button>
          <Button type="submit" leftIcon={Save} loading={isSubmitting} disabled={!isDirty}>
            Save changes
          </Button>
        </div>
      </form>
    </Card>
  );
}

export default ProfileForm;
