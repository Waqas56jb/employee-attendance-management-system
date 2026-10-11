import { CalendarClock, CheckCircle2, LogOut, Megaphone, RefreshCw, UserPlus } from 'lucide-react';
import { cn } from '../../utils/cn';

const META = {
  'new-assignment': { icon: UserPlus, classes: 'bg-brand-50 text-brand-700' },
  'assignment-update': { icon: RefreshCw, classes: 'bg-warning-soft text-warning-ink' },
  'shift-confirmation': { icon: CheckCircle2, classes: 'bg-success-soft text-success-ink' },
  'check-out': { icon: LogOut, classes: 'bg-success-soft text-success-ink' },
  'schedule-reminder': { icon: CalendarClock, classes: 'bg-info-soft text-info-ink' },
  announcement: { icon: Megaphone, classes: 'bg-subtle text-ink-secondary' },
};

export function NotificationIcon({ type, size = 'md' }) {
  const { icon: Icon, classes } = META[type] ?? META.announcement;
  return (
    <span className={cn('flex shrink-0 items-center justify-center rounded-lg', classes, size === 'sm' ? 'h-8 w-8' : 'h-10 w-10')}>
      <Icon size={size === 'sm' ? 15 : 18} aria-hidden="true" />
    </span>
  );
}

export default NotificationIcon;
