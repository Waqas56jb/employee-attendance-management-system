import { Link } from 'react-router-dom';
import { Briefcase, Building2, ClipboardCheck, FilePlus2, UserPlus, Zap } from 'lucide-react';
import { Card, CardHeader } from '../common/Card';

const ACTIONS = [
  { to: '/employees/new', label: 'Add employee', hint: 'Create a staff profile', icon: UserPlus },
  { to: '/customers/new', label: 'Add customer', hint: 'Billing details & terms', icon: Building2 },
  { to: '/projects/new', label: 'Create project', hint: 'Site, team and target hours', icon: Briefcase },
  { to: '/attendance?status=needs_review', label: 'Review attendance', hint: 'Shifts awaiting approval', icon: ClipboardCheck, countKey: 'review' },
  { to: '/invoices/new', label: 'Create invoice', hint: 'From approved billable hours', icon: FilePlus2 },
];

export function QuickActions({ reviewCount = 0 }) {
  return (
    <Card>
      <CardHeader icon={Zap} title="Quick actions" />
      <ul className="grid grid-cols-1 gap-1 p-2 sm:grid-cols-2 lg:grid-cols-1">
        {ACTIONS.map(({ to, label, hint, icon: Icon, countKey }) => (
          <li key={to}>
            <Link to={to} className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-subtle">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700" aria-hidden>
                <Icon size={16} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-ink">{label}</span>
                <span className="block truncate text-xs text-ink-muted">{hint}</span>
              </span>
              {countKey === 'review' && reviewCount > 0 && (
                <span className="tabular rounded-full bg-warning-soft px-2 py-0.5 text-2xs font-semibold text-warning-ink">
                  {reviewCount}
                  <span className="sr-only"> waiting</span>
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
