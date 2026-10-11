import { cloneElement, useId, useState } from 'react';
import { cn } from '../../utils/cn';

/**
 * Lightweight tooltip shown on hover and keyboard focus. The child must be a
 * single focusable element; it receives aria-describedby.
 */
export function Tooltip({ content, children, side = 'top', align = 'center', className }) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
    >
      {cloneElement(children, { 'aria-describedby': id })}
      <span
        id={id}
        role="tooltip"
        className={cn(
          'pointer-events-none absolute z-40 w-max max-w-[220px] animate-fade-in rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white shadow-raised',
          side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2',
          align === 'end' ? 'right-0' : align === 'start' ? 'left-0' : 'left-1/2 -translate-x-1/2',
          // Removed from layout while closed so it never widens the page; still usable as an aria description.
          !open && 'hidden',
          className,
        )}
      >
        {content}
      </span>
    </span>
  );
}

export default Tooltip;
