import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const ContentType = z.enum(['image/jpeg', 'image/png', 'image/webp']);

export const StartVerificationSchema = z.object({
  frontContentType: ContentType,
  backContentType: ContentType,
  selfieContentType: ContentType,
});
export class StartVerificationDto extends createZodDto(
  StartVerificationSchema,
) {}

export const SubmitVerificationSchema = z.object({
  ghanaCardNumber: z
    .string()
    .regex(/^GHA-\d{9}-\d$/i, 'Must look like GHA-123456789-0'),
  frontKey: z.string().min(1),
  backKey: z.string().min(1),
  selfieKey: z.string().min(1),
});
export class SubmitVerificationDto extends createZodDto(
  SubmitVerificationSchema,
) {}

export const ReviewVerificationSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED']),
  reason: z.string().max(500).optional(),
});
export class ReviewVerificationDto extends createZodDto(
  ReviewVerificationSchema,
) {}
