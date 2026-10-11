import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, KeyRound, LogIn } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../hooks/useAuth';
import { loginSchema } from '../../utils/validation';
import { DEMO_CREDENTIALS } from '../../data/demoData';
import { Button } from '../../components/common/Button';
import { Checkbox, FormField, Input } from '../../components/common/FormField';
import { Callout } from '../../components/common/Callout';
import { AuthShell } from './AuthShell';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '', remember: true } });

  const onSubmit = async (values) => {
    setFormError('');
    try {
      const session = await login(values);
      toast.success(`Welcome back, ${session.user.name.split(' ')[0]}.`);
      navigate(location.state?.from ?? '/dashboard', { replace: true });
    } catch (error) {
      setFormError(error.message);
    }
  };

  const fillDemo = () => {
    setValue('email', DEMO_CREDENTIALS.email, { shouldValidate: true });
    setValue('password', DEMO_CREDENTIALS.password, { shouldValidate: true });
  };

  return (
    <AuthShell title="Sign in">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Sign in to the admin console</h1>
      <p className="mt-1.5 text-sm text-ink-muted">Manage employees, attendance, billing and invoices.</p>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-8 space-y-4">
        {formError && <Callout tone="danger">{formError}</Callout>}
        <FormField label="Email address" error={errors.email?.message} required>
          <Input type="email" autoComplete="username" placeholder="you@company.com" {...register('email')} />
        </FormField>
        <FormField
          label="Password"
          error={errors.password?.message}
          required
          htmlFor="login-password"
          labelAction={
            <Link to="/forgot-password" className="mb-1.5 text-xs font-medium text-brand-700 hover:underline">
              Forgot password?
            </Link>
          }
        >
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              className="input pr-10"
              aria-invalid={errors.password ? 'true' : undefined}
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-ink-muted hover:text-ink"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
            >
              {showPassword ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
            </button>
          </div>
        </FormField>
        <Checkbox label="Keep me signed in for 14 days" {...register('remember')} />
        <Button type="submit" size="lg" icon={LogIn} loading={isSubmitting} className="w-full">
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <div className="mt-8 rounded-xl border border-dashed border-line-strong bg-subtle/60 p-4">
        <div className="flex items-start gap-3">
          <KeyRound size={16} className="mt-0.5 shrink-0 text-brand-600" aria-hidden />
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-medium text-ink">Demo credentials</p>
            <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
              <dt className="text-ink-muted">Email</dt>
              <dd className="font-mono text-ink">{DEMO_CREDENTIALS.email}</dd>
              <dt className="text-ink-muted">Password</dt>
              <dd className="font-mono text-ink">{DEMO_CREDENTIALS.password}</dd>
            </dl>
            <button type="button" onClick={fillDemo} className="mt-2 text-xs font-medium text-brand-700 hover:underline">
              Fill in demo credentials
            </button>
          </div>
        </div>
      </div>
      <p className="mt-4 text-xs text-ink-muted">
        Demo authentication runs in the browser only. Production sign-in, sessions and password recovery are enforced by the backend.
      </p>
    </AuthShell>
  );
}
