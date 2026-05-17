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
});

export type Env = z.infer<typeof EnvSchema>;
