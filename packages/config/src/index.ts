import { z } from 'zod';

export const EnvironmentSchema = z.enum(['development', 'test', 'staging', 'production']);
export type Environment = z.infer<typeof EnvironmentSchema>;

export const ApiConfigSchema = z
  .object({
    NODE_ENV: EnvironmentSchema.default('development'),
    PORT: z.coerce.number().default(4000),
    APP_NAME: z.string().default('AEO Nexus API'),
    DATABASE_URL: z
      .string()
      .url('DATABASE_URL must be a valid connection URL')
      .describe('Neon pooled connection string for runtime application queries'),
    DIRECT_URL: z
      .string()
      .url('DIRECT_URL must be a valid connection URL')
      .optional()
      .describe('Neon direct connection string for Prisma migrations'),
    REDIS_URL: z
      .string()
      .describe('Redis connection string for BullMQ queues')
      .default('redis://localhost:6379'),
    JWT_SECRET: z
      .string({
        required_error: 'JWT_SECRET is required and must contain at least 32 characters.',
      })
      .min(32, 'JWT_SECRET must be at least 32 characters of cryptographically secure material.'),
    JWT_EXPIRES_IN: z.string().default('1d'),
    CORS_ORIGINS: z
      .string()
      .default(
        'http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003,http://localhost:3004',
      ),
  })
  .superRefine((data, ctx) => {
    const isProductionOrStaging = data.NODE_ENV === 'production' || data.NODE_ENV === 'staging';

    // 1. Strict JWT validation in staging/production
    if (isProductionOrStaging) {
      const lowerSecret = data.JWT_SECRET.toLowerCase();
      if (
        lowerSecret.includes('change_in_production') ||
        lowerSecret.includes('dev_secret') ||
        lowerSecret.includes('default') ||
        lowerSecret.includes('placeholder') ||
        lowerSecret.includes('aeo_nexus_dev')
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['JWT_SECRET'],
          message:
            'CRITICAL: Production/staging cannot use development placeholders or default patterns in JWT_SECRET. Supply a cryptographically random secret of at least 32 characters.',
        });
      }
    }

    // 2. Strict Database URL checks in staging/production
    if (isProductionOrStaging) {
      if (
        data.DATABASE_URL.includes('YOUR_PASSWORD') ||
        data.DATABASE_URL.includes('ep-sample') ||
        data.DATABASE_URL.includes('localhost')
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['DATABASE_URL'],
          message:
            'CRITICAL: Production/staging cannot use localhost or placeholder credentials in DATABASE_URL.',
        });
      }

      if (!data.DIRECT_URL) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['DIRECT_URL'],
          message:
            'CRITICAL: DIRECT_URL is required in production/staging for reliable Prisma schema migrations.',
        });
      } else if (
        data.DIRECT_URL.includes('YOUR_PASSWORD') ||
        data.DIRECT_URL.includes('ep-sample') ||
        data.DIRECT_URL.includes('localhost')
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['DIRECT_URL'],
          message:
            'CRITICAL: Production/staging cannot use localhost or placeholder credentials in DIRECT_URL.',
        });
      }
    }
  });

export type ApiConfig = z.infer<typeof ApiConfigSchema>;

export const WebConfigSchema = z.object({
  NODE_ENV: EnvironmentSchema.default('development'),
  PORT: z.coerce.number(),
  NEXT_PUBLIC_APP_NAME: z.string().default('AEO Nexus'),
  NEXT_PUBLIC_API_URL: z.string().url().default('http://localhost:4000'),
});

export type WebConfig = z.infer<typeof WebConfigSchema>;

export function validateConfig<T>(
  schema: z.ZodSchema<T>,
  env: Record<string, unknown> = process.env,
): T {
  const result = schema.safeParse(env);
  if (!result.success) {
    const formatted = result.error.format();
    throw new Error(
      `Environment configuration validation failed:\n${JSON.stringify(formatted, null, 2)}`,
    );
  }
  return result.data;
}

export const APP_PORTS = {
  PUBLIC_WEB: 3000,
  CUSTOMER_WEB: 3001,
  AGENCY_WEB: 3002,
  ADMIN_WEB: 3003,
  SUPERADMIN_WEB: 3004,
  API: 4000,
} as const;
