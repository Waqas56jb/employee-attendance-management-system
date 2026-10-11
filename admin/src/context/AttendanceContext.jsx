import { createContext, useMemo } from 'react';
import { useDb } from '../hooks/useStore';
import * as attendanceService from '../services/attendanceService';

export const AttendanceContext = createContext(null);

export function AttendanceProvider({ children }) {
  const db = useDb();
  const { attendance } = db;

  const value = useMemo(
    () => ({
      attendance,
      attendanceById: Object.fromEntries(attendance.map((a) => [a.id, a])),
      getBillingImpact: (id) => attendanceService.getBillingImpact(db, id),
      correctAttendance: attendanceService.correctAttendance,
      closeOpenShift: attendanceService.closeOpenShift,
      approveAttendance: attendanceService.approveAttendance,
      markForReview: attendanceService.markForReview,
      cancelAttendance: attendanceService.cancelAttendance,
      restoreAttendance: attendanceService.restoreAttendance,
      createManualAttendance: attendanceService.createManualAttendance,
      adjustBillableMinutes: attendanceService.adjustBillableMinutes,
      excludeFromBilling: attendanceService.excludeFromBilling,
      includeInBilling: attendanceService.includeInBilling,
    }),
    // getBillingImpact reads invoices too, so depend on the whole snapshot.
    [db, attendance],
  );

  return <AttendanceContext.Provider value={value}>{children}</AttendanceContext.Provider>;
}
