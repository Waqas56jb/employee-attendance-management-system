import { useMemo } from 'react';
import { usePreferences } from './usePreferences';
import { formatDate, formatDuration, formatTime } from '../utils/formatters';

/** Date/time formatters bound to the employee's clock and date preferences. */
export function useFormatters() {
  const { preferences } = usePreferences();
  const { clockFormat, dateFormat } = preferences;

  return useMemo(
    () => ({
      time: (value, withSeconds = false) => formatTime(value, clockFormat, withSeconds),
      date: (value) => formatDate(value, dateFormat),
      dateTime: (value) => `${formatDate(value, dateFormat)}, ${formatTime(value, clockFormat)}`,
      duration: formatDuration,
    }),
    [clockFormat, dateFormat],
  );
}
