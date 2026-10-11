import clsx from 'clsx';
import { Check } from 'lucide-react';

/**
 * Visible stepper for the invoice wizard. Steps up to `maxReached` can be
 * revisited by clicking; later steps unlock as the wizard progresses.
 */
export function InvoiceWizardSteps({ steps, current, maxReached, onSelect }) {
  const progress = ((current + 1) / steps.length) * 100;
  return (
    <nav aria-label="Invoice steps" className="card px-4 py-3">
      {/* Phones: compact label + progress bar */}
      <div className="md:hidden">
        <p className="text-xs font-medium text-ink-muted">
          Step {current + 1} of {steps.length}
        </p>
        <p className="text-sm font-semibold text-ink">{steps[current].label}</p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-subtle" aria-hidden>
          <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <ol className="hidden items-center gap-1 md:flex">
        {steps.map((step, index) => {
          const done = index < current;
          const active = index === current;
          const reachable = index <= maxReached;
          return (
            <li key={step.label} className="flex min-w-0 flex-1 items-center gap-1">
              <button
                type="button"
                onClick={() => reachable && onSelect(index)}
                disabled={!reachable}
                aria-current={active ? 'step' : undefined}
                className={clsx(
                  'flex min-w-0 items-center gap-2 rounded-lg px-1.5 py-1 text-left transition-colors',
                  reachable && !active && 'hover:bg-subtle',
                  !reachable && 'cursor-not-allowed opacity-60',
                )}
              >
                <span
                  className={clsx(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                    active && 'bg-brand-600 text-white',
                    done && 'bg-brand-50 text-brand-700 ring-1 ring-brand-200',
                    !active && !done && 'bg-subtle text-ink-muted ring-1 ring-line',
                  )}
                >
                  {done ? <Check size={13} aria-hidden /> : index + 1}
                </span>
                <span className={clsx('truncate text-xs font-medium', active ? 'text-ink' : 'text-ink-muted')}>{step.label}</span>
              </button>
              {index < steps.length - 1 && <span className={clsx('h-px min-w-3 flex-1', done ? 'bg-brand-300' : 'bg-line')} aria-hidden />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
