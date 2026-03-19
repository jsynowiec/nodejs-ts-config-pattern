// ABOUTME: The core bridge between config authoring (z.input) and config consumption (z.output).
// ABOUTME: z.input shows optional fields (those with .default()); z.output makes all fields required.

import { z } from 'zod';
import { appConfigSchema } from './types.js';

export function defineConfig(
  config: z.input<typeof appConfigSchema>,
): z.output<typeof appConfigSchema> {
  return appConfigSchema.parse(config);
}
