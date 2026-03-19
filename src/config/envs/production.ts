// ABOUTME: Production environment config factory — validates required env vars at startup.
// ABOUTME: Fails fast with a Zod error if any required env var is missing or malformed.

import { defineConfig } from '../defineConfig.js';
import { productionEnvSchema } from '../types.js';

export function productionConfigFactory() {
  // eslint-disable-next-line no-process-env
  const env = productionEnvSchema.parse(process.env);
  return defineConfig({
    server: { port: Number(env.PORT) },
    logger: { format: 'json', level: 'warn' },
    database: {
      driver: 'postgres',
      host: env.DATABASE_HOST,
      name: env.DATABASE_NAME,
      user: env.DATABASE_USER,
      password: env.DATABASE_PASSWORD,
    },
  });
}
