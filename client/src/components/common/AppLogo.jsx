import { config } from '../../services/config';
import { cn } from '../../utils/cn';

export function LogoMark({ className, size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={cn('shrink-0', className)} aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="rgb(var(--brand-600))" />
      <circle cx="16" cy="16" r="8.5" stroke="#fff" strokeWidth="2.4" />
      <path d="M16 11.5V16l3 2" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function AppLogo({ className, showTagline = false, inverted = false }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark />
      <span className="flex flex-col leading-tight">
        <span className={cn('text-[15px] font-semibold tracking-tight', inverted ? 'text-white' : 'text-ink')}>
          {config.appName}
        </span>
        {showTagline && (
          <span className={cn('text-2xs font-medium', inverted ? 'text-white/70' : 'text-ink-muted')}>Employee Portal</span>
        )}
      </span>
    </span>
  );
}

export default AppLogo;
