import { useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

/**
 * react-hook-form wiring shared by the settings forms:
 *  - zod validation,
 *  - resets whenever the stored settings change (save, reset, other tab),
 *  - maps ServiceError.field to an inline error, otherwise shows a toast.
 */
export function useSettingsForm({ schema, defaults, save, success, transform }) {
  const form = useForm({ resolver: zodResolver(schema), defaultValues: defaults, mode: 'onBlur' });
  const { reset, setError, getValues } = form;

  useEffect(() => {
    reset(defaults);
  }, [defaults, reset]);

  const onSubmit = useCallback(
    async (data) => {
      try {
        await save(transform ? transform(data, getValues) : data);
        toast.success(success);
      } catch (error) {
        if (error?.field) {
          setError(error.field, { type: 'server', message: error.message }, { shouldFocus: true });
        } else {
          toast.error(error?.message ?? 'The settings could not be saved. Please try again.');
        }
      }
    },
    [save, success, transform, setError, getValues],
  );

  const discard = useCallback(() => reset(defaults), [reset, defaults]);

  return { form, onSubmit: form.handleSubmit(onSubmit), discard };
}
