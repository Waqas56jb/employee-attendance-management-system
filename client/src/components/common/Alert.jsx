import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { cn } from '../../utils/cn';

const TONES = {
  info: { classes: 'border-info/25 bg-info-soft text-info-ink', icon: Info },
  success: { classes: 'border-success/25 bg-success-soft text-success-ink', icon: CheckCircle2 },
  warning: { classes: 'border-warning/30 bg-warning-soft text-warning-ink', icon: AlertTriangle },
  danger: { classes: 'border-danger/25 bg-danger-soft text-danger-ink', icon: XCircle },
  neutral: { classes: 'border-line bg-subtle text-ink-secondary', icon: Info },
};

export function Alert({ tone = 'info', title, children, icon, action, className, live = false }) {
  const { classes, icon: DefaultIcon } = TONES[tone];
  const Icon = icon ?? DefaultIcon;
  return (
    <div
      role={live ? (tone === 'danger' ? 'alert' : 'status') : undefined}
      className={cn('flex gap-3 rounded-xl border px-4 py-3 text-sm', classes, className)}
    >
      <Icon size={18} className="mt-px shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn(title && 'mt-0.5', 'opacity-90')}>{children}</div>}
      </div>
      {action && <div className="shrink-0 self-center">{action}</div>}
    </div>
  );
}

export default Alert;
