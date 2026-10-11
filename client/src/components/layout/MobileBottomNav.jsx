import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { CalendarDays, ChevronRight, FolderKanban, LayoutDashboard, LogOut, Menu, Play, Timer } from 'lucide-react';
import { useAttendance } from '../../hooks/useAttendance';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../hooks/useNotifications';
import { useNow } from '../../hooks/useNow';
import { cn } from '../../utils/cn';
import { elapsedMs } from '../../utils/dateUtils';
import { formatElapsed } from '../../utils/formatters';
import { Avatar } from '../common/Avatar';
import { Modal } from '../common/Modal';
import { ALL_NAV_ITEMS } from './navigation';

const TABS_LEFT = [
  { to: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { to: '/attendance', label: 'Attendance', icon: CalendarDays },
];
const TABS_RIGHT = [{ to: '/projects', label: 'Projects', icon: FolderKanban }];
const MORE_ITEMS = ['/customers', '/notifications', '/profile', '/settings'];

/** True while a text field has focus, i.e. the on-screen keyboard is probably open. */
function useKeyboardOpen() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const isTextField = (el) =>
      el instanceof HTMLElement &&
      (el.tagName === 'TEXTAREA' ||
        el.tagName === 'SELECT' ||
        (el.tagName === 'INPUT' && !['checkbox', 'radio', 'button', 'submit'].includes(el.type)));
    const onFocusIn = (e) => setOpen(isTextField(e.target));
    const onFocusOut = () => setOpen(false);
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    return () => {
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
    };
  }, []);
  return open;
}

function Tab({ to, label, icon: Icon, badge }) {
  return (
    <li className="flex flex-1">
      <NavLink
        to={to}
        className={({ isActive }) =>
          cn(
            'press flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 pt-1.5 text-[11px] font-medium',
            isActive ? 'text-brand-700' : 'text-ink-muted',
          )
        }
      >
        {({ isActive }) => (
          <>
            <span className={cn('relative flex h-8 w-14 items-center justify-center rounded-full transition-colors', isActive && 'bg-brand-50')}>
              <Icon size={22} strokeWidth={isActive ? 2.3 : 1.9} aria-hidden="true" />
              {badge}
            </span>
            <span className="max-w-full truncate">{label}</span>
          </>
        )}
      </NavLink>
    </li>
  );
}

/** Center action: big round Check In / live-timer button, like a native attendance app. */
function ShiftTab() {
  const { activeShift } = useAttendance();
  const now = useNow(1000, Boolean(activeShift));
  const label = activeShift ? formatElapsed(elapsedMs(activeShift.checkInAt, now)).slice(0, 5) : 'Check in';

  return (
    <li className="flex flex-1 justify-center">
      <NavLink
        to="/check-in-out"
        aria-label={activeShift ? `Shift in progress, ${label} elapsed. Open check-out.` : 'Check in'}
        className="press relative -mt-4 flex flex-col items-center gap-1 text-[11px] font-semibold"
      >
        {({ isActive }) => (
          <>
            <span
              className={cn(
                'relative flex h-14 w-14 items-center justify-center rounded-full text-white shadow-raised ring-4 ring-surface transition-colors',
                activeShift ? 'bg-emerald-600' : 'bg-brand-600',
              )}
            >
              {activeShift && <span className="absolute inset-0 animate-pulse-ring rounded-full bg-emerald-500/40" aria-hidden="true" />}
              {activeShift ? <Timer size={24} aria-hidden="true" /> : <Play size={24} className="ml-0.5" aria-hidden="true" />}
            </span>
            <span className={cn('tabular', activeShift ? 'font-mono text-success-ink' : isActive ? 'text-brand-700' : 'text-ink-secondary')}>
              {label}
            </span>
          </>
        )}
      </NavLink>
    </li>
  );
}

/** Phone tab bar (below md) + "More" bottom sheet. */
export function MobileBottomNav({ onLogout }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const { employee } = useAuth();
  const { unreadCount } = useNotifications();
  const location = useLocation();
  const keyboardOpen = useKeyboardOpen();

  const secondary = MORE_ITEMS.map((to) => ALL_NAV_ITEMS.find((i) => i.to === to));
  const moreActive = secondary.some((i) => location.pathname.startsWith(i.to));

  useEffect(() => setMoreOpen(false), [location.pathname]);

  return (
    <>
      <nav
        aria-label="Primary"
        className={cn(
          'safe-bottom safe-x fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur-xl transition-transform duration-200 md:hidden',
          keyboardOpen && 'translate-y-full',
        )}
      >
        <ul className="mx-auto flex h-16 max-w-lg items-stretch px-1">
          {TABS_LEFT.map((t) => (
            <Tab key={t.to} {...t} />
          ))}
          <ShiftTab />
          {TABS_RIGHT.map((t) => (
            <Tab key={t.to} {...t} />
          ))}
          <li className="flex flex-1">
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className={cn(
                'press flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 pt-1.5 text-[11px] font-medium',
                moreActive ? 'text-brand-700' : 'text-ink-muted',
              )}
              aria-haspopup="dialog"
              aria-label={unreadCount ? `More, ${unreadCount} unread notifications` : 'More'}
            >
              <span className={cn('relative flex h-8 w-14 items-center justify-center rounded-full', moreActive && 'bg-brand-50')}>
                <Menu size={22} aria-hidden="true" />
                {unreadCount > 0 && (
                  <span className="absolute right-3 top-0.5 h-2.5 w-2.5 rounded-full bg-red-600 ring-2 ring-surface" aria-hidden="true" />
                )}
              </span>
              <span>More</span>
            </button>
          </li>
        </ul>
      </nav>

      <Modal open={moreOpen} onClose={() => setMoreOpen(false)} title="More" size="sm">
        <NavLink to="/profile" className="press -mx-1 mb-3 flex items-center gap-3 rounded-xl bg-canvas p-3 ring-1 ring-line">
          <Avatar name={employee?.fullName} size="md" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold text-ink">{employee?.fullName}</p>
            <p className="truncate text-xs text-ink-muted">
              {employee?.jobTitle} · {employee?.employeeNumber}
            </p>
          </div>
          <ChevronRight size={18} className="text-ink-muted" aria-hidden="true" />
        </NavLink>
        <ul className="-mx-2 space-y-0.5">
          {secondary.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'press flex h-12 items-center gap-3 rounded-lg px-3 text-[15px] font-medium',
                      isActive ? 'bg-brand-50 text-brand-700' : 'text-ink',
                    )
                  }
                >
                  <Icon size={20} aria-hidden="true" className="text-ink-muted" />
                  <span className="flex-1">{item.label}</span>
                  {item.badge === 'unread' && unreadCount > 0 && (
                    <span className="tabular rounded-full bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">{unreadCount}</span>
                  )}
                  <ChevronRight size={16} className="text-ink-muted" aria-hidden="true" />
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
              className="press flex h-12 w-full items-center gap-3 rounded-lg px-3 text-[15px] font-medium text-danger-ink"
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
