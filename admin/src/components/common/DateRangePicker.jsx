import { CalendarRange } from 'lucide-react';
import clsx from 'clsx';
import { getPresetRange, matchPreset, PERIOD_PRESETS } from '../../utils/dateUtils';
import { SelectField } from './SelectField';

/**
 * From/to date inputs plus a preset selector (this week, last month, …).
 * value: { from: 'yyyy-MM-dd' | '', to: 'yyyy-MM-dd' | '' }
 */
export function DateRangePicker({ value, onChange, presets = PERIOD_PRESETS, allowAll = true, className, compact = false, label = 'Period' }) {
  const preset = !value.from && !value.to ? 'all' : matchPreset(value, presets);
  const options = [
    ...(allowAll ? [{ value: 'all', label: 'All dates' }] : []),
    ...presets,
    { value: 'custom', label: 'Custom range' },
  ];

  const onPreset = (next) => {
    if (next === 'all') onChange({ from: '', to: '' });
    else if (next !== 'custom') onChange(getPresetRange(next));
  };

  return (
    <fieldset className={clsx('flex flex-wrap items-center gap-2', className)}>
      <legend className="sr-only">{label}</legend>
      <div className="flex items-center gap-2">
        <CalendarRange size={16} className="hidden text-ink-muted sm:block" aria-hidden />
        <SelectField
          aria-label={`${label} preset`}
          size="sm"
          value={preset}
          onChange={(e) => onPreset(e.target.value)}
          options={options}
          className={compact ? 'w-36' : 'w-40'}
        />
      </div>
      <div className="flex w-full min-w-0 items-center gap-1.5 sm:w-auto">
        <input
          type="date"
          aria-label={`${label} start date`}
          className="input h-9 min-w-0 flex-1 py-1.5 sm:w-[9.5rem] sm:flex-none"
          value={value.from}
          max={value.to || undefined}
          onChange={(e) => onChange({ ...value, from: e.target.value })}
        />
        <span className="text-ink-muted" aria-hidden>
          –
        </span>
        <input
          type="date"
          aria-label={`${label} end date`}
          className="input h-9 min-w-0 flex-1 py-1.5 sm:w-[9.5rem] sm:flex-none"
          value={value.to}
          min={value.from || undefined}
          onChange={(e) => onChange({ ...value, to: e.target.value })}
        />
      </div>
    </fieldset>
  );
}
