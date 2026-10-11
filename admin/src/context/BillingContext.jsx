import { createContext, useMemo } from 'react';
import { useDb } from '../hooks/useStore';
import * as billingService from '../services/billingService';

export const BillingContext = createContext(null);

export function BillingProvider({ children }) {
  const db = useDb();
  const { hourlyRates } = db;

  const value = useMemo(
    () => ({
      hourlyRates,
      listRates: (customerId) => billingService.listRates(db, customerId),
      getBillingRows: (filters) => billingService.getBillingRows(db, filters),
      previewRateImpact: (input) => billingService.previewRateImpact(db, input),
      createRate: billingService.createRate,
      updateRate: billingService.updateRate,
      deactivateRate: billingService.deactivateRate,
    }),
    // Billing rows depend on attendance and invoices as well as rates.
    [db, hourlyRates],
  );

  return <BillingContext.Provider value={value}>{children}</BillingContext.Provider>;
}
