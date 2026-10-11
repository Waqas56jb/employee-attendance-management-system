import { cn } from '../../utils/cn';

/**
 * A group of mutually exclusive options rendered as a radio group.
 * options: [{ value, label, icon?, count? }]
 */
export function SegmentedControl({ label, options, value, onChange, className, size = 'md' }) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('inline-flex rounded-lg border border-line bg-subtle p-0.5', className)}>
      {options.map((option) => {
        const selected = option.value === value;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-medium transition-colors duration-150',
              size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-8 px-3 text-sm',
              selected ? 'bg-surface text-ink shadow-card' : 'text-ink-muted hover:text-ink',
            )}
          >
            {Icon && <Icon size={14} aria-hidden="true" />}
            {option.label}
            {option.count != null && (
              <span
                className={cn(
                  'tabular rounded-full px-1.5 text-2xs font-semibold',
                  selected ? 'bg-brand-50 text-brand-700' : 'bg-line text-ink-secondary',
                )}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default SegmentedControl;
