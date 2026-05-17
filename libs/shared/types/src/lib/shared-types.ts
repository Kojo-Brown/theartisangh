import { z } from 'zod';

// ─────────────────────────────────────────────────────────────
// Domain enums (mirror the Prisma schema)
// ─────────────────────────────────────────────────────────────

export const UserRole = z.enum(['CUSTOMER', 'ARTISAN', 'ADMIN']);
export type UserRole = z.infer<typeof UserRole>;

export const Locale = z.enum(['EN', 'TW', 'GA', 'EE']);
export type Locale = z.infer<typeof Locale>;

export const BookingStatus = z.enum([
  'REQUESTED',
  'ACCEPTED',
  'EN_ROUTE',
  'ON_SITE',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'DISPUTED',
]);
export type BookingStatus = z.infer<typeof BookingStatus>;

export const PaymentChannel = z.enum([
  'MOMO_MTN',
  'MOMO_VODAFONE',
  'MOMO_AIRTELTIGO',
  'CARD',
]);
export type PaymentChannel = z.infer<typeof PaymentChannel>;

// ─────────────────────────────────────────────────────────────
// Shared primitives
// ─────────────────────────────────────────────────────────────

export const GhanaPhone = z
  .string()
  .regex(
    /^\+233[2-9]\d{8}$/,
    'Must be a valid Ghanaian phone number in +233 format',
  );

export const Money = z.object({
  amount: z.number().nonnegative(),
  currency: z.literal('GHS').default('GHS'),
});
export type Money = z.infer<typeof Money>;

export const GeoPoint = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
export type GeoPoint = z.infer<typeof GeoPoint>;
