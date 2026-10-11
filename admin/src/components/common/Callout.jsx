import clsx from 'clsx';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';

const TONES = {
  info: { classes: 'border-info/25 bg-info-soft text-info-ink', icon: Info },
  warning: { classes: 'border-warning/30 bg-warning-soft text-warning-ink', icon: AlertTriangle },
  danger: { classes: 'border-danger/25 bg-danger-soft text-danger-ink', icon: XCircle },
  success: { classes: 'border-success/25 bg-success-soft text-success-ink', icon: CheckCircle2 },
  demo: { classes: 'border-brand-200 bg-brand-50 text-brand-700', icon: Info },
};

/** Inline notice: warnings, demo-mode explanations, backend requirements. */
export function Callout({ tone = 'info', title, children, action, className }) {
  const { classes, icon: Icon } = TONES[tone];
  return (
    <div role={tone === 'danger' || tone === 'warning' ? 'alert' : 'note'} className={clsx('flex gap-3 rounded-lg border px-4 py-3 text-sm', classes, className)}>
      <Icon size={16} className="mt-0.5 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={clsx(title && 'mt-0.5', 'opacity-90')}>{children}</div>}
      </div>
      {action && <div className="shrink-0 self-center">{action}</div>}
    </div>
  );
}
