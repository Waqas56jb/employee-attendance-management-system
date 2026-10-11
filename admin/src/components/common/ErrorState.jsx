import { AlertOctagon } from 'lucide-react';
import { Button } from './Button';

/** Used for missing records (invalid IDs) and unexpected render errors. */
export function ErrorState({ title = 'Something went wrong', message, backTo, backLabel = 'Go back', onRetry }) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-danger-soft text-danger-ink">
        <AlertOctagon size={22} aria-hidden />
      </span>
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      {message && <p className="mt-1 max-w-md text-sm text-ink-muted">{message}</p>}
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {onRetry && (
          <Button variant="secondary" onClick={onRetry}>
            Try again
          </Button>
        )}
        {backTo && <Button to={backTo}>{backLabel}</Button>}
      </div>
    </div>
  );
}
