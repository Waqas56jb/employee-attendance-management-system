import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { AppLogo } from '../common/AppLogo';
import { SidebarNav } from './AdminSidebar';

/** Slide-in navigation drawer for phones and tablets. */
export function MobileNavigation({ open, onClose, onLogout }) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    requestAnimationFrame(() => panelRef.current?.querySelector('a,button')?.focus());
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 animate-fade-in bg-ink/40" aria-hidden onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        className="absolute inset-y-0 left-0 flex w-[84%] max-w-xs animate-fade-in flex-col bg-surface shadow-overlay"
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-line px-4">
          <AppLogo />
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-ink-muted hover:bg-subtle" aria-label="Close navigation">
            <X size={18} aria-hidden />
          </button>
        </div>
        <SidebarNav onNavigate={onClose} onLogout={onLogout} />
      </div>
    </div>,
    document.body,
  );
}
