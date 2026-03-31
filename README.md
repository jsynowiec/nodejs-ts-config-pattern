# nodejs-ts-config-pattern

A lightweight, type-safe configuration pattern for Node.js using Zod.

## The Problem

Raw `process.env` access gives you `string | undefined` for every value. Defaults end up scattered across the codebase. Validation — if it happens at all — happens at runtime, often far from startup. Multi-environment config becomes a pile of `.env.local` and `.env.test` files that are easy to lose track of.

## The Key Insight

Zod distinguishes between the _input_ type and the _output_ type of a schema. Fields with `.default()` are optional in `z.input` (your IDE shows exactly what you must provide) but required in `z.output` (consumers never need `?.` checks).

```ts
// z.input — what you write in a factory:
//   server?: { port?: number; host?: string }  ← optional because it has defaults
//   database: { driver: 'sqlite' | ... }       ← required because no default

// z.output — what the rest of the app sees:
//   server: { port: number; host: string }     ← always present, fully typed
//   database: { driver: 'sqlite'; file: string } | { driver: 'postgres'; host: string; ... }

export function defineConfig(
  config: z.input<typeof appConfigSchema>,
): z.output<typeof appConfigSchema> {
  return appConfigSchema.parse(config);
}
```

## How It Works

### 1. `types.ts` — Schema and ENV

The full application config is one Zod schema. Discriminated unions model config shapes that differ by type (e.g. SQLite vs Postgres).

`.readonly()` prevents accidental mutation at runtime.

```ts
export const appConfigSchema = z.object({
  server: z.object({
    host: z.string().default('0.0.0.0'),
    port: z.number().default(3000),
  }).default({}),
  logger: z.discriminatedUnion('format', [
    z.object({ format: z.literal('json'),   level: logLevelSchema }),
    z.object({ format: z.literal('pretty'), level: logLevelSchema, colorize: z.boolean().default(true) }),
  ]).default({ format: 'json', level: 'info' }),
  database: z.discriminatedUnion('driver', [
    z.object({ driver: z.literal('postgres'), host: z.string(), /* ... */ }),
    z.object({ driver: z.literal('sqlite'),   file: z.string().default(':memory:') }),
  ]),
}).readonly();
```

A separate `envSchema` validates only `NODE_ENV` and is parsed once at module load:

```ts
export const ENV = envSchema.parse(process.env);
```

Production extends it for the vars it needs:

```ts
export const productionEnvSchema = envSchema.extend({
  PORT: z.string(), DATABASE_HOST: z.string(), /* ... */
});
```

### 2. `defineConfig.ts` — The Core Trick

```ts
export function defineConfig(
  config: z.input<typeof appConfigSchema>,
): z.output<typeof appConfigSchema> {
  return appConfigSchema.parse(config);
}
```

- Calling code sees optional fields for anything with a `.default()` — your IDE tells you what you must provide.
- The returned value has all fields required — no `?.` anywhere in consuming code.

### 3. `envs/*.ts` — Per-Environment Factories

Development and test use hardcoded values. No env vars needed, no `.env` files to manage:

```ts
export function testConfigFactory() {
  return defineConfig({
    logger: { format: 'json', level: 'silent' },
    database: { driver: 'sqlite' }, // file defaults to :memory:
  });
}
```

Production parses its own env schema first. If a required variable is missing, Zod throws immediately at startup — not later when the code tries to use it:

```ts
export function productionConfigFactory() {
  const env = productionEnvSchema.parse(process.env);
  return defineConfig({
    server: { port: Number(env.PORT) },
    logger: { format: 'json', level: 'warn' },
    database: { driver: 'postgres', host: env.DATABASE_HOST, /* ... */ },
  });
}
```

### 4. `index.ts` — Routing

