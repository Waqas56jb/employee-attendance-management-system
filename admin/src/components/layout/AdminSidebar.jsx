import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import { ChevronsLeft, ChevronsRight, LogOut } from 'lucide-react';
import { AppLogo } from '../common/AppLogo';
import { NAV_GROUPS } from './navigation';
import { useNavBadges } from './useNavBadges';

const BADGE_TONES = {
  warning: 'bg-warning-soft text-warning-ink',
  danger: 'bg-danger-soft text-danger-ink',
  brand: 'bg-brand-100 text-brand-700',
};

/** Navigation list shared by the desktop sidebar and the mobile drawer. */
export function SidebarNav({ collapsed = false, onNavigate, onLogout }) {
  const badges = useNavBadges();
  return (
    <nav aria-label="Main navigation" className="scrollbar-thin flex-1 overflow-y-auto px-3 py-4">
      {NAV_GROUPS.map((group) => (
        <div key={group.label} className="mb-5 last:mb-0">
          {!collapsed ? (
            <p className="mb-1.5 px-2 text-2xs font-semibold uppercase tracking-wider text-ink-muted">{group.label}</p>
          ) : (
            <div className="mx-auto mb-2 h-px w-6 bg-line" aria-hidden />
          )}
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const badge = item.badgeKey ? badges[item.badgeKey] : null;
              return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    onClick={onNavigate}
                    title={collapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      clsx(
                        'group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors',
                        collapsed && 'justify-center px-0',
                        isActive ? 'bg-brand-50 text-brand-700' : 'text-ink-secondary hover:bg-subtle hover:text-ink',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-brand-600" aria-hidden />}
                        <item.icon size={18} className={clsx('shrink-0', isActive ? 'text-brand-600' : 'text-ink-muted group-hover:text-ink-secondary')} aria-hidden />
                        {!collapsed && <span className="min-w-0 flex-1 truncate">{item.label}</span>}
                        {badge &&
                          (collapsed ? (
                            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-danger" aria-label={badge.label} />
                          ) : (
                            <span className={clsx('rounded-full px-1.5 py-px text-2xs font-semibold tabular', BADGE_TONES[badge.tone])} aria-label={badge.label}>
                              {badge.count}
                            </span>
                          ))}
                        {collapsed && <span className="sr-only">{item.label}</span>}
                      </>
                    )}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      <div className="mt-5 border-t border-line pt-4">
        <button
          type="button"
          onClick={onLogout}
          title={collapsed ? 'Logout' : undefined}
          className={clsx(
            'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-ink-secondary hover:bg-danger-soft hover:text-danger-ink',
            collapsed && 'justify-center px-0',
          )}
        >
          <LogOut size={18} className="shrink-0" aria-hidden />
          {!collapsed ? <span>Logout</span> : <span className="sr-only">Logout</span>}
        </button>
      </div>
    </nav>
  );
}

export function AdminSidebar({ collapsed, onToggle, onLogout }) {
  return (
    <aside
      className={clsx(
        'fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-line bg-surface transition-[width] duration-200 lg:flex',
        collapsed ? 'w-[72px]' : 'w-64',
      )}
    >
      <div className={clsx('flex h-16 shrink-0 items-center border-b border-line', collapsed ? 'justify-center px-2' : 'px-5')}>
        <NavLink to="/dashboard" aria-label="Shiftwise admin home" className="rounded-lg">
          <AppLogo collapsed={collapsed} />
        </NavLink>
      </div>
      <SidebarNav collapsed={collapsed} onLogout={onLogout} />
      <div className="border-t border-line p-3">
        <button
          type="button"
          onClick={onToggle}
          className={clsx('flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-ink-muted hover:bg-subtle hover:text-ink', collapsed && 'justify-center')}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
        >
          {collapsed ? <ChevronsRight size={16} aria-hidden /> : <ChevronsLeft size={16} aria-hidden />}
          {!collapsed && 'Collapse'}
        </button>
      </div>
    </aside>
  );
}
