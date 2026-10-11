import clsx from 'clsx';

/** Product mark. Business logos (settings) are used on invoices, not here. */
export function AppLogo({ collapsed = false, className, inverted = false }) {
  return (
    <span className={clsx('flex items-center gap-2.5', className)}>
      <svg viewBox="0 0 32 32" className="h-8 w-8 shrink-0" aria-hidden>
        <rect width="32" height="32" rx="8" fill="#4F46E5" />
        <circle cx="16" cy="16" r="8.5" stroke="#fff" strokeWidth="2.4" fill="none" />
        <path d="M16 11.5V16l3 2" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
      {!collapsed && (
        <span className="flex flex-col leading-none">
          <span className={clsx('text-[15px] font-semibold tracking-tight', inverted ? 'text-white' : 'text-ink')}>Shiftwise</span>
          <span className={clsx('mt-0.5 text-2xs font-medium uppercase tracking-wider', inverted ? 'text-white/60' : 'text-ink-muted')}>
            Admin console
          </span>
        </span>
      )}
    </span>
  );
}
