import { useLocation } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { Button } from '../components/common/Button';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

/** Shown when an employee tries to open an administrator-only address. */
export function UnauthorizedPage() {
  useDocumentTitle('Access denied');
  const location = useLocation();
  const attempted = location.state?.attempted;

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-danger-soft text-danger-ink">
        <ShieldAlert size={26} aria-hidden="true" />
      </span>
      <p className="mt-6 text-sm font-semibold text-danger-ink">403</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">You don&apos;t have access to this page</h1>
      <p className="mt-2 max-w-md text-sm text-ink-muted">
        {attempted ? (
          <>
            <code className="rounded bg-subtle px-1.5 py-0.5 font-mono text-xs text-ink-secondary">{attempted}</code> is restricted to
            administrators.
          </>
        ) : (
          'This area is restricted to administrators.'
        )}{' '}
        The employee portal only includes your own attendance, projects and customers.
      </p>
      <Button to="/dashboard" className="mt-8">
        Back to dashboard
      </Button>
    </div>
  );
}

export default UnauthorizedPage;
