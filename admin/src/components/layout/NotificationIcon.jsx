import clsx from 'clsx';
import { Bell, Briefcase, Building2, Clock, Receipt, UserPlus, Wallet, BadgeEuro } from 'lucide-react';

const TYPES = {
  attendance: { icon: Clock, classes: 'bg-warning-soft text-warning-ink' },
  invoice: { icon: Receipt, classes: 'bg-info-soft text-info-ink' },
  payment: { icon: BadgeEuro, classes: 'bg-success-soft text-success-ink' },
  billing: { icon: Wallet, classes: 'bg-brand-50 text-brand-700' },
  project: { icon: Briefcase, classes: 'bg-brand-50 text-brand-700' },
  employee: { icon: UserPlus, classes: 'bg-success-soft text-success-ink' },
  customer: { icon: Building2, classes: 'bg-info-soft text-info-ink' },
};

export function NotificationIcon({ type, size = 'md' }) {
  const meta = TYPES[type] ?? { icon: Bell, classes: 'bg-subtle text-ink-muted' };
  const Icon = meta.icon;
  return (
    <span className={clsx('flex shrink-0 items-center justify-center rounded-lg', size === 'sm' ? 'h-7 w-7' : 'h-8 w-8', meta.classes)} aria-hidden>
      <Icon size={size === 'sm' ? 14 : 16} />
    </span>
  );
}
