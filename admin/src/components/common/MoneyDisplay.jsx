import clsx from 'clsx';
import { formatMoney } from '../../utils/currency';

/** Renders minor-unit amounts with tabular figures. */
export function MoneyDisplay({ amount, currency = 'EUR', compact = false, className, muted = false, negative = false }) {
  const value = negative ? -Math.abs(amount ?? 0) : amount ?? 0;
  return (
    <span className={clsx('tabular whitespace-nowrap', muted && 'text-ink-muted', className)}>
      {formatMoney(value, currency, { compact })}
    </span>
  );
}
