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

- M1 ✅ scaffolded as a default Nest app.
- M2 ✅ `auth`, `users`, `artisans` modules live. Helmet + CORS + cookie-parser + global Zod validation + throttler. OpenAPI exposed at `/api/docs` and `/api/openapi.json`.
- M3 ✅ `verification` module live: presigned S3 uploads, submit-for-review enqueues `kyc.verify`, admin queue + detail + review endpoints.
- M4 ✅ `voice` module: presigned audio upload, submit-for-transcription enqueues `voice.transcribe`. Artisan detail endpoint now returns a presigned playback URL.
- M5 ✅ `bookings` + `payments` modules: full escrow lifecycle, XState-driven transitions, dispute flow, double-entry ledger.

## Endpoints (M2)

| Method | Path                    | Auth   | Notes                                                                              |
| ------ | ----------------------- | ------ | ---------------------------------------------------------------------------------- |
| POST   | `/api/auth/otp/request` | Public | Body: `{ phone }`. 204 on success — never reveals whether the user exists.         |
| POST   | `/api/auth/otp/verify`  | Public | Body: `{ phone, code, fullName?, role? }`. Sets `refresh_token` cookie.            |
| POST   | `/api/auth/refresh`     | Cookie | Rotates the refresh token.                                                         |
| POST   | `/api/auth/logout`      | Bearer | Revokes all refresh tokens for the user.                                           |
| GET    | `/api/users/me`         | Bearer | Current user incl. artisan profile + verification.                                 |
| PATCH  | `/api/users/me`         | Bearer | Update name/email/locale/avatar.                                                   |
| GET    | `/api/artisans`         | Public | Query: `lat, lng, radiusKm?, trade?, limit?, verifiedOnly?`. PostGIS `ST_DWithin`. |
| GET    | `/api/artisans/:id`     | Public | Artisan detail.                                                                    |
| PUT    | `/api/artisans/me`      | Bearer | Upsert caller's artisan profile (also promotes role to `ARTISAN`).                 |
| GET    | `/api/artisans/me`      | Bearer | Caller's artisan profile.                                                          |

## Endpoints (M3 — verification)

| Method | Path                           | Auth         | Notes                                                                             |
| ------ | ------------------------------ | ------------ | --------------------------------------------------------------------------------- |
| POST   | `/api/verification/start`      | Bearer       | Body: content types. Returns presigned PUT URLs for front/back/selfie.            |
| POST   | `/api/verification/submit`     | Bearer       | Body: `{ ghanaCardNumber, frontKey, backKey, selfieKey }`. Enqueues `kyc.verify`. |
| GET    | `/api/verification/me`         | Bearer       | Current status + last-4 of card.                                                  |
| GET    | `/api/verification/queue`      | Bearer+ADMIN | Pending submissions, oldest first.                                                |
| GET    | `/api/verification/:id`        | Bearer+ADMIN | Includes presigned GET URLs for all three photos.                                 |
| PATCH  | `/api/verification/:id/review` | Bearer+ADMIN | Body: `{ decision: APPROVED \| REJECTED, reason? }`.                              |

## Endpoints (M4 — voice)

| Method | Path                            | Auth   | Notes                                                                 |
| ------ | ------------------------------- | ------ | --------------------------------------------------------------------- |
| POST   | `/api/voice/intro/upload-url`   | Bearer | Body: `{ contentType }`. Returns presigned PUT URL for direct upload. |
| POST   | `/api/voice/intro/submit`       | Bearer | Body: `{ key, hintLocale?, durationSeconds? }`. Enqueues transcribe.  |
| GET    | `/api/voice/intro/playback-url` | Bearer | Presigned GET URL for the caller's own voice intro.                   |

## Endpoints (M5 — bookings + payments)

| Method | Path                              | Auth              | Notes                                                                                                                                             |
| ------ | --------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/api/bookings/voice-upload-url`  | Bearer            | Body: `{ contentType }`. Presigned PUT for the request's voice note.                                                                              |
| POST   | `/api/bookings`                   | Bearer            | Body: `{ artisanId, trade, description?, voiceNoteKey?, scheduledAt?, jobLocation, totalAmount }`. Creates the booking + initiates escrow charge. |
| GET    | `/api/bookings`                   | Bearer            | Caller's bookings (customer + artisan views).                                                                                                     |
| GET    | `/api/bookings/:id`               | Bearer            | Detail with payments + presigned voice URL.                                                                                                       |
| POST   | `/api/bookings/:id/accept`        | Bearer (artisan)  | REQUESTED → ACCEPTED                                                                                                                              |
| POST   | `/api/bookings/:id/decline`       | Bearer (artisan)  | REQUESTED → CANCELLED                                                                                                                             |
| POST   | `/api/bookings/:id/cancel`        | Bearer (customer) | → CANCELLED (any pre-IN_PROGRESS state)                                                                                                           |
| POST   | `/api/bookings/:id/en-route`      | Bearer (artisan)  | ACCEPTED → EN_ROUTE                                                                                                                               |
| POST   | `/api/bookings/:id/arrive`        | Bearer (artisan)  | EN_ROUTE → ON_SITE                                                                                                                                |
| POST   | `/api/bookings/:id/start-work`    | Bearer (artisan)  | ON_SITE → IN_PROGRESS                                                                                                                             |
| POST   | `/api/bookings/:id/complete`      | Bearer (artisan)  | IN_PROGRESS → COMPLETED                                                                                                                           |
| POST   | `/api/bookings/:id/confirm`       | Bearer (customer) | COMPLETED → RELEASED (triggers payout)                                                                                                            |
| POST   | `/api/bookings/:id/dispute`       | Bearer            | Body: `{ reason }`. → DISPUTED, freezes funds.                                                                                                    |
| GET    | `/api/bookings/admin/disputes`    | Bearer+ADMIN      | All DISPUTED bookings.                                                                                                                            |
| POST   | `/api/bookings/:id/resolve`       | Bearer+ADMIN      | Body: `{ resolution: RELEASE \| REFUND, reason? }`.                                                                                               |
| GET    | `/api/payments/:bookingId/status` | Bearer            | All payment rows + state for a booking.                                                                                                           |
| POST   | `/api/payments/webhook`           | Public            | Hubtel webhook target. HMAC-SHA256 verified; ignores unsigned/unknown refs.                                                                       |
