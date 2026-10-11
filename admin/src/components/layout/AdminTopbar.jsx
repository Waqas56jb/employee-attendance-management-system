import { Menu } from 'lucide-react';
import { GlobalSearch } from './GlobalSearch';
import { NotificationDropdown } from './NotificationDropdown';
import { UserMenu } from './UserMenu';

export function AdminTopbar({ onOpenNav, onLogout }) {
  return (
    <header className="no-print sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-surface/90 px-4 backdrop-blur sm:px-6">
      <button
        type="button"
        onClick={onOpenNav}
        className="-ml-1 inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-secondary hover:bg-subtle lg:hidden"
        aria-label="Open navigation"
      >
        <Menu size={20} aria-hidden />
      </button>
      <div className="min-w-0 flex-1">
        <GlobalSearch />
      </div>
      <span className="hidden items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-2xs font-semibold uppercase tracking-wide text-brand-700 xl:inline-flex" title="Data is stored in this browser only">
        Demo mode
      </span>
      <NotificationDropdown />
      <UserMenu onLogout={onLogout} />
    </header>
  );
}
