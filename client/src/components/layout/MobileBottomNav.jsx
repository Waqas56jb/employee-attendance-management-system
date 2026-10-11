import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LogOut, Menu } from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';
import { cn } from '../../utils/cn';
import { Modal } from '../common/Modal';
import { ALL_NAV_ITEMS, MOBILE_PRIMARY } from './navigation';

/** Bottom tab bar for phones and tablets; secondary pages live in the "More" sheet. */
export function MobileBottomNav({ onLogout }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const { unreadCount } = useNotifications();
  const location = useLocation();

  const primary = MOBILE_PRIMARY.map((to) => ALL_NAV_ITEMS.find((i) => i.to === to));
  const secondary = ALL_NAV_ITEMS.filter((i) => !MOBILE_PRIMARY.includes(i.to));
  const moreActive = secondary.some((i) => location.pathname.startsWith(i.to));

  useEffect(() => setMoreOpen(false), [location.pathname]);

  const tabClass = (active) =>
    cn(
      'flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-medium transition-colors',
      active ? 'text-brand-700' : 'text-ink-muted hover:text-ink',
    );

  return (
    <>
      <nav
        aria-label="Primary"
        className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur-md lg:hidden"
      >
        <ul className="mx-auto flex h-16 max-w-lg items-stretch gap-1 px-2">
          {primary.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.to} className="flex flex-1">
                <NavLink to={item.to} className={({ isActive }) => tabClass(isActive)}>
                  {({ isActive }) => (
                    <>
                      <span className={cn('flex h-7 w-12 items-center justify-center rounded-full transition-colors', isActive && 'bg-brand-50')}>
                        <Icon size={20} aria-hidden="true" />
                      </span>
                      <span className="max-w-full truncate">{item.shortLabel ?? item.label}</span>
                    </>
                  )}
                </NavLink>
              </li>
            );
          })}
          <li className="flex flex-1">
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className={tabClass(moreActive)}
              aria-haspopup="dialog"
              aria-label={unreadCount ? `More, ${unreadCount} unread notifications` : 'More'}
            >
              <span className={cn('relative flex h-7 w-12 items-center justify-center rounded-full', moreActive && 'bg-brand-50')}>
                <Menu size={20} aria-hidden="true" />
                {unreadCount > 0 && <span className="absolute right-2.5 top-0.5 h-2 w-2 rounded-full bg-red-600 ring-2 ring-surface" aria-hidden="true" />}
              </span>
              <span>More</span>
            </button>
          </li>
        </ul>
      </nav>

      <Modal open={moreOpen} onClose={() => setMoreOpen(false)} title="More" size="sm">
        <ul className="-mx-2 space-y-0.5">
          {secondary.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'flex h-12 items-center gap-3 rounded-lg px-3 text-[15px] font-medium transition-colors',
                      isActive ? 'bg-brand-50 text-brand-700' : 'text-ink hover:bg-subtle',
                    )
                  }
                >
                  <Icon size={20} aria-hidden="true" className="text-ink-muted" />
                  <span className="flex-1">{item.label}</span>
                  {item.badge === 'unread' && unreadCount > 0 && (
                    <span className="tabular rounded-full bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">{unreadCount}</span>
                  )}
                </NavLink>
              </li>
            );
          })}
          <li className="mt-2 border-t border-line pt-2">
            <button
              type="button"
              onClick={() => {
                setMoreOpen(false);
                onLogout();
              }}
              className="flex h-12 w-full items-center gap-3 rounded-lg px-3 text-[15px] font-medium text-danger-ink hover:bg-danger-soft"
            >
              <LogOut size={20} aria-hidden="true" />
              Log out
            </button>
          </li>
        </ul>
      </Modal>
    </>
  );
}

export default MobileBottomNav;
