import { Search, X } from 'lucide-react';
import clsx from 'clsx';

export function SearchInput({ value, onChange, placeholder = 'Search…', className, label = 'Search', autoFocus }) {
  return (
    <div className={clsx('relative', className)}>
      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" aria-hidden />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        autoFocus={autoFocus}
        className="input h-9 py-1.5 pl-9 pr-8 [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-ink-muted hover:text-ink"
          aria-label="Clear search"
        >
          <X size={14} aria-hidden />
        </button>
      )}
    </div>
  );
}
