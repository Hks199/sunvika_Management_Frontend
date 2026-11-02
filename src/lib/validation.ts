import { z } from 'zod';
export const emailSchema = z.string().trim().email().max(254);
export const passwordSchema = z.string().min(12, 'Use at least 12 characters').max(128).regex(/[a-z]/, 'Include a lowercase letter').regex(/[A-Z]/, 'Include an uppercase letter').regex(/[0-9]/, 'Include a number');
export const mobileSchema = z.string().trim().regex(/^\+?[0-9]{10,15}$/, 'Enter 10–15 digits, optionally starting with +');
export const leadSchema = z.object({ customerName: z.string().trim().min(2).max(160), mobileNumber: mobileSchema, alternateNumber: z.union([mobileSchema, z.literal('')]).optional(), state: z.string().regex(/^[a-f\d]{24}$/i, 'Select a state'), district: z.string().regex(/^[a-f\d]{24}$/i, 'Select a district'), branch: z.string().regex(/^[a-f\d]{24}$/i, 'Select a branch'), blockOrTehsil: z.string().trim().max(120).optional(), siteAddress: z.string().trim().min(3).max(1000) });
export const isValidEmail = (value: string) => emailSchema.safeParse(value).success;
