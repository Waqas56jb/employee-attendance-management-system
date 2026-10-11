import { ServerCog } from 'lucide-react';

/** Marks a setting whose rule must also be enforced by the backend / employee app. */
export function BackendHint({ children = 'Backend enforcement' }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-subtle px-1.5 py-0.5 text-2xs font-medium text-ink-secondary ring-1 ring-inset ring-line">
      <ServerCog size={11} aria-hidden />
      {children}
    </span>
  );
}

/** Marks a setting that already changes behaviour in this admin panel. */
export function UiEffectHint({ children = 'Affects the UI now' }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-brand-50 px-1.5 py-0.5 text-2xs font-medium text-brand-700 ring-1 ring-inset ring-brand-200">
      {children}
    </span>
  );
}
