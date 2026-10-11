import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, MailQuestion } from 'lucide-react';
import { requestPasswordReset } from '../../services/authService';
import { forgotPasswordSchema } from '../../utils/validation';
import { Button } from '../../components/common/Button';
import { FormField, Input } from '../../components/common/FormField';
import { Callout } from '../../components/common/Callout';
import { AuthShell } from './AuthShell';

export default function ForgotPasswordPage() {
  const [result, setResult] = useState(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { email: '' } });

  const onSubmit = async ({ email }) => {
    setResult(await requestPasswordReset(email));
  };

  return (
    <AuthShell title="Reset password">
      <Link to="/login" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-ink-secondary hover:text-ink">
        <ArrowLeft size={16} aria-hidden /> Back to sign in
      </Link>
      <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
        <MailQuestion size={20} aria-hidden />
      </span>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Reset your password</h1>
      <p className="mt-1.5 text-sm text-ink-muted">Enter the email address of your administrator account.</p>

      {result ? (
        <div className="mt-8 space-y-4">
          <Callout tone="demo" title="Request recorded (demo)">
            {result.message}
          </Callout>
          <p className="text-sm text-ink-muted">
            Requested for <span className="font-medium text-ink">{result.email}</span>. For this demo, sign in with the credentials shown on the login page.
          </p>
          <Button to="/login" variant="secondary" className="w-full">
            Return to sign in
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-8 space-y-4">
          <FormField label="Email address" error={errors.email?.message} required>
            <Input type="email" autoComplete="email" placeholder="you@company.com" {...register('email')} />
          </FormField>
          <Button type="submit" size="lg" loading={isSubmitting} className="w-full">
            Request reset link
          </Button>
          <p className="text-xs text-ink-muted">No email is sent in demo mode. Password recovery requires the backend mail integration.</p>
        </form>
      )}
    </AuthShell>
  );
}
