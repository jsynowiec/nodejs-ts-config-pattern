// ABOUTME: Tests for all three config factories — verifying values, defaults, and validation.
// ABOUTME: Covers the production factory's env-var parsing including the failure case.

import { describe, it, expect, vi, afterEach } from 'vitest';
import { developmentConfigFactory } from '../src/config/envs/development.js';
import { testConfigFactory }        from '../src/config/envs/test.js';
import { productionConfigFactory }  from '../src/config/envs/production.js';

describe('developmentConfigFactory', () => {
  it('returns expected development config', () => {
    const config = developmentConfigFactory();
    expect(config.server.port).toBe(4000);
    expect(config.logger.format).toBe('pretty');
    expect(config.database.driver).toBe('sqlite');
  });
});

describe('testConfigFactory', () => {
  it('returns silent logger and in-memory sqlite', () => {
    const config = testConfigFactory();
    expect(config.logger.level).toBe('silent');
    expect(config.database.driver).toBe('sqlite');
    if (config.database.driver === 'sqlite') {
      expect(config.database.file).toBe(':memory:');
    }
  });
});

describe('productionConfigFactory', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('throws when required env vars are missing', () => {
    expect(() => productionConfigFactory()).toThrow();
  });

  it('returns valid config when all env vars are set', () => {
    vi.stubEnv('PORT',              '8080');
    vi.stubEnv('DATABASE_HOST',     'db.example.com');
    vi.stubEnv('DATABASE_NAME',     'app');
    vi.stubEnv('DATABASE_USER',     'app');
    vi.stubEnv('DATABASE_PASSWORD', 'secret');

    const config = productionConfigFactory();
    expect(config.server.port).toBe(8080);
    expect(config.database.driver).toBe('postgres');
    if (config.database.driver === 'postgres') {
      expect(config.database.host).toBe('db.example.com');
    }
  });
});
