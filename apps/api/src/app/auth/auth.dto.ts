import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { GhanaPhone, UserRole } from '@artisangh/shared-types';

export const RequestOtpSchema = z.object({
  phone: GhanaPhone,
});
export class RequestOtpDto extends createZodDto(RequestOtpSchema) {}

export const VerifyOtpSchema = z.object({
  phone: GhanaPhone,
  code: z.string().regex(/^\d{4,8}$/),
  fullName: z.string().min(2).max(80).optional(),
  role: UserRole.optional().default('CUSTOMER'),
});
export class VerifyOtpDto extends createZodDto(VerifyOtpSchema) {}
