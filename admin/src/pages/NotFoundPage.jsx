import { useEffect } from 'react';
import { Compass } from 'lucide-react';
import { Button } from '../components/common/Button';

export default function NotFoundPage() {
  useEffect(() => {
    document.title = 'Page not found · Shiftwise Admin';
  }, []);
  return (
    <div className="card mx-auto flex max-w-xl flex-col items-center px-6 py-16 text-center">
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-subtle text-ink-muted">
        <Compass size={22} aria-hidden />
      </span>
      <p className="text-xs font-semibold uppercase tracking-wider text-brand-700">404</p>
      <h1 className="mt-1 text-xl font-semibold text-ink">This page does not exist</h1>
      <p className="mt-2 text-sm text-ink-muted">The link may be outdated, or the record may have been removed.</p>
      <div className="mt-6 flex gap-2">
        <Button variant="secondary" onClick={() => window.history.back()}>
          Go back
        </Button>
        <Button to="/dashboard">Back to dashboard</Button>
      </div>
    </div>
  );
}
