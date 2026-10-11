import { forwardRef } from 'react';
import clsx from 'clsx';
import { ChevronDown } from 'lucide-react';

/**
 * Native <select> (best keyboard and mobile support) with consistent styling.
 * options: [{ value, label, disabled? }] or grouped: [{ label, options: [...] }]
 */
export const SelectField = forwardRef(function SelectField(
  { options = [], placeholder, className, size = 'md', 'aria-label': ariaLabel, ...props },
  ref,
) {
  return (
    <div className={clsx('relative', className)}>
      <select
        ref={ref}
        aria-label={ariaLabel}
        className={clsx('input appearance-none pr-9', size === 'sm' && 'h-9 py-1.5')}
        {...props}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((option) =>
          option.options ? (
            <optgroup key={option.label} label={option.label}>
              {option.options.map((o) => (
                <option key={o.value} value={o.value} disabled={o.disabled}>
                  {o.label}
                </option>
              ))}
            </optgroup>
          ) : (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ),
        )}
      </select>
      <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted" aria-hidden />
    </div>
  );
});
