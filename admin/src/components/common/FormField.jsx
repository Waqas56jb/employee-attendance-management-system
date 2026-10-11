import { cloneElement, forwardRef, isValidElement, useId } from 'react';
import clsx from 'clsx';
import { AlertCircle } from 'lucide-react';

/**
 * Label + control + hint/error. The control receives id, aria-invalid and
 * aria-describedby automatically so screen readers announce errors.
 */
export function FormField({ label, error, hint, required, optional, className, children, labelAction, htmlFor }) {
  const generatedId = useId();
  // Pass `htmlFor` when the control is nested inside a wrapper element.
  const id = htmlFor ?? children?.props?.id ?? generatedId;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined;

  const control = isValidElement(children) && !htmlFor
    ? cloneElement(children, { id, 'aria-invalid': error ? 'true' : undefined, 'aria-describedby': describedBy, 'aria-required': required || undefined })
    : children;

  return (
    <div className={className}>
      {label && (
        <div className="flex items-center justify-between gap-2">
          <label htmlFor={id} className="label">
            {label}
            {required && (
              <span className="ml-0.5 text-danger" aria-hidden>
                *
              </span>
            )}
            {optional && <span className="ml-1.5 text-xs font-normal text-ink-muted">Optional</span>}
          </label>
          {labelAction}
        </div>
      )}
      {control}
      {hint && !error && (
        <p id={hintId} className="mt-1.5 text-xs text-ink-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 flex items-start gap-1 text-xs font-medium text-danger-ink">
          <AlertCircle size={13} className="mt-px shrink-0" aria-hidden />
          {error}
        </p>
      )}
    </div>
  );
}

export const Input = forwardRef(function Input({ className, prefix, suffix, ...props }, ref) {
  if (prefix || suffix) {
    return (
      <div className="relative">
        {prefix && <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-ink-muted">{prefix}</span>}
        <input ref={ref} className={clsx('input', prefix && 'pl-8', suffix && 'pr-12', className)} {...props} />
        {suffix && <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-ink-muted">{suffix}</span>}
      </div>
    );
  }
  return <input ref={ref} className={clsx('input', className)} {...props} />;
});

export const Textarea = forwardRef(function Textarea({ className, rows = 3, ...props }, ref) {
  return <textarea ref={ref} rows={rows} className={clsx('input resize-y', className)} {...props} />;
});

export const Checkbox = forwardRef(function Checkbox({ label, description, className, ...props }, ref) {
  return (
    <label className={clsx('flex cursor-pointer items-start gap-2.5', className)}>
      <input
        ref={ref}
        type="checkbox"
        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-line-strong text-brand-600 accent-brand-600 focus-visible:outline-2"
        {...props}
      />
      <span className="min-w-0">
        <span className="block text-sm text-ink">{label}</span>
        {description && <span className="block text-xs text-ink-muted">{description}</span>}
      </span>
    </label>
  );
});

/** Grid helper for forms: one column on phones, two on larger screens. */
export function FormGrid({ className, children }) {
  return <div className={clsx('grid grid-cols-1 gap-4 sm:grid-cols-2', className)}>{children}</div>;
}

export function FormSection({ title, description, children, className }) {
  return (
    <section className={clsx('card', className)}>
      <div className="border-b border-line px-5 py-4">
        <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-ink-muted">{description}</p>}
      </div>
      <div className="px-5 py-5">{children}</div>
    </section>
  );
}
