// ABOUTME: Zod schemas for application config, env validation, and the ENV constant.
// ABOUTME: The z.input/z.output distinction is the core type-safety insight of this pattern.

import { z } from 'zod';

export const logLevelSchema = z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']);

export const appConfigSchema = z.object({
  server: z.object({
    host: z.string().default('0.0.0.0'),
    port: z.number().default(3000),
    requestTimeoutMs: z.number().default(30_000),
  }).default({}),
  logger: z.discriminatedUnion('format', [
    z.object({ format: z.literal('json'),   level: logLevelSchema }),
    z.object({ format: z.literal('pretty'), level: logLevelSchema, colorize: z.boolean().default(true) }),
  ]).default({ format: 'json', level: 'info' }),
  database: z.discriminatedUnion('driver', [
    z.object({
      driver: z.literal('postgres'),
      host: z.string(),
      port: z.number().default(5432),
      name: z.string(),
      user: z.string(),
      password: z.string(),
    }),
    z.object({
      driver: z.literal('sqlite'),
      file: z.string().default(':memory:'),
    }),
  ]),
}).readonly();

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

export const productionEnvSchema = envSchema.extend({
  PORT:              z.string(),
  DATABASE_HOST:     z.string(),
  DATABASE_NAME:     z.string(),
  DATABASE_USER:     z.string(),
  DATABASE_PASSWORD: z.string(),
});

// eslint-disable-next-line no-process-env
export const ENV = envSchema.parse(process.env);
