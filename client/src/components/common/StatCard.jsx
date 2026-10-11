import { cn } from '../../utils/cn';
import { Skeleton } from './LoadingSpinner';

const ICON_TONES = {
  brand: 'bg-brand-50 text-brand-700',
  success: 'bg-success-soft text-success-ink',
  warning: 'bg-warning-soft text-warning-ink',
  info: 'bg-info-soft text-info-ink',
  neutral: 'bg-subtle text-ink-secondary',
};

export function StatCard({ icon: Icon, label, value, unit, hint, tone = 'brand', loading = false, className }) {
  return (
    <div className={cn('card flex flex-col gap-3 p-4 sm:p-5', className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">{label}</p>
        {Icon && (
          <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', ICON_TONES[tone])}>
            <Icon size={16} aria-hidden="true" />
          </span>
        )}
      </div>
      {loading ? (
        <>
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-3.5 w-32" />
        </>
      ) : (
        <>
          <p className="tabular flex items-baseline gap-1 text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">
            {value}
            {unit && <span className="text-sm font-medium text-ink-muted">{unit}</span>}
          </p>
          {hint && <p className="text-xs text-ink-muted">{hint}</p>}
        </>
      )}
    </div>
  );
}

export default StatCard;
