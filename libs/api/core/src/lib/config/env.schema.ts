import { z } from 'zod';

export const EnvSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),

  API_PORT: z.coerce.number().int().positive().default(3000),
  API_HOST: z.string().default('0.0.0.0'),
  API_BASE_URL: z.string().url().default('http://localhost:3000'),
  WEB_API_URL: z.string().url().default('http://localhost:3000'),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),

  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('30d'),

  // SMS provider selection. 'console' logs OTPs to stdout (dev only).
  SMS_PROVIDER: z.enum(['console', 'hubtel']).default('console'),
  HUBTEL_CLIENT_ID: z.string().optional(),
  HUBTEL_CLIENT_SECRET: z.string().optional(),
  HUBTEL_SMS_SENDER_ID: z.string().default('ArtisanGH'),

  // CORS allowlist (comma-separated origins). Always includes WEB + ADMIN dev URLs.
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:4200,http://localhost:4300'),

  // OTP behavior
  OTP_LENGTH: z.coerce.number().int().min(4).max(8).default(6),
  OTP_TTL_SECONDS: z.coerce.number().int().positive().default(300),
  OTP_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),

  // Object storage (MinIO locally, Cloudflare R2 in prod)
  S3_ENDPOINT: z.string().url(),
  S3_REGION: z.string().default('auto'),
  S3_ACCESS_KEY: z.string(),
  S3_SECRET_KEY: z.string(),
  S3_BUCKET_MEDIA: z.string().default('artisangh-media'),
  S3_BUCKET_KYC: z.string().default('artisangh-kyc'),
  S3_FORCE_PATH_STYLE: z
    .union([z.boolean(), z.string()])
    .transform((v) => (typeof v === 'string' ? v === 'true' : v))
    .default(true),

  // KYC provider selection ('stub' auto-approves with a configurable score)
  KYC_PROVIDER: z.enum(['stub', 'aws']).default('stub'),
  KYC_STUB_FACE_MATCH_SCORE: z.coerce.number().min(0).max(100).default(95),
  KYC_AUTO_APPROVE_THRESHOLD: z.coerce.number().min(0).max(100).default(90),
  AWS_REGION: z.string().default('af-south-1'),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  KYC_KMS_KEY_ID: z.string().optional(),

  // Local symmetric key used when KYC_PROVIDER=stub. 32 bytes base64.
  // Generate one with: openssl rand -base64 32
  LOCAL_ENCRYPTION_KEY: z
    .string()
    .default('dGhpcy1pcy1ub3QtYS1zZWNyZXQtdXNlLWluLWRldi1vbmx5LSE='),

  // Voice transcription
  WHISPER_PROVIDER: z.enum(['stub', 'openai']).default('stub'),
  WHISPER_MODEL: z.string().default('whisper-1'),
  OPENAI_API_KEY: z.string().optional(),
  VOICE_MAX_DURATION_SECONDS: z.coerce.number().int().positive().default(60),
});

export type Env = z.infer<typeof EnvSchema>;
