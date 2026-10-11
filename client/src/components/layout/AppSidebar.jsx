import { NavLink } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../hooks/useNotifications';
import { cn } from '../../utils/cn';
import { AppLogo } from '../common/AppLogo';
import { Avatar } from '../common/Avatar';
import { NAV_SECTIONS } from './navigation';

export function NavItem({ item, badgeCount, onNavigate }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'group relative flex h-9 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors duration-150',
          isActive ? 'bg-brand-50 text-brand-700' : 'text-ink-secondary hover:bg-subtle hover:text-ink',
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && <span className="absolute -left-3 top-1.5 h-6 w-1 rounded-r-full bg-brand-600" aria-hidden="true" />}
          <Icon size={18} className={cn('shrink-0', isActive ? 'text-brand-700' : 'text-ink-muted group-hover:text-ink-secondary')} aria-hidden="true" />
          <span className="flex-1 truncate">{item.label}</span>
          {badgeCount > 0 && (
            <span className="tabular rounded-full bg-red-600 px-1.5 py-px text-2xs font-semibold text-white" aria-label={`${badgeCount} unread`}>
              {badgeCount > 99 ? '99+' : badgeCount}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

/** Desktop sidebar (lg and up). */
export function AppSidebar({ onLogout }) {
  const { employee } = useAuth();
  const { unreadCount } = useNotifications();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-surface lg:flex">
      <div className="flex h-16 items-center px-5">
        <AppLogo showTagline />
      </div>

      <nav aria-label="Main" className="scrollbar-thin flex-1 overflow-y-auto px-3 pb-4 pt-2">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mb-5">
            <p className="mb-1.5 px-3 text-2xs font-semibold uppercase tracking-wider text-ink-muted">{section.label}</p>
            <ul className="space-y-0.5">
              {section.items.map((item) => (
                <li key={item.to}>
                  <NavItem item={item} badgeCount={item.badge === 'unread' ? unreadCount : 0} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-line p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <Avatar name={employee?.fullName} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink">{employee?.fullName}</p>
            <p className="truncate text-xs text-ink-muted">{employee?.jobTitle}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="mt-1 flex h-9 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-ink-secondary transition-colors hover:bg-danger-soft hover:text-danger-ink"
        >
          <LogOut size={18} aria-hidden="true" />
          Log out
        </button>
      </div>
    </aside>
  );
}

export default AppSidebar;
