import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { Check, Search, X } from 'lucide-react';

/**
 * Searchable checkbox list for assignments (employees ↔ projects).
 * options: [{ value, label, description?, disabled?, disabledReason? }]
 */
export function MultiSelect({ options, value = [], onChange, placeholder = 'Search…', emptyText = 'No options available', id, maxHeight = 'max-h-64', ...aria }) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => `${o.label} ${o.description ?? ''}`.toLowerCase().includes(q)) : options;
  }, [options, query]);
  const selected = options.filter((o) => value.includes(o.value));

  const toggle = (option) => {
    if (option.disabled && !value.includes(option.value)) return;
    onChange(value.includes(option.value) ? value.filter((v) => v !== option.value) : [...value, option.value]);
  };

  return (
    <div id={id} className="rounded-lg border border-line-strong bg-surface" {...aria}>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-b border-line p-2">
          {selected.map((o) => (
            <span key={o.value} className="inline-flex items-center gap-1 rounded-md bg-brand-50 py-0.5 pl-2 pr-1 text-xs font-medium text-brand-700">
              {o.label}
              <button type="button" onClick={() => toggle({ ...o, disabled: false })} className="rounded p-0.5 hover:bg-brand-100" aria-label={`Remove ${o.label}`}>
                <X size={12} aria-hidden />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="relative border-b border-line">
        <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          aria-label="Filter options"
          className="w-full rounded-none bg-transparent py-2 pl-8 pr-3 text-sm text-ink placeholder:text-ink-muted focus:outline-none"
        />
      </div>
      <ul className={clsx('scrollbar-thin overflow-y-auto p-1', maxHeight)} role="listbox" aria-multiselectable="true">
        {filtered.length === 0 && <li className="px-3 py-4 text-center text-sm text-ink-muted">{emptyText}</li>}
        {filtered.map((option) => {
          const checked = value.includes(option.value);
          const blocked = option.disabled && !checked;
          return (
            <li key={option.value} role="option" aria-selected={checked} aria-disabled={blocked || undefined}>
              <button
                type="button"
                onClick={() => toggle(option)}
                disabled={blocked}
                className={clsx(
                  'flex w-full items-start gap-2.5 rounded-md px-2.5 py-2 text-left text-sm',
                  blocked ? 'cursor-not-allowed opacity-60' : 'hover:bg-subtle',
                )}
              >
                <span
                  className={clsx(
                    'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                    checked ? 'border-brand-600 bg-brand-600 text-white' : 'border-line-strong bg-surface',
                  )}
                  aria-hidden
                >
                  {checked && <Check size={12} strokeWidth={3} />}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-ink">{option.label}</span>
                  {(option.description || (blocked && option.disabledReason)) && (
                    <span className="block truncate text-xs text-ink-muted">{blocked ? option.disabledReason : option.description}</span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
