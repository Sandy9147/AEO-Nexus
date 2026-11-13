import { z } from 'zod';

export const EnvironmentSchema = z.enum(['development', 'test', 'staging', 'production']);
export type Environment = z.infer<typeof EnvironmentSchema>;

export const ApiConfigSchema = z.object({
  NODE_ENV: EnvironmentSchema.default('development'),
  PORT: z.coerce.number().default(4000),
  APP_NAME: z.string().default('AEO Nexus API'),
  DATABASE_URL: z.string().url().describe('PostgreSQL connection string'),
  REDIS_URL: z.string().describe('Redis connection string').default('redis://localhost:6379'),
  JWT_SECRET: z.string().min(16).default('aeo_nexus_dev_jwt_secret_key_32chars'),
  JWT_EXPIRES_IN: z.string().default('1d'),
  CORS_ORIGINS: z
    .string()
    .default(
      'http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003,http://localhost:3004',
    ),
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
    throw new Error(`Configuration validation error: ${JSON.stringify(formatted, null, 2)}`);
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
