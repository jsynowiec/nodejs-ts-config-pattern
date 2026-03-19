// ABOUTME: Config entry point — routes to the correct factory based on NODE_ENV.
// ABOUTME: Exports a single appConfig constant consumed throughout the application.

import { ENV } from './types.js';
import { developmentConfigFactory } from './envs/development.js';
import { testConfigFactory }        from './envs/test.js';
import { productionConfigFactory }  from './envs/production.js';

export const appConfig = getConfig();

function getConfig() {
  switch (ENV.NODE_ENV) {
    case 'development': return developmentConfigFactory();
    case 'test':        return testConfigFactory();
    case 'production':  return productionConfigFactory();
    default:            throw new Error(`Unknown NODE_ENV: "${ENV.NODE_ENV}"`);
  }
}
