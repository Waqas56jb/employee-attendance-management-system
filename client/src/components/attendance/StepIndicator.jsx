import { Check } from 'lucide-react';
import { cn } from '../../utils/cn';

export function StepIndicator({ steps, current }) {
  return (
    <ol className="mb-5 flex items-center gap-2" aria-label="Progress">
      {steps.map((label, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li key={label} className="flex min-w-0 flex-1 items-center gap-2" aria-current={active ? 'step' : undefined}>
            <span
              className={cn(
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors',
                done && 'bg-brand-600 text-white',
                active && 'bg-brand-50 text-brand-700 ring-2 ring-brand-500',
                !done && !active && 'bg-subtle text-ink-muted',
              )}
            >
              {done ? <Check size={13} strokeWidth={3} aria-hidden="true" /> : index + 1}
            </span>
            <span className={cn('truncate text-xs font-medium', active ? 'text-ink' : 'text-ink-muted')}>
              {label}
              {done && <span className="sr-only"> (completed)</span>}
            </span>
            {index < steps.length - 1 && <span className="h-px min-w-3 flex-1 bg-line" aria-hidden="true" />}
          </li>
        );
      })}
    </ol>
  );
}

export default StepIndicator;
