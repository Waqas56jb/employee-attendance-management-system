import { useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, Settings, User } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../utils/cn';
import { Avatar } from '../common/Avatar';

/** Avatar button with a keyboard-accessible account dropdown. */
export function AccountMenu({ onLogout, compact = false }) {
  const { employee } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const menuId = useId();

  const items = [
    { label: 'My Profile', icon: User, action: () => navigate('/profile') },
    { label: 'Settings', icon: Settings, action: () => navigate('/settings') },
    { label: 'Log out', icon: LogOut, action: onLogout, danger: true },
  ];

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    rootRef.current?.querySelector('[role="menuitem"]')?.focus();
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const onMenuKeyDown = (e) => {
    const nodes = [...rootRef.current.querySelectorAll('[role="menuitem"]')];
    const index = nodes.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      nodes[(index + 1) % nodes.length]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      nodes[(index - 1 + nodes.length) % nodes.length]?.focus();
    } else if (e.key === 'Tab') {
      setOpen(false);
    }
  };

  const name = employee?.displayName || employee?.fullName;

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`Account menu for ${employee?.fullName ?? 'employee'}`}
        className={cn(
          'flex items-center gap-2 rounded-full transition-colors hover:bg-subtle',
          compact ? 'p-0.5' : 'py-1 pl-1 pr-2.5',
        )}
      >
        <Avatar name={employee?.fullName} size="sm" />
        {!compact && (
          <>
            <span className="hidden max-w-[140px] truncate text-sm font-medium text-ink xl:inline">{name}</span>
            <ChevronDown size={14} className="text-ink-muted" aria-hidden="true" />
          </>
        )}
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="Account"
          onKeyDown={onMenuKeyDown}
          className="absolute right-0 top-full z-40 mt-2 w-60 origin-top-right animate-scale-in rounded-xl border border-line bg-surface p-1.5 shadow-overlay"
        >
          <div className="mb-1 border-b border-line px-2.5 pb-2.5 pt-1.5">
            <p className="truncate text-sm font-semibold text-ink">{employee?.fullName}</p>
            <p className="truncate text-xs text-ink-muted">{employee?.email}</p>
          </div>
          {items.map(({ label, icon: Icon, action, danger }) => (
            <button
              key={label}
              type="button"
              role="menuitem"
              tabIndex={-1}
              onClick={() => {
                setOpen(false);
                action();
              }}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors focus:outline-none',
                danger ? 'text-danger-ink hover:bg-danger-soft focus:bg-danger-soft' : 'text-ink hover:bg-subtle focus:bg-subtle',
              )}
            >
              <Icon size={16} aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default AccountMenu;
