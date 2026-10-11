import { z } from 'zod';
import { SUPPORTED_CURRENCIES } from './currency';

/**
 * Zod schemas for every administrator form. Forms use these through
 * @hookform/resolvers; services re-check the business rules that depend on
 * other records (uniqueness, relationships) because a schema cannot see them.
 */

const requiredText = (label, max = 120) =>
  z.string({ required_error: `${label} is required.` }).trim().min(1, `${label} is required.`).max(max, `${label} is too long.`);

const optionalText = (max = 500) => z.string().trim().max(max, 'This text is too long.').optional().or(z.literal(''));

const email = z.string().trim().min(1, 'Email is required.').email('Enter a valid email address.');

const phone = z
  .string()
  .trim()
  .min(1, 'Phone number is required.')
  .regex(/^[+()\d\s-]{6,20}$/, 'Enter a valid phone number (digits, spaces, +, -, parentheses).');

const optionalPhone = z
  .string()
  .trim()
  .regex(/^[+()\d\s-]{6,20}$/, 'Enter a valid phone number.')
  .optional()
  .or(z.literal(''));

const dateKey = (label) =>
  z
    .string({ required_error: `${label} is required.` })
    .regex(/^\d{4}-\d{2}-\d{2}$/, `${label} is required.`);

const optionalDateKey = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid date.')
  .optional()
  .or(z.literal(''));

const currencyCode = z.enum(SUPPORTED_CURRENCIES.map((c) => c.code), {
  errorMap: () => ({ message: 'Select a supported currency.' }),
});

/** Money entered in major units (e.g. "35.50"); converted to minor units by services. */
const moneyInput = (label, { min = 0, allowZero = true } = {}) =>
  z.coerce
    .number({ invalid_type_error: `${label} must be a number.` })
    .refine((v) => Number.isFinite(v), `${label} must be a number.`)
    .refine((v) => (allowZero ? v >= min : v > min), allowZero ? `${label} cannot be negative.` : `${label} must be greater than ${min}.`)
    .refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-6, 'Use at most two decimal places.')
    .refine((v) => v <= 1_000_000, `${label} is unrealistically large.`);

const percentInput = (label) =>
  z.coerce
    .number({ invalid_type_error: `${label} must be a number.` })
    .min(0, `${label} cannot be negative.`)
    .max(100, `${label} cannot exceed 100%.`);

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required.'),
  remember: z.boolean().optional(),
});

export const forgotPasswordSchema = z.object({ email });

export const employeeSchema = z.object({
  fullName: requiredText('Full name', 80),
  employeeNumber: requiredText('Employee ID', 20).regex(/^[A-Za-z0-9-]+$/, 'Use letters, numbers and dashes only.'),
  email,
  phone,
  jobTitle: requiredText('Job title', 80),
  department: requiredText('Department', 80),
  employmentStartDate: dateKey('Start date'),
  status: z.enum(['active', 'inactive', 'archived']),
  notes: optionalText(1000),
  assignedProjectIds: z.array(z.string()).default([]),
});

export const customerSchema = z.object({
  companyName: requiredText('Company name', 120),
  customerNumber: requiredText('Customer reference', 20).regex(/^[A-Za-z0-9-]+$/, 'Use letters, numbers and dashes only.'),
  contactPerson: requiredText('Contact person', 80),
  email,
  phone,
  billingStreet: requiredText('Billing address', 160),
  serviceStreet: optionalText(160),
  postalCode: requiredText('Postal code', 12),
  city: requiredText('City', 80),
  country: requiredText('Country', 80),
  taxId: optionalText(40),
  paymentTerms: z.coerce.number().int('Whole days only.').min(0, 'Cannot be negative.').max(180, 'At most 180 days.'),
  currency: currencyCode,
  defaultHourlyRate: moneyInput('Hourly rate', { allowZero: false }),
  taxRate: z.union([percentInput('Tax rate'), z.literal('')]).optional(),
  notes: optionalText(1000),
  status: z.enum(['active', 'inactive', 'archived']),
});

export const projectSchema = z
  .object({
    name: requiredText('Project name', 120),
    projectNumber: requiredText('Project reference', 20).regex(/^[A-Za-z0-9-]+$/, 'Use letters, numbers and dashes only.'),
    customerId: z.string().min(1, 'Select a customer.'),
    description: optionalText(1000),
    address: requiredText('Work address', 200),
    startDate: dateKey('Start date'),
    endDate: optionalDateKey,
    status: z.enum(['planned', 'active', 'on_hold', 'completed', 'archived']),
    assignedEmployeeIds: z.array(z.string()).default([]),
    instructions: optionalText(2000),
    targetHours: z.union([z.coerce.number().min(0, 'Cannot be negative.').max(100000), z.literal('')]).optional(),
    internalNotes: optionalText(2000),
  })
  .refine((v) => !v.endDate || v.endDate >= v.startDate, {
    path: ['endDate'],
    message: 'End date must be on or after the start date.',
  });

