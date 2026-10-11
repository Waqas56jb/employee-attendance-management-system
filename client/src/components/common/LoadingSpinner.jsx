import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';
import { LogoMark } from './AppLogo';

export function LoadingSpinner({ size = 20, label = 'Loading', className, showLabel = false }) {
  return (
    <span role="status" className={cn('inline-flex items-center gap-2 text-ink-muted', className)}>
      <Loader2 size={size} className="animate-spin text-brand-600" aria-hidden="true" />
      {showLabel ? <span className="text-sm">{label}</span> : <span className="sr-only">{label}</span>}
    </span>
  );
}

/** Full-screen loader shown while the session is being restored. */
export function FullPageLoader({ label = 'Loading your workspace' }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-canvas">
      <LogoMark size={40} />
      <LoadingSpinner label={label} showLabel />
    </div>
  );
}

export function Skeleton({ className }) {
  return <div className={cn('skeleton', className)} aria-hidden="true" />;
}

export default LoadingSpinner;
