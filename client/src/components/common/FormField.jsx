import { AlertCircle } from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * Label + control + hint/error. The control should set
 * aria-describedby={`${id}-error`} / `${id}-hint` and aria-invalid.
 */
export function FormField({ id, label, error, hint, required, optional, className, children, labelAction }) {
  return (
    <div className={cn('min-w-0', className)}>
      {label && (
        <div className="flex items-center justify-between gap-2">
          <label htmlFor={id} className="label">
            {label}
            {required && (
              <span className="ml-0.5 text-danger-ink" aria-hidden="true">
                *
              </span>
            )}
            {optional && <span className="ml-1.5 text-xs font-normal text-ink-muted">Optional</span>}
          </label>
          {labelAction}
        </div>
      )}
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1.5 flex items-start gap-1.5 text-xs font-medium text-danger-ink">
          <AlertCircle size={14} className="mt-px shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="mt-1.5 text-xs text-ink-muted">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

/** aria props for a control inside FormField. */
export function fieldAria(id, error, hint) {
  return {
    id,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? `${id}-error` : hint ? `${id}-hint` : undefined,
  };
}

export default FormField;
