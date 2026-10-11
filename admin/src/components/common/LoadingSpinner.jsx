import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

export function LoadingSpinner({ label = 'Loading…', className, fullPage = false }) {
  return (
    <div
      role="status"
      className={clsx('flex items-center justify-center gap-2 text-sm text-ink-muted', fullPage ? 'min-h-[60vh]' : 'py-10', className)}
    >
      <Loader2 size={18} className="animate-spin text-brand-600" aria-hidden />
      <span>{label}</span>
    </div>
  );
}
