import { logActivity, mutate, resetDatabase, delay, ServiceError, diffFields } from './db';
import { highestUsedSequence } from '../utils/invoiceNumber';

export const TIMEZONES = [
  'Europe/Berlin',
  'Europe/Amsterdam',
  'Europe/Vienna',
  'Europe/Zurich',
  'Europe/Dublin',
  'Europe/London',
  'Europe/Paris',
  'Europe/Madrid',
  'Europe/Rome',
  'Europe/Warsaw',
  'Europe/Stockholm',
  'America/New_York',
  'UTC',
];

/** Logo stays in the browser as a data URL — nothing is uploaded in demo mode. */
export const LOGO_RULES = { maxBytes: 300 * 1024, types: ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'] };

export function readLogoFile(file) {
  return new Promise((resolve, reject) => {
    if (!LOGO_RULES.types.includes(file.type)) {
      reject(new ServiceError('Use a PNG, JPG, SVG or WebP image.'));
      return;
    }
    if (file.size > LOGO_RULES.maxBytes) {
      reject(new ServiceError('The logo must be 300 KB or smaller.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new ServiceError('The file could not be read.'));
    reader.readAsDataURL(file);
  });
}

export function updateBusinessProfile(values) {
  return mutate((draft) => {
    const before = { ...draft.business };
    draft.business = {
      ...draft.business,
      name: values.name.trim(),
      logo: values.logo ?? null,
      email: values.email.trim(),
      phone: values.phone.trim(),
      address: { street: values.street.trim(), postalCode: values.postalCode.trim(), city: values.city.trim(), country: values.country.trim() },
      website: values.website?.trim() ?? '',
      registrationNumber: values.registrationNumber?.trim() ?? '',
      taxId: values.taxId?.trim() ?? '',
      currency: values.currency,
      timezone: values.timezone,
    };
    const diff = diffFields(before, draft.business, ['name', 'email', 'phone', 'address', 'website', 'registrationNumber', 'taxId', 'currency', 'timezone']);
    logActivity(draft, {
      action: 'settings.business_updated',
      entityType: 'settings',
      entityId: 'business',
      summary: 'Updated business profile',
      previousValues: diff?.previous ?? null,
      newValues: diff?.next ?? (values.logo !== before.logo ? { logo: values.logo ? 'updated' : 'removed' } : null),
    });
    return draft.business;
  });
}

export function updateInvoiceSettings(values) {
  return mutate((draft) => {
    const year = new Date().getFullYear();
    const used = highestUsedSequence(values.prefix, draft.invoices.map((i) => i.invoiceNumber), year);
    if (Number(values.nextSequence) <= used) {
      throw new ServiceError(`Sequence ${values.nextSequence} would duplicate an existing invoice. Use ${used + 1} or higher.`, {
        field: 'nextSequence',
      });
    }
    const before = { ...draft.invoiceSettings };
    draft.invoiceSettings = {
      ...draft.invoiceSettings,
      ...values,
      prefix: values.prefix.trim().toUpperCase(),
      nextSequence: Number(values.nextSequence),
      defaultPaymentTerms: Number(values.defaultPaymentTerms),
      defaultTaxRate: Number(values.defaultTaxRate),
    };
    const diff = diffFields(before, draft.invoiceSettings, Object.keys(values));
    logActivity(draft, {
      action: 'settings.invoice_updated',
      entityType: 'settings',
      entityId: 'invoices',
      summary: 'Updated invoice settings',
      previousValues: diff?.previous ?? null,
      newValues: diff?.next ?? null,
    });
    return draft.invoiceSettings;
  });
}

export function updateWorkingHours(values) {
  return mutate((draft) => {
    const before = { ...draft.workingHours };
    draft.workingHours = {
      ...draft.workingHours,
      ...values,
      expectedDailyHours: Number(values.expectedDailyHours),
      defaultBreakMinutes: Number(values.defaultBreakMinutes),
      reviewShiftsOverHours: Number(values.reviewShiftsOverHours),
      openShiftAlertHours: Number(values.openShiftAlertHours),
      workingDays: [...values.workingDays].sort(),
    };
    const diff = diffFields(before, draft.workingHours, Object.keys(values));
    logActivity(draft, {
      action: 'settings.working_hours_updated',
      entityType: 'settings',
      entityId: 'working-hours',
      summary: 'Updated working-hours settings',
      previousValues: diff?.previous ?? null,
      newValues: diff?.next ?? null,
    });
    return draft.workingHours;
  });
}

export async function resetDemoData() {
  await delay(500);
  resetDatabase();
}
