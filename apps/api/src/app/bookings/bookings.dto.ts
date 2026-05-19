import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { GeoPoint } from '@artisangh/shared-types';

export const CreateBookingSchema = z.object({
  artisanId: z.string().uuid(),
  trade: z.string().min(1).max(40),
  description: z.string().max(2000).optional(),
  voiceNoteKey: z.string().optional(),
  scheduledAt: z.string().datetime().optional(),
  jobLocation: GeoPoint,
  jobAddress: z.string().max(200).optional(),
  totalAmount: z.number().positive().max(1_000_000),
});
export class CreateBookingDto extends createZodDto(CreateBookingSchema) {}

export const VoiceUploadForBookingSchema = z.object({
  contentType: z.enum([
    'audio/webm',
    'audio/ogg',
    'audio/mpeg',
    'audio/mp4',
    'audio/wav',
  ]),
});
export class VoiceUploadForBookingDto extends createZodDto(
  VoiceUploadForBookingSchema,
) {}

export const DisputeBookingSchema = z.object({
  reason: z.string().min(5).max(500),
});
export class DisputeBookingDto extends createZodDto(DisputeBookingSchema) {}

export const ResolveDisputeSchema = z.object({
  resolution: z.enum(['RELEASE', 'REFUND']),
  reason: z.string().max(500).optional(),
});
export class ResolveDisputeDto extends createZodDto(ResolveDisputeSchema) {}
