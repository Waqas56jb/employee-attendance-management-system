import { NavLink } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../hooks/useNotifications';
import { cn } from '../../utils/cn';
import { AppLogo, LogoMark } from '../common/AppLogo';
import { Avatar } from '../common/Avatar';
import { NAV_SECTIONS } from './navigation';

/**
 * One navigation entry. Tablet (md): icon with a short label underneath, in a
 * narrow rail. Desktop (lg): icon + full label in a row.
 */
export function NavItem({ item, badgeCount }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      title={item.label}
      className={({ isActive }) =>
        cn(
          'press group relative flex items-center rounded-lg font-medium transition-colors duration-150',
          'flex-col gap-1 px-1 py-2 text-[10.5px] lg:h-9 lg:flex-row lg:gap-3 lg:px-3 lg:py-0 lg:text-sm',
          isActive ? 'bg-brand-50 text-brand-700' : 'text-ink-secondary hover:bg-subtle hover:text-ink',
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && <span className="absolute -left-3 top-1.5 hidden h-6 w-1 rounded-r-full bg-brand-600 lg:block" aria-hidden="true" />}
          <span className="relative">
            <Icon
              size={20}
              className={cn('shrink-0 lg:h-[18px] lg:w-[18px]', isActive ? 'text-brand-700' : 'text-ink-muted group-hover:text-ink-secondary')}
              aria-hidden="true"
            />
            {badgeCount > 0 && (
              <span className="absolute -right-1.5 -top-1 h-2.5 w-2.5 rounded-full bg-red-600 ring-2 ring-surface lg:hidden" aria-hidden="true" />
            )}
          </span>
          <span className="max-w-full truncate lg:hidden">{item.shortLabel ?? item.label}</span>
          <span className="hidden flex-1 truncate lg:block">{item.label}</span>
          {badgeCount > 0 && (
            <span className="tabular hidden rounded-full bg-red-600 px-1.5 py-px text-2xs font-semibold text-white lg:inline" aria-label={`${badgeCount} unread`}>
              {badgeCount > 99 ? '99+' : badgeCount}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

/** Tablet icon rail (md) / desktop sidebar (lg). Hidden on phones, which use the bottom tab bar. */
export function AppSidebar({ onLogout }) {
  const { employee } = useAuth();
  const { unreadCount } = useNotifications();

  return (
    <aside className="safe-top fixed inset-y-0 left-0 z-30 hidden w-24 flex-col border-r border-line bg-surface md:flex lg:w-64">
      <div className="flex h-16 items-center justify-center px-5 lg:justify-start">
        <span className="lg:hidden">
          <LogoMark size={32} />
        </span>
        <span className="hidden lg:block">
          <AppLogo showTagline />
        </span>
      </div>

      <nav aria-label="Main" className="scrollbar-thin flex-1 overflow-y-auto px-2 pb-4 pt-2 lg:px-3">
        {NAV_SECTIONS.map((section, index) => (
          <div key={section.label} className={cn('mb-3 lg:mb-5', index > 0 && 'border-t border-line pt-3 lg:border-0 lg:pt-0')}>
            <p className="mb-1.5 hidden px-3 text-2xs font-semibold uppercase tracking-wider text-ink-muted lg:block">{section.label}</p>
            <ul className="space-y-1 lg:space-y-0.5">
              {section.items.map((item) => (
                <li key={item.to}>
                  <NavItem item={item} badgeCount={item.badge === 'unread' ? unreadCount : 0} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-line p-2 lg:p-3">
        <div className="flex items-center justify-center gap-3 rounded-lg py-2 lg:justify-start lg:px-2">
          <Avatar name={employee?.fullName} size="sm" />
          <div className="hidden min-w-0 flex-1 lg:block">
            <p className="truncate text-sm font-medium text-ink">{employee?.fullName}</p>
            <p className="truncate text-xs text-ink-muted">{employee?.jobTitle}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onLogout}
          title="Log out"
          className="press mt-1 flex w-full flex-col items-center gap-1 rounded-lg px-1 py-2 text-[10.5px] font-medium text-ink-secondary transition-colors hover:bg-danger-soft hover:text-danger-ink lg:h-9 lg:flex-row lg:gap-3 lg:px-3 lg:py-0 lg:text-sm"
        >
          <LogOut size={18} aria-hidden="true" />
          Log out
        </button>
      </div>
    </aside>
  );
}

export default AppSidebar;
