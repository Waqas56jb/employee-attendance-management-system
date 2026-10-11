import { RotateCcw, Save } from 'lucide-react';
import { Button } from '../common/Button';

/** Sticky footer with dirty state, Discard and Save for settings forms. */
export function SettingsSaveBar({ isDirty, isSubmitting, onDiscard }) {
  return (
    <div className="sticky bottom-0 z-10 -mx-1 mt-6 rounded-xl border border-line bg-surface/95 px-4 py-3 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-surface/85">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-ink-muted" aria-live="polite">
          {isSubmitting ? 'Saving changes…' : isDirty ? (
            <span className="font-medium text-warning-ink">You have unsaved changes.</span>
          ) : (
            'All changes saved.'
          )}
        </p>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <Button variant="secondary" icon={RotateCcw} onClick={onDiscard} disabled={!isDirty || isSubmitting}>
            Discard
          </Button>
          <Button type="submit" icon={Save} loading={isSubmitting} disabled={!isDirty}>
            Save changes
          </Button>
        </div>
      </div>
    </div>
  );
}
