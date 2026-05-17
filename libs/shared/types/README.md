# libs/shared/types — Shared Zod Schemas + TS Types

Single source of truth for shapes that cross the client/server boundary. Zod schemas are defined here; their inferred TS types are imported by both Angular and NestJS.

## Why one source

- Angular reactive forms validate with the same rules the API enforces.
- The NestJS validation pipe (`nestjs-zod`) accepts these schemas directly.
- Refactors touch one file; types flow everywhere.

## What's here

- Enums mirroring the Prisma schema (`UserRole`, `Locale`, `BookingStatus`, `PaymentChannel`)
- Primitives: `GhanaPhone`, `Money`, `GeoPoint`

DTOs for specific endpoints (login, register, create booking, etc.) will be added per-feature in subsequent milestones.

## Milestone status

- M1 done — scaffolded with starter primitives and tests.
