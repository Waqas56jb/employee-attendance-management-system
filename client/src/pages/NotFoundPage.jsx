import { useLocation } from 'react-router-dom';
import { ArrowLeft, Compass } from 'lucide-react';
import { Button } from '../components/common/Button';
import { useAuth } from '../hooks/useAuth';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export function NotFoundPage() {
  useDocumentTitle('Page not found');
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-line bg-surface text-ink-muted shadow-card">
        <Compass size={26} aria-hidden="true" />
      </span>
      <p className="mt-6 text-sm font-semibold text-brand-700">404</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">Page not found</h1>
      <p className="mt-2 max-w-md text-sm text-ink-muted">
        We couldn&apos;t find <code className="rounded bg-subtle px-1.5 py-0.5 font-mono text-xs text-ink-secondary">{location.pathname}</code>.
        Check the address or go back to a page you know.
      </p>
      <div className="mt-8 flex flex-col gap-2 sm:flex-row">
        <Button variant="secondary" leftIcon={ArrowLeft} onClick={() => window.history.back()}>
          Go back
        </Button>
        <Button to={isAuthenticated ? '/dashboard' : '/login'}>{isAuthenticated ? 'Go to dashboard' : 'Go to sign in'}</Button>
      </div>
    </div>
  );
}

export default NotFoundPage;
