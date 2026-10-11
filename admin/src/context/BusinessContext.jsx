import { createContext, useMemo } from 'react';
import { useDb } from '../hooks/useStore';
import { refreshTimeRules } from '../services/db';
import * as settingsService from '../services/settingsService';

export const BusinessContext = createContext(null);

/** Business profile, invoice defaults and working-hours rules. */
export function BusinessProvider({ children }) {
  const { business, invoiceSettings, workingHours, admin, seededAt } = useDb();

  const value = useMemo(
    () => ({
      business,
      invoiceSettings,
      workingHours,
      admin,
      seededAt,
      updateBusinessProfile: settingsService.updateBusinessProfile,
      updateInvoiceSettings: settingsService.updateInvoiceSettings,
      updateWorkingHours: settingsService.updateWorkingHours,
      resetDemoData: settingsService.resetDemoData,
      refreshTimeRules,
    }),
    [business, invoiceSettings, workingHours, admin, seededAt],
  );

  return <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>;
}