export const attendanceCorrectionSchema = z
  .object({
    checkInAt: z.string().min(1, 'Check-in time is required.'),
    checkOutAt: z.string().optional().or(z.literal('')),
    customerId: z.string().min(1, 'Select a customer.'),
    projectId: z.string().min(1, 'Select a project.'),
    checkInNote: optionalText(500),
    checkOutNote: optionalText(500),
    reason: requiredText('Correction reason', 500).min(5, 'Describe the reason in at least 5 characters.'),
  })
  .refine((v) => !v.checkOutAt || new Date(v.checkOutAt) > new Date(v.checkInAt), {
    path: ['checkOutAt'],
    message: 'Check-out must be after check-in.',
  });

export const closeShiftSchema = z.object({
  checkOutAt: z.string().min(1, 'Check-out time is required.'),
  reason: requiredText('Correction reason', 500).min(5, 'Describe the reason in at least 5 characters.'),
});

export const reasonSchema = z.object({
  reason: requiredText('Reason', 500).min(5, 'Describe the reason in at least 5 characters.'),
});

export const billableAdjustmentSchema = z.object({
  billableHours: z.coerce.number({ invalid_type_error: 'Enter hours as a number.' }).min(0, 'Cannot be negative.').max(24, 'At most 24 hours per record.'),
  reason: requiredText('Adjustment reason', 500).min(5, 'Describe the reason in at least 5 characters.'),
});

export const hourlyRateSchema = z
  .object({
    customerId: z.string().min(1, 'Select a customer.'),
    amount: moneyInput('Hourly rate', { allowZero: false }),
    currency: currencyCode,
    effectiveFrom: dateKey('Effective from'),
    effectiveTo: optionalDateKey,
    notes: optionalText(300),
  })
  .refine((v) => !v.effectiveTo || v.effectiveTo >= v.effectiveFrom, {
    path: ['effectiveTo'],
    message: 'End date must be on or after the start date.',
  });

export const paymentSchema = z.object({
  paymentDate: dateKey('Payment date'),
  amount: moneyInput('Amount', { allowZero: false }),
  method: z.enum(['bank_transfer', 'cash', 'card', 'other']),
  reference: optionalText(80),
  notes: optionalText(500),
});

export const businessProfileSchema = z.object({
  name: requiredText('Business name', 120),
  email,
  phone,
  street: requiredText('Business address', 160),
  postalCode: requiredText('Postal code', 12),
  city: requiredText('City', 80),
  country: requiredText('Country', 80),
  website: z.string().trim().url('Enter a full URL, e.g. https://example.com').optional().or(z.literal('')),
  registrationNumber: optionalText(40),
  taxId: optionalText(40),
  currency: currencyCode,
  timezone: requiredText('Time zone', 60),
});

export const invoiceSettingsSchema = z.object({
  prefix: requiredText('Prefix', 10).regex(/^[A-Za-z0-9]+$/, 'Letters and numbers only.'),
  nextSequence: z.coerce.number().int('Whole numbers only.').min(1, 'Must be at least 1.').max(999999),
  defaultPaymentTerms: z.coerce.number().int('Whole days only.').min(0).max(180, 'At most 180 days.'),
  currency: currencyCode,
  defaultTaxRate: percentInput('Tax rate'),
  pricesIncludeTax: z.boolean(),
  dueDateRule: z.enum(['issue_plus_terms', 'end_of_month_plus_terms']),
  paymentInstructions: optionalText(600),
  footer: optionalText(300),
  defaultNotes: optionalText(600),
  defaultGrouping: z.enum(['employee_project', 'project', 'employee', 'day']),
});

export const workingHoursSchema = z.object({
  timezone: requiredText('Time zone', 60),
  workingDays: z.array(z.number().int().min(0).max(6)).min(1, 'Select at least one working day.'),
  expectedDailyHours: z.coerce.number().min(1, 'At least 1 hour.').max(16, 'At most 16 hours.'),
  defaultBreakMinutes: z.coerce.number().int().min(0).max(180),
  reviewShiftsOverHours: z.coerce.number().min(0).max(24),
  openShiftAlertHours: z.coerce.number().min(1).max(48),
  requireCorrectionReason: z.boolean(),
  locationCapture: z.enum(['disabled', 'optional', 'required']),
  defaultBillingPeriod: z.enum(['this_week', 'last_week', 'this_month', 'last_month']),
});

/** Converts zod issues from a manual safeParse into a { field: message } map. */
export function zodErrors(result) {
  if (result.success) return {};
  return Object.fromEntries(result.error.issues.map((i) => [i.path.join('.'), i.message]));
}
