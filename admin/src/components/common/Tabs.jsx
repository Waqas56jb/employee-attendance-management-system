import { useId, useRef } from 'react';
import clsx from 'clsx';

/**
 * WAI-ARIA tabs (arrow keys move between tabs).
 * tabs: [{ value, label, count? }]
 */
export function Tabs({ tabs, value, onChange, className, label = 'Sections' }) {
  const baseId = useId();
  const refs = useRef([]);

  const onKeyDown = (event, index) => {
    const delta = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (!delta) return;
    event.preventDefault();
    const next = (index + delta + tabs.length) % tabs.length;
    onChange(tabs[next].value);
    refs.current[next]?.focus();
  };

  return (
    <div className={clsx('scrollbar-thin -mx-1 overflow-x-auto px-1', className)}>
      <div role="tablist" aria-label={label} className="flex min-w-max gap-1 border-b border-line">
        {tabs.map((tab, index) => {
          const selected = tab.value === value;
          return (
            <button
              key={tab.value}
              ref={(el) => {
                refs.current[index] = el;
              }}
              id={`${baseId}-${tab.value}`}
              role="tab"
              type="button"
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(tab.value)}
              onKeyDown={(e) => onKeyDown(e, index)}
              className={clsx(
                '-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
                selected ? 'border-brand-600 text-brand-700' : 'border-transparent text-ink-muted hover:border-line-strong hover:text-ink',
              )}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className={clsx('rounded-full px-1.5 py-px text-2xs font-semibold', selected ? 'bg-brand-50 text-brand-700' : 'bg-subtle text-ink-muted')}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
