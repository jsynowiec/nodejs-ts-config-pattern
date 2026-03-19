// ABOUTME: Minimal Fastify server that demonstrates consuming the typed config.
// ABOUTME: The config-driven logger and DB startup log are the focus; the route is glue.

import Fastify from 'fastify';
import { appConfig } from './config/index.js';

// Discriminated union narrowing: TypeScript knows the exact shape based on format
const logger =
  appConfig.logger.format === 'pretty'
    ? { transport: { target: 'pino-pretty' }, level: appConfig.logger.level }
    : { level: appConfig.logger.level };

const server = Fastify({ logger });

// Discriminated union narrowing on database config — no cast needed
if (appConfig.database.driver === 'sqlite') {
  server.log.info(`Database: SQLite (${appConfig.database.file})`);
} else {
  server.log.info(`Database: Postgres (${appConfig.database.host})`);
}

server.post('/orders', async (request, reply) => {
  const body = request.body as { item: string; quantity: number };
  return reply.code(201).send({ id: crypto.randomUUID(), ...body });
});

await server.listen({
  port: appConfig.server.port,
  host: appConfig.server.host,
});
