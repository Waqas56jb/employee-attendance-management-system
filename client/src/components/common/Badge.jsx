import { cn } from '../../utils/cn';

const TONES = {
  neutral: 'bg-neutral-soft text-neutral-ink ring-line',
  brand: 'bg-brand-50 text-brand-700 ring-brand-200/70',
  success: 'bg-success-soft text-success-ink ring-success/25',
  warning: 'bg-warning-soft text-warning-ink ring-warning/30',
  danger: 'bg-danger-soft text-danger-ink ring-danger/25',
  info: 'bg-info-soft text-info-ink ring-info/25',
};

const DOTS = {
  neutral: 'bg-ink-muted',
  brand: 'bg-brand-500',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
};

export function Badge({ tone = 'neutral', dot = false, pulse = false, icon: Icon, className, children }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        TONES[tone],
        className,
      )}
    >
      {dot && (
        <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
          {pulse && <span className={cn('absolute inline-flex h-full w-full animate-pulse-ring rounded-full', DOTS[tone])} />}
          <span className={cn('relative inline-flex h-1.5 w-1.5 rounded-full', DOTS[tone])} />
        </span>
      )}
      {Icon && <Icon size={12} aria-hidden="true" />}
      {children}
    </span>
  );
}

export default Badge;
