import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { ArrowUpRight } from 'lucide-react';

const ICON_TONES = {
  brand: 'bg-brand-50 text-brand-700',
  success: 'bg-success-soft text-success-ink',
  warning: 'bg-warning-soft text-warning-ink',
  danger: 'bg-danger-soft text-danger-ink',
  info: 'bg-info-soft text-info-ink',
  neutral: 'bg-neutral-soft text-neutral-ink',
};

/** KPI tile. With `to`, the whole card links to the filtered detail view. */
export function StatCard({ label, value, icon: Icon, hint, tone = 'brand', to, className, footer }) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium text-ink-muted">{label}</p>
        {Icon && (
          <span className={clsx('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', ICON_TONES[tone])}>
            <Icon size={16} aria-hidden />
          </span>
        )}
      </div>
      <p className="tabular mt-1 truncate text-2xl font-semibold tracking-tight text-ink">{value}</p>
      {hint && <p className="mt-1 truncate text-xs text-ink-muted">{hint}</p>}
      {footer}
      {to && (
        <ArrowUpRight
          size={14}
          className="absolute bottom-4 right-4 text-ink-muted opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
          aria-hidden
        />
      )}
    </>
  );
  const classes = clsx('card group relative block p-4 transition-shadow', to && 'hover:border-line-strong hover:shadow-raised', className);
  return to ? (
    <Link to={to} className={classes}>
      {body}
    </Link>
  ) : (
    <div className={classes}>{body}</div>
  );
}
