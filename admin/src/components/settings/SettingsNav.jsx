import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import { Building2, Clock, FileText } from 'lucide-react';

const LINKS = [
  { to: '/settings/business', label: 'Business profile', icon: Building2 },
  { to: '/settings/invoices', label: 'Invoices', icon: FileText },
  { to: '/settings/working-hours', label: 'Working hours', icon: Clock },
];

/** Sub-navigation shared by the three settings pages. */
export function SettingsNav() {
  return (
    <nav aria-label="Settings sections" className="mb-6 overflow-x-auto border-b border-line">
      <ul className="-mb-px flex min-w-max gap-1">
        {LINKS.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive ? 'border-brand-600 text-brand-700' : 'border-transparent text-ink-muted hover:border-line-strong hover:text-ink',
                )
              }
            >
              <Icon size={15} aria-hidden />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
