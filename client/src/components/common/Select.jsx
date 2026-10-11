import { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../utils/cn';

/** Styled native <select> — keeps native keyboard and mobile behavior. */
export const Select = forwardRef(function Select({ className, children, size = 'md', ...props }, ref) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cn('input appearance-none pr-9', size === 'sm' && 'h-9 py-1.5', className)}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        size={16}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted"
        aria-hidden="true"
      />
    </div>
  );
});

export default Select;
