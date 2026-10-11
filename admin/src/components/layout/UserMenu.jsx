import { useCallback, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, LogOut, RotateCcw, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../hooks/useAuth';
import { useBusiness } from '../../hooks/useBusiness';
import { useClickOutside } from '../../hooks/useClickOutside';
import { Avatar } from '../common/Avatar';
import { ConfirmDialog } from '../common/ConfirmDialog';

export function UserMenu({ onLogout }) {
  const [open, setOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const ref = useRef(null);
  const { user } = useAuth();
  const { resetDemoData } = useBusiness();
  const close = useCallback(() => setOpen(false), []);
  useClickOutside(ref, close, open);

  const reset = async () => {
    await resetDemoData();
    toast.success('Demo data was reset to its initial state.');
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 hover:bg-subtle"
      >
        <Avatar name={user?.name} size="sm" />
        <span className="hidden text-left leading-tight md:block">
          <span className="block text-sm font-medium text-ink">{user?.name}</span>
          <span className="block text-2xs text-ink-muted">{user?.role}</span>
        </span>
        <ChevronDown size={14} className="hidden text-ink-muted md:block" aria-hidden />
        <span className="sr-only">Account menu</span>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-11 z-40 w-64 animate-scale-in rounded-xl border border-line bg-surface p-1.5 shadow-overlay">
          <div className="px-3 py-2.5">
            <p className="truncate text-sm font-semibold text-ink">{user?.name}</p>
            <p className="truncate text-xs text-ink-muted">{user?.email}</p>
          </div>
          <div className="my-1 h-px bg-line" />
          <Link role="menuitem" to="/settings/business" onClick={close} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink-secondary hover:bg-subtle hover:text-ink">
            <Settings2 size={16} aria-hidden /> Business settings
          </Link>
          <button
            role="menuitem"
            type="button"
            onClick={() => {
              close();
              setConfirmReset(true);
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink-secondary hover:bg-subtle hover:text-ink"
          >
            <RotateCcw size={16} aria-hidden /> Reset demo data
          </button>
          <div className="my-1 h-px bg-line" />
          <button
            role="menuitem"
            type="button"
            onClick={() => {
              close();
              onLogout();
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-danger-ink hover:bg-danger-soft"
          >
            <LogOut size={16} aria-hidden /> Log out
          </button>
        </div>
      )}
      <ConfirmDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={reset}
        title="Reset demo data?"
        confirmLabel="Reset demo data"
        message={
          <>
            All changes made in this browser — new employees, corrections, invoices, payments and settings — will be discarded and the original sample
            dataset restored. This cannot be undone.
          </>
        }
      />
    </div>
  );
}
