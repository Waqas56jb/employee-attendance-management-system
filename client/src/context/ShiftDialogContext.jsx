import { createContext, useCallback, useMemo, useState } from 'react';
import { CheckInDialog } from '../components/attendance/CheckInDialog';
import { CheckOutDialog } from '../components/attendance/CheckOutDialog';

export const ShiftDialogContext = createContext(null);

/**
 * Renders the check-in and check-out dialogs once for the whole workspace so
 * any page (dashboard, project details, header) can open them.
 */
export function ShiftDialogProvider({ children }) {
  const [dialog, setDialog] = useState({ type: null, projectId: null });

  const openCheckIn = useCallback((projectId = null) => setDialog({ type: 'check-in', projectId }), []);
  const openCheckOut = useCallback(() => setDialog({ type: 'check-out', projectId: null }), []);
  const close = useCallback(() => setDialog((d) => ({ ...d, type: null })), []);

  const value = useMemo(() => ({ openCheckIn, openCheckOut }), [openCheckIn, openCheckOut]);

  return (
    <ShiftDialogContext.Provider value={value}>
      {children}
      <CheckInDialog open={dialog.type === 'check-in'} defaultProjectId={dialog.projectId} onClose={close} />
      <CheckOutDialog open={dialog.type === 'check-out'} onClose={close} />
    </ShiftDialogContext.Provider>
  );
}
