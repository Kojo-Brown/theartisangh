import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { GeoPoint } from '@artisangh/shared-types';

export const TRADES = [
  'plumber',
  'electrician',
  'mason',
  'carpenter',
  'painter',
  'welder',
  'mechanic',
  'tiler',
  'roofer',
  'cleaner',
  'gardener',
  'general_labourer',
] as const;
export const Trade = z.enum(TRADES);
export type Trade = z.infer<typeof Trade>;

export const UpsertArtisanProfileSchema = z.object({
  trades: z.array(Trade).min(1).max(5),
  bio: z.string().max(500).optional(),
  yearsExperience: z.number().int().min(0).max(60).default(0),
  hourlyRate: z.number().nonnegative().optional(),
  currency: z.literal('GHS').default('GHS'),
  serviceRadiusKm: z.number().int().positive().max(100).default(10),
  baseLocation: GeoPoint,
  baseAddress: z.string().max(200).optional(),
});
export class UpsertArtisanProfileDto extends createZodDto(
  UpsertArtisanProfileSchema,
) {}

export const SearchArtisansSchema = z.object({
  trade: Trade.optional(),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radiusKm: z.coerce.number().int().positive().max(100).default(10),
  limit: z.coerce.number().int().positive().max(50).default(20),
  verifiedOnly: z.coerce.boolean().default(false),
});
export class SearchArtisansDto extends createZodDto(SearchArtisansSchema) {}
