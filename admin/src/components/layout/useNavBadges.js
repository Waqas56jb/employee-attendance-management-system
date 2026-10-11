import { useMemo } from 'react';
import { useAttendance } from '../../hooks/useAttendance';
import { useInvoices } from '../../hooks/useInvoices';
import { useNotifications } from '../../hooks/useNotifications';
import { useBusiness } from '../../hooks/useBusiness';
import { isMissingCheckout, requiresReview } from '../../utils/calculations';

/** Counts that need attention, shown as sidebar badges. */
export function useNavBadges() {
  const { attendance } = useAttendance();
  const { invoices } = useInvoices();
  const { unreadCount } = useNotifications();
  const { workingHours } = useBusiness();

  return useMemo(() => {
    const now = new Date();
    const attention = attendance.filter(
      (a) => (a.checkOutAt && a.status !== 'cancelled' && requiresReview(a, workingHours)) || isMissingCheckout(a, { now, openShiftAlertHours: workingHours.openShiftAlertHours }),
    ).length;
    return {
      attendance: attention ? { count: attention, tone: 'warning', label: `${attention} attendance records need attention` } : null,
      invoices: (() => {
        const overdue = invoices.filter((i) => i.status === 'overdue').length;
        return overdue ? { count: overdue, tone: 'danger', label: `${overdue} overdue invoices` } : null;
      })(),
      notifications: unreadCount ? { count: unreadCount, tone: 'brand', label: `${unreadCount} unread notifications` } : null,
    };
  }, [attendance, invoices, unreadCount, workingHours]);
}
