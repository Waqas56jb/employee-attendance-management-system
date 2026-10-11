import { useContext } from 'react';
import { ShiftDialogContext } from '../context/ShiftDialogContext';

/** { openCheckIn(projectId?), openCheckOut() } */
export function useShiftDialogs() {
  const context = useContext(ShiftDialogContext);
  if (!context) throw new Error('useShiftDialogs must be used inside <ShiftDialogProvider>.');
  return context;
}