```ts
export const appConfig = getConfig();

function getConfig() {
  switch (ENV.NODE_ENV) {
    case 'development': return developmentConfigFactory();
    case 'test':        return testConfigFactory();
    case 'production':  return productionConfigFactory();
    default:            throw new Error(`Unknown NODE_ENV: "${ENV.NODE_ENV}"`);
  }
}
```

`appConfig` is a module-level constant. Import it anywhere — it is fully typed, fully resolved, and read-only.

## When to Use This

**Use it when** your application is TypeScript-first and developer experience matters. It pays for itself immediately in any codebase where `appConfig.something` is called more than a few times.

**Avoid it when** you need non-code config overrides — for example, an ops team that drops a `local.yaml` to change a single value without a deploy. Also avoid it if your team already relies on `node-config`'s file-layering strategy.

## Comparison

### vs. Plain `.env` files

| | `.env` + `process.env` | This pattern |
|---|---|---|
| **Type safety** | None — everything is `string \| undefined` | Full — resolved types match schema |
| **Defaults** | Manual, scattered across codebase | Declared once in schema |
| **Validation** | None — silent failures at runtime | Zod error at startup |
| **Autocomplete** | None | Full IDE support on both input and output |
| **Multi-environment** | Multiple `.env.local`, `.env.test` files to manage | Per-env factory files, versioned in source |
| **Secrets** | Often checked in by accident | Env parsing is explicit and localized |
| **Complexity** | Near-zero | Low (one dep: zod) |

**Limitation:** runtime config injection (Kubernetes secrets, CI variables) still flows through `process.env` in production — the pattern wraps env vars, it does not replace them. And `.env` files with dotenv let non-engineers change settings without touching code; this pattern puts config in TypeScript.

### vs. `node-config`

| | `node-config` | This pattern |
|---|---|---|
| **Type safety** | Optional (`config.get<T>()`, but no schema) | Schema-driven, no casts needed |
| **Autocomplete** | Only with manual type augmentation | Automatic from Zod schema |
| **Validation** | None by default | Built into `defineConfig()` |
| **Defaults** | YAML/JSON layering via `default.yaml` | Inline `.default()` in schema |
| **Runtime override** | `NODE_APP_INSTANCE`, `NODE_ENV` layering, `local.yaml` | `NODE_ENV` + env vars only |
| **Config format** | YAML, JSON, JS files | TypeScript only |
| **Discriminated unions** | Not supported | First-class |

**Limitation:** `node-config` supports file layering (default → env → local), enabling ops teams to override config without code changes. This pattern's production config is code — adding a new env var requires a code change and deploy.


### vs. ArkType

[ArkType](https://github.com/arktypeio/arktype) uses a TypeScript-like string syntax and claims 100x faster runtime validation — but neither advantage applies here. Config validation runs once at startup, so performance is irrelevant. This pattern's value rests on the input/output type distinction and explicit discriminated unions: Zod's `z.discriminatedUnion('driver', [...])` names the discriminator key directly, and `z.input<>` / `z.output<>` are well-documented idioms with broad ecosystem support. ArkType's equivalents exist but are less explicit, and its string DSL surfaces typos at runtime where Zod's method chains catch them at compile time.

## Running the Demo

The demo is a minimal Fastify server with one `POST /orders` endpoint. The Fastify code is glue; the config pattern is the point.

**Development** (port 4000, pretty logs, SQLite):

```sh
npm install
npm run dev
```

**Tests:**

```sh
npm test
```

**Type check:**

```sh
npm run typecheck
```

**Production** (requires env vars):

```sh
NODE_ENV=production \
  PORT=8080 \
  DATABASE_HOST=db.example.com \
  DATABASE_NAME=app \
  DATABASE_USER=app \
  DATABASE_PASSWORD=CHANGE_ME \
  tsx src/server.ts
```

**Try the endpoint:**

```sh
curl -X POST http://localhost:4000/orders \
  -H 'Content-Type: application/json' \
  -d '{"item":"widget","quantity":2}'
# → {"id":"...","item":"widget","quantity":2}
```
