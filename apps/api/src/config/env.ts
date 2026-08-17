import { MAX_UPLOAD_BYTES } from '@data-room/shared';
import { z } from 'zod';

type DurationString = `${number}${'s' | 'm' | 'h' | 'd' | 'w' | 'y'}`;

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(4000),

    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required.'),

    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters.'),
    JWT_EXPIRES_IN: z
      .string()
      .regex(/^\d+[smhdwy]$/, 'Use an ms duration such as "7d", "12h" or "30m".')
      .default('7d')
      .transform((value) => value as DurationString),

    WEB_ORIGIN: z.string().default('http://localhost:3000'),

    MAX_UPLOAD_BYTES: z.coerce.number().int().positive().default(MAX_UPLOAD_BYTES),

    STORAGE_DRIVER: z.enum(['local', 'supabase']).optional(),

    SUPABASE_URL: z.string().optional(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
    SUPABASE_STORAGE_BUCKET: z.string().default('data-room-files'),

    LOCAL_STORAGE_DIR: z.string().default('.storage'),

    PUBLIC_API_ORIGIN: z.string().optional(),
  })
  .transform((raw) => {
    const storageDriver =
      raw.STORAGE_DRIVER ??
      (raw.SUPABASE_URL && raw.SUPABASE_SERVICE_ROLE_KEY ? 'supabase' : 'local');

    return { ...raw, storageDriver };
  })
  .superRefine((value, ctx) => {
    if (value.storageDriver === 'supabase') {
      if (!value.SUPABASE_URL) {
        ctx.addIssue({
          code: 'custom',
          path: ['SUPABASE_URL'],
          message: 'Required when STORAGE_DRIVER is "supabase".',
        });
      }
      if (!value.SUPABASE_SERVICE_ROLE_KEY) {
        ctx.addIssue({
          code: 'custom',
          path: ['SUPABASE_SERVICE_ROLE_KEY'],
          message: 'Required when STORAGE_DRIVER is "supabase".',
        });
      }
    }
  });

export type Env = z.infer<typeof envSchema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  const result = envSchema.safeParse(raw);

  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${problems}`);
  }

  return result.data;
}

export function allowedOrigins(env: Env): string[] {
  return env.WEB_ORIGIN.split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}
