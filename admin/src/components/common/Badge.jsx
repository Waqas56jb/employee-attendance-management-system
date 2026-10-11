import clsx from 'clsx';

const TONES = {
  success: 'bg-success-soft text-success-ink ring-success/25',
  warning: 'bg-warning-soft text-warning-ink ring-warning/30',
  danger: 'bg-danger-soft text-danger-ink ring-danger/25',
  info: 'bg-info-soft text-info-ink ring-info/25',
  neutral: 'bg-neutral-soft text-neutral-ink ring-line-strong/70',
  brand: 'bg-brand-50 text-brand-700 ring-brand-200',
};

const DOTS = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
  neutral: 'bg-ink-muted',
  brand: 'bg-brand-500',
};

/** Small pill. Always pair color with a text label (and optionally an icon). */
export function Badge({ tone = 'neutral', icon: Icon, dot = false, pulse = false, className, children, title }) {
  return (
    <span
      title={title}
      className={clsx(
        'inline-flex max-w-full items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        TONES[tone],
        className,
      )}
    >
      {dot && (
        <span className="relative flex h-1.5 w-1.5" aria-hidden>
          {pulse && <span className={clsx('absolute inline-flex h-full w-full animate-pulse-ring rounded-full', DOTS[tone])} />}
          <span className={clsx('relative inline-flex h-1.5 w-1.5 rounded-full', DOTS[tone])} />
        </span>
      )}
      {Icon && <Icon size={12} aria-hidden className="shrink-0" />}
      <span className="truncate">{children}</span>
    </span>
  );
}
