import { useContext, useMemo } from 'react';
import { AttendanceContext } from '../context/AttendanceContext';
import { useNow } from './useNow';
import { usePreferences } from './usePreferences';
import {
  activeMinutesInRange,
  averageMinutesPerWorkingDay,
  getPeriodRange,
  isFinished,
  minutesBy,
  sumCompletedMinutes,
} from '../utils/dateUtils';

export function useAttendance() {
  const context = useContext(AttendanceContext);
  if (!context) throw new Error('useAttendance must be used inside <AttendanceProvider>.');
  return context;
}

/**
 * Derived working-time totals. Completed and in-progress minutes are kept
 * apart so active shifts are never mixed into confirmed totals by accident.
 * While a shift is active the values refresh every 30 seconds.
 */
export function useAttendanceSummary() {
  const { records, activeShift } = useAttendance();
  const { preferences } = usePreferences();
  const now = useNow(30_000, Boolean(activeShift));
  const { weekStartsOn } = preferences;

  return useMemo(() => {
    const today = getPeriodRange('today', now, weekStartsOn);
    const week = getPeriodRange('this-week', now, weekStartsOn);
    const month = getPeriodRange('this-month', now, weekStartsOn);
    const finished = records.filter(isFinished);

    const period = (range) => {
      const completed = sumCompletedMinutes(finished, range);
      const active = activeMinutesInRange(activeShift, range, now);
      return { completed, active, total: completed + active };
    };

    return {
      today: period(today),
      week: period(week),
      month: period(month),
      completedShifts: finished.length,
      completedShiftsThisWeek: finished.filter((r) => new Date(r.checkInAt) >= week.start && new Date(r.checkInAt) <= week.end).length,
      averageDailyMinutes: averageMinutesPerWorkingDay(finished),
      minutesByProject: minutesBy(finished, 'projectId'),
      minutesByCustomer: minutesBy(finished, 'customerId'),
      now,
    };
  }, [records, activeShift, now, weekStartsOn]);
}
