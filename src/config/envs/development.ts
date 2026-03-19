// ABOUTME: Development environment config factory — hardcoded values, no env vars needed.
// ABOUTME: Uses pretty logger and a local SQLite file for fast local iteration.

import { defineConfig } from '../defineConfig.js';

export function developmentConfigFactory() {
  return defineConfig({
    server: { port: 4000 },
    logger: { format: 'pretty', level: 'debug' },
    database: { driver: 'sqlite', file: './dev.db' },
  });
}
