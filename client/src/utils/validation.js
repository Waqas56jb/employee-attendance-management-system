import { z } from 'zod';

const email = z
  .string()
  .trim()
  .min(1, 'Enter your work email address.')
  .email('Enter a valid email address, for example name@company.com.');

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Enter your password.'),
  remember: z.boolean().optional(),
});

export const forgotPasswordSchema = z.object({ email });

const phonePattern = /^\+?[\d\s().-]{7,20}$/;

export const profileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, 'Display name must be at least 2 characters.')
    .max(40, 'Display name must be 40 characters or fewer.'),
  phone: z
    .string()
    .trim()
    .min(1, 'Enter a phone number.')
    .regex(phonePattern, 'Use digits, spaces and + ( ) - only, e.g. +1 (555) 010-2299.')
    .refine((v) => v.replace(/\D/g, '').length >= 7, 'Phone number must contain at least 7 digits.'),
});

export const displayNameSchema = profileSchema.pick({ displayName: true });

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password.'),
    newPassword: z
      .string()
      .min(10, 'Use at least 10 characters.')
      .regex(/[A-Z]/, 'Include at least one uppercase letter.')
      .regex(/[a-z]/, 'Include at least one lowercase letter.')
      .regex(/\d/, 'Include at least one number.'),
    confirmPassword: z.string().min(1, 'Confirm your new password.'),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match.',
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    path: ['newPassword'],
    message: 'The new password must be different from the current one.',
  });

const note = z.string().trim().max(280, 'Notes are limited to 280 characters.').optional().or(z.literal(''));

/**
 * Check-in validation. `projects` is the list of projects the employee may
 * check in to; the schema enforces that the project belongs to the customer.
 */
export function createCheckInSchema(projects) {
  return z
    .object({
      customerId: z.string().min(1, 'Select the customer you are working for.'),
      projectId: z.string().min(1, 'Select the project you are working on.'),
      note,
    })
    .superRefine((value, ctx) => {
      if (!value.projectId || !value.customerId) return;
      const project = projects.find((p) => p.id === value.projectId);
      if (!project) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['projectId'], message: 'This project is not available for check-in.' });
      } else if (project.customerId !== value.customerId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['projectId'],
          message: 'The selected project does not belong to the selected customer.',
        });
      }
    });
}

export const checkOutSchema = z.object({ note });
