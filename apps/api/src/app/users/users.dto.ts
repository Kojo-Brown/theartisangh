import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { Locale } from '@artisangh/shared-types';

export const UpdateMeSchema = z.object({
  fullName: z.string().min(2).max(80).optional(),
  email: z.string().email().optional(),
  locale: Locale.optional(),
  avatarUrl: z.string().url().optional(),
});
export class UpdateMeDto extends createZodDto(UpdateMeSchema) {}
