import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().max(65535).default(3000),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DIRECT_URL: z.string().min(1, 'DIRECT_URL is required'),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_STORAGE_BUCKET_PREFIX: z.string().min(1).default('ec'),
  SUPABASE_STORAGE_LEGACY_BUCKET: z.string().min(1).default('ec-public'),
  VOTER_HASH_SALT: z.string().optional(),
  EMAIL_SMTP_HOST: z.string().optional(),
  EMAIL_SMTP_PORT: z.coerce.number().int().positive().max(65535).default(587),
  EMAIL_SMTP_SECURE: z.enum(['true', 'false']).optional().transform((value) => value === 'true'),
  EMAIL_SMTP_USER: z.string().optional(),
  EMAIL_SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().email().default('entrepreneurs.club@unu-jogja.ac.id'),
  ADMIN_USERNAME: z.preprocess((value) => value === '' ? undefined : value, z.string().min(1).optional()),
  ADMIN_PASSWORD: z.preprocess((value) => value === '' ? undefined : value, z.string().min(12).optional()),
  ADMIN_JWT_SECRET: z.preprocess((value) => value === '' ? undefined : value, z.string().optional()),
}).superRefine((config, context) => {
  if (Boolean(config.EMAIL_SMTP_USER) !== Boolean(config.EMAIL_SMTP_PASS)) {
    context.addIssue({
      code: 'custom',
      path: ['EMAIL_SMTP_USER'],
      message: 'EMAIL_SMTP_USER and EMAIL_SMTP_PASS must be configured together.',
    });
  }
  if (Boolean(config.ADMIN_USERNAME) !== Boolean(config.ADMIN_PASSWORD)) {
    context.addIssue({
      code: 'custom',
      path: ['ADMIN_USERNAME'],
      message: 'ADMIN_USERNAME and ADMIN_PASSWORD must be configured together.',
    });
  }
  if (config.ADMIN_USERNAME && (!config.ADMIN_JWT_SECRET || config.ADMIN_JWT_SECRET.length < 32)) {
    context.addIssue({
      code: 'custom',
      path: ['ADMIN_JWT_SECRET'],
      message: 'ADMIN_JWT_SECRET must contain at least 32 characters when admin credentials are configured.',
    });
  }
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error('Invalid environment configuration:', result.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = result.data;
