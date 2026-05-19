import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { Locale } from '@artisangh/shared-types';

const AudioContentType = z.enum([
  'audio/webm',
  'audio/ogg',
  'audio/mpeg',
  'audio/mp4',
  'audio/wav',
]);

export const StartVoiceUploadSchema = z.object({
  contentType: AudioContentType,
});
export class StartVoiceUploadDto extends createZodDto(StartVoiceUploadSchema) {}

export const SubmitVoiceIntroSchema = z.object({
  key: z.string().min(1),
  hintLocale: Locale.optional(),
  durationSeconds: z.number().min(1).max(120).optional(),
});
export class SubmitVoiceIntroDto extends createZodDto(SubmitVoiceIntroSchema) {}
