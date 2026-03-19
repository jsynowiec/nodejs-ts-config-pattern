// ABOUTME: Test environment config factory — silent logger and in-memory SQLite.
// ABOUTME: No server or logger overrides needed; schema defaults handle everything else.

import { defineConfig } from '../defineConfig.js';

export function testConfigFactory() {
  return defineConfig({
    logger: { format: 'json', level: 'silent' },
    database: { driver: 'sqlite' }, // defaults to :memory:
  });
}
