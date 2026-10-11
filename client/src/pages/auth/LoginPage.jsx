import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Info, LogIn } from 'lucide-react';
import { toast } from 'sonner';
import { Alert } from '../../components/common/Alert';
import { Button } from '../../components/common/Button';
import { FormField, fieldAria } from '../../components/common/FormField';
import { DEMO_CREDENTIALS } from '../../data/demoData';
import { useAuth } from '../../hooks/useAuth';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { getRememberedEmail } from '../../services/authService';
import { config } from '../../services/config';
import { getErrorMessage } from '../../services/errors';
import { firstName } from '../../utils/formatters';
import { loginSchema } from '../../utils/validation';
import { AuthLayout } from './AuthLayout';

export function LoginPage() {
  useDocumentTitle('Sign in');
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const rememberedEmail = getRememberedEmail();

  const {
    register,
    handleSubmit,
    setValue,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: rememberedEmail || '', password: '', remember: Boolean(rememberedEmail) },
  });

  const redirectTo = location.state?.from?.pathname && location.state.from.pathname !== '/login' ? location.state.from.pathname : '/dashboard';

  const onSubmit = handleSubmit(async (values) => {
    setFormError('');
    try {
      const employee = await login(values);
      toast.success(`Welcome back, ${employee.displayName || firstName(employee.fullName)}`);
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setFormError(getErrorMessage(error, 'Sign-in failed. Please try again.'));
      setValue('password', '');
      setFocus('password');
    }
  });

  const fillDemo = () => {
    const demo = DEMO_CREDENTIALS[0];
    setValue('email', demo.email, { shouldValidate: true });
    setValue('password', demo.password, { shouldValidate: true });
    setFormError('');
  };

  return (
    <AuthLayout>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Sign in to your account</h1>
      <p className="mt-1.5 text-sm text-ink-muted">Use your work email to access the {config.appName} employee portal.</p>

      {location.state?.sessionExpired && (
        <Alert tone="warning" className="mt-6">
          Your session has ended. Please sign in again.
        </Alert>
      )}

      <form onSubmit={onSubmit} noValidate className="mt-8 space-y-5">
        {formError && (
          <Alert tone="danger" live>
            {formError}
          </Alert>
        )}

        <FormField id="login-email" label="Work email" error={errors.email?.message}>
          <input
            type="email"
            className="input h-11"
            autoComplete="username"
            inputMode="email"
            placeholder="name@company.com"
            autoFocus={!rememberedEmail}
            {...fieldAria('login-email', errors.email)}
            {...register('email')}
          />
        </FormField>

        <FormField
          id="login-password"
          label="Password"
          error={errors.password?.message}
          labelAction={
            <Link to="/forgot-password" className="mb-1.5 text-sm font-medium text-brand-700 hover:underline">
              Forgot password?
            </Link>
          }
        >
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              className="input h-11 pr-11"
              autoComplete="current-password"
              placeholder="Enter your password"
              autoFocus={Boolean(rememberedEmail)}
              {...fieldAria('login-password', errors.password)}
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-subtle hover:text-ink"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
            >
              {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
            </button>
          </div>
        </FormField>

        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink-secondary">
          <input type="checkbox" className="h-4 w-4 rounded border-line-strong accent-[rgb(var(--brand-600))]" {...register('remember')} />
          Keep me signed in on this device for 30 days
        </label>

        <Button type="submit" size="lg" fullWidth loading={isSubmitting} leftIcon={LogIn}>
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      {config.useMockApi && (
        <div className="mt-8 rounded-xl border border-dashed border-line-strong bg-canvas p-4">
          <div className="flex items-start gap-3">
            <Info size={18} className="mt-0.5 shrink-0 text-info-ink" aria-hidden="true" />
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-medium text-ink">Demo mode</p>
              <p className="mt-0.5 text-ink-muted">
                Sign in with the demo employee account. Data is stored only in this browser and this sign-in is not production-secure.
              </p>
              <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-mono text-xs">
                <dt className="text-ink-muted">Email</dt>
                <dd className="truncate text-ink">{DEMO_CREDENTIALS[0].email}</dd>
                <dt className="text-ink-muted">Password</dt>
                <dd className="text-ink">{DEMO_CREDENTIALS[0].password}</dd>
              </dl>
              <Button variant="soft" size="sm" className="mt-3" onClick={fillDemo}>
                Fill in demo credentials
              </Button>
            </div>
          </div>
        </div>
      )}
    </AuthLayout>
  );
}

export default LoginPage;
