import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Alert } from '../../components/common/Alert';
import { Button } from '../../components/common/Button';
import { FormField, fieldAria } from '../../components/common/FormField';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { requestPasswordReset } from '../../services/authService';
import { config } from '../../services/config';
import { getErrorMessage } from '../../services/errors';
import { forgotPasswordSchema } from '../../utils/validation';
import { AuthLayout } from './AuthLayout';

export function ForgotPasswordPage() {
  useDocumentTitle('Reset password');
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [error, setError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { email: '' } });

  const onSubmit = handleSubmit(async ({ email }) => {
    setError('');
    try {
      await requestPasswordReset(email);
      setSubmittedEmail(email);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  });

  return (
    <AuthLayout>
      <Link to="/login" className="mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink">
        <ArrowLeft size={16} aria-hidden="true" /> Back to sign in
      </Link>

      {submittedEmail ? (
        <div>
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
            <Mail size={22} aria-hidden="true" />
          </span>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-ink">Request received</h1>
          {config.useMockApi ? (
            <Alert tone="info" className="mt-5" live>
              This is demo mode, so <strong>no email was sent</strong> to {submittedEmail}. In production, the backend would email a
              secure reset link. For the demo, use the credentials shown on the sign-in page.
            </Alert>
          ) : (
            <p className="mt-2 text-sm text-ink-muted">
              If an account exists for <strong className="text-ink">{submittedEmail}</strong>, you will receive an email with instructions
              to reset your password.
            </p>
          )}
          <Button to="/login" variant="secondary" fullWidth size="lg" className="mt-8">
            Return to sign in
          </Button>
        </div>
      ) : (
        <>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Reset your password</h1>
          <p className="mt-1.5 text-sm text-ink-muted">Enter your work email and we will send you instructions to reset your password.</p>
          <form onSubmit={onSubmit} noValidate className="mt-8 space-y-5">
            {error && (
              <Alert tone="danger" live>
                {error}
              </Alert>
            )}
            <FormField id="reset-email" label="Work email" error={errors.email?.message}>
              <input
                type="email"
                className="input h-11"
                autoComplete="email"
                inputMode="email"
                placeholder="name@company.com"
                autoFocus
                {...fieldAria('reset-email', errors.email)}
                {...register('email')}
              />
            </FormField>
            <Button type="submit" size="lg" fullWidth loading={isSubmitting}>
              Send reset instructions
            </Button>
            <p className="text-center text-xs text-ink-muted">Can&apos;t access your email? Contact your supervisor or administrator.</p>
          </form>
        </>
      )}
    </AuthLayout>
  );
}

export default ForgotPasswordPage;
