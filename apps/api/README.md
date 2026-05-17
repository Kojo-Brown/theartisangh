# apps/api — HTTP + WebSocket API

NestJS 11 modular monolith. Single deployable that serves the REST API and the Socket.IO gateway used for live tracking and chat.

## Run

```bash
pnpm dev:api   # http://localhost:3000
```

## Key choices

- **Modular monolith** — feature modules in `libs/api/*`, mounted here. Easier to operate at MVP scale; modules can be sliced into services later.
- **Prisma 6** via `@artisangh/db` for data access. Singleton `PrismaService` lives in `libs/api/core`.
- **Zod** (`nestjs-zod`) for request validation, using the schemas from `@artisangh/shared-types` — the same schemas the Angular forms use.
- **Socket.IO** gateway for booking-scoped rooms (live ETA, chat).
- **Jest** for tests (Nest decorators play more nicely with Jest than Vitest).
- **OpenAPI** auto-generated from controller decorators; the Angular client is generated from this spec.

## Module layout (target)

```
src/
├── auth/             phone + SMS OTP, JWT issuance, refresh-token rotation
├── users/            customer + artisan profiles
├── verification/     thin REST surface; heavy work in apps/worker
├── bookings/         booking lifecycle state machine
├── payments/         Hubtel adapter + webhook
├── tracking/         Socket.IO gateway
├── messaging/        booking-scoped chat
└── reviews/          ratings + reviews
```

## Milestone status

- M1 ✅ scaffolded as a default Nest app. Modules above are populated in M2 onward.
