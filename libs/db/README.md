# libs/db — Prisma Data Layer

Owns the Prisma schema and exports the typed client.

## Schema

`prisma/schema.prisma` — PostgreSQL with the `postgis` extension enabled. Geographic columns use `Unsupported("geography(Point, 4326)")`; GiST indexes are added in a follow-up migration.

Initial models:

- `User`, `ArtisanProfile`, `Verification`
- `Booking`, `Milestone`
- `Payment`, `LedgerEntry`
- `TrackingPing`
- `Message`, `Review`
- `OtpAttempt`

## Commands

Run from the repo root:

```bash
pnpm prisma:generate       # generate the client
pnpm prisma:migrate        # create + apply a new migration (dev)
pnpm prisma:studio         # browse the DB at http://localhost:5555
```

Or use the local script in this package:

```bash
pnpm --filter @artisangh/db prisma <subcommand>
```

## Usage

```ts
import { PrismaClient } from '@artisangh/db';
const prisma = new PrismaClient();
```

In NestJS, prefer the `PrismaService` singleton from `@artisangh/api-core` (added in M2).

## Milestone status

- M1 done — schema + client wired. No migrations yet (deferred to M2 when the auth flow needs the `User` table).
