import { useEffect } from 'react';
import { ShieldAlert } from 'lucide-react';
import { Button } from '../components/common/Button';

/** Shown when a role is not allowed to open a screen (role checks arrive with the backend). */
export default function UnauthorizedPage() {
  useEffect(() => {
    document.title = 'Access denied · Shiftwise Admin';
  }, []);
  return (
    <div className="card mx-auto flex max-w-xl flex-col items-center px-6 py-16 text-center">
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-warning-soft text-warning-ink">
        <ShieldAlert size={22} aria-hidden />
      </span>
      <p className="text-xs font-semibold uppercase tracking-wider text-warning-ink">403</p>
      <h1 className="mt-1 text-xl font-semibold text-ink">You do not have access to this page</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Your administrator role does not include this area. Ask the account owner to update your permissions.
      </p>
      <Button to="/dashboard" className="mt-6">
        Back to dashboard
      </Button>
    </div>
  );
}
