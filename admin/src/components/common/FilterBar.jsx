import { RotateCcw } from 'lucide-react';
import { Button } from './Button';
import { formatNumber } from '../../utils/formatters';

/**
 * Wrapper for list filters: controls on the left, match count, reset and
 * extra actions (export) on the right.
 */
export function FilterBar({ children, count, noun = 'record', isFiltered, onReset, actions }) {
  return (
    <div className="flex flex-col gap-3 border-b border-line px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-1 flex-wrap items-center gap-2 [&>*]:min-w-0">{children}</div>
      <div className="flex flex-wrap items-center gap-2">
        {count !== undefined && (
          <span className="text-xs text-ink-muted" aria-live="polite">
            {formatNumber(count)} {count === 1 ? noun : `${noun}s`}
          </span>
        )}
        {isFiltered && onReset && (
          <Button variant="ghost" size="sm" icon={RotateCcw} onClick={onReset}>
            Reset
          </Button>
        )}
        {actions}
      </div>
    </div>
  );
}
