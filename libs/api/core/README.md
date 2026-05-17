# libs/api/core — Shared NestJS Building Blocks

Will house cross-cutting NestJS providers used by both `apps/api` and `apps/worker`:

- `PrismaService` (singleton wrapping `@artisangh/db`)
- Typed `ConfigService` for env vars
- Pino-based logger module
- Global exception filter + Zod validation pipe
- Common decorators (`@CurrentUser`, role guards)

## Milestone status

- M1 done — lib scaffolded. Providers are added in M2 alongside the auth module.
