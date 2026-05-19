# The Artisan GH

> A marketplace connecting Ghanaian customers with trusted artisans, electricians, plumbers, masons, carpenters and skilled or unskilled workers.

This repository is an **Nx monorepo** containing the entire stack — Angular web apps, NestJS services, shared TypeScript libraries, infrastructure-as-code, and the Prisma data layer.

---

## 📑 Table of contents

1. [Project goals & differentiators](#-project-goals--differentiators)
2. [Architecture](#-architecture)
3. [Tech stack](#-tech-stack)
4. [Repo layout](#-repo-layout)
5. [Getting started (local dev)](#-getting-started-local-dev)
6. [Environment variables](#-environment-variables)
7. [Milestone roadmap & progress](#-milestone-roadmap--progress)
8. [Convention: maintaining this README](#-convention-maintaining-this-readme)

---

## 🎯 Project goals & differentiators

The Ghanaian artisan market is large, mobile-first, and dominated by trust, language and payment friction. The Artisan GH targets all three with **four flagship v1 features**:

| #   | Feature                                                                                                                     | Problem it solves                                                                   |
| --- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 1   | **Verified artisan badges** — Ghana Card + selfie + (optional) trade certification, reviewed by AI + human admin queue      | Customers can't tell who is real or skilled — verification breaks the trust barrier |
| 2   | **Voice-note job requests with Twi / Ga / Ewe support** — record audio, transcribed by Whisper, UI fully localised          | Many artisans are not literate in English; voice opens the platform to them         |
| 3   | **Live location + ETA tracking** — Uber/Bolt-style map view from booking acceptance through arrival                         | Removes the "is the plumber even coming?" anxiety that kills bookings               |
| 4   | **Escrow + milestone payments** — funds held by the platform until milestones are signed off, with disputes routed to admin | Removes the "do I pay before or after?" deadlock for any job over GHS 100           |

Target user surfaces (v1): **responsive web only** (mobile-first PWA). Native mobile is post-v1.

---

## 🏗 Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                  Cloudflare (CDN + WAF + R2)                   │
└────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                                           ▼
┌──────────────────┐                      ┌───────────────────┐
│  apps/web        │  ◄── WebSocket ──►   │  apps/api         │
│  Angular 21 PWA  │  ◄──── REST ─────►   │  NestJS 11        │
│  (mobile-first)  │                      │  modular monolith │
└──────────────────┘                      └─────────┬─────────┘
                                                    │
        ┌───────────────────────┬───────────────────┼───────────────────┐
        ▼                       ▼                   ▼                   ▼
  ┌───────────┐         ┌──────────────┐    ┌─────────────┐     ┌────────────┐
  │ Postgres  │         │  Redis 7     │    │ apps/worker │     │  R2 / S3   │
  │ + PostGIS │         │ cache+pubsub │    │ BullMQ jobs │     │ media+KYC  │
  │     17    │         │  sessions    │    │ (NestJS)    │     │            │
  └───────────┘         └──────────────┘    └──────┬──────┘     └────────────┘
                                                   │
                ┌──────────────┬───────────────────┼──────────────┬──────────────┐
                ▼              ▼                   ▼              ▼              ▼
          ┌──────────┐  ┌──────────────┐    ┌──────────┐  ┌────────────┐  ┌──────────┐
          │  Hubtel  │  │  Whisper     │    │ Mapbox   │  │ AWS Rekog. │  │ Resend   │
          │ MoMo+SMS │  │ voice→text   │    │ ETA+geo  │  │ KYC match  │  │ email    │
          └──────────┘  └──────────────┘    └──────────┘  └────────────┘  └──────────┘
```

**Why a modular monolith?** Easier to operate at MVP scale and easy to slice out modules into services later when a domain (payments, tracking) earns its own scaling story.

The dedicated `apps/admin` Angular app is the back-office for the verification queue, dispute handling, ledger inspection and ops dashboards.

---

## 🧰 Tech stack

| Layer                               | Choice                                                              | Version                         |
| ----------------------------------- | ------------------------------------------------------------------- | ------------------------------- |
| Monorepo                            | Nx + pnpm                                                           | 22.7 / pnpm 9+                  |
| Web                                 | Angular (standalone, signals, SSR via `@angular/ssr`, esbuild, PWA) | 21                              |
| Web UI                              | Angular Material + TailwindCSS                                      | 21 / 3                          |
| Maps                                | Mapbox GL JS                                                        | latest                          |
| API                                 | NestJS on Node 22 LTS                                               | 11                              |
| ORM                                 | Prisma                                                              | 6                               |
| Database                            | PostgreSQL + PostGIS                                                | 17 / 3.5                        |
| Cache + pub-sub + sessions          | Redis (Valkey-compatible)                                           | 7                               |
| Background jobs                     | BullMQ (Redis)                                                      | latest                          |
| Realtime                            | Socket.IO                                                           | latest                          |
| Object storage                      | Cloudflare R2 (prod) / MinIO (dev)                                  | latest                          |
| Validation (single source of truth) | Zod                                                                 | 4                               |
| Payments + SMS OTP                  | Hubtel (MoMo, cards, SMS)                                           | —                               |
| Voice → text                        | OpenAI Whisper `large-v3` (provider toggleable)                     | —                               |
| KYC face match                      | AWS Rekognition + Textract                                          | —                               |
| Hosting                             | AWS Cape Town (`af-south-1`)                                        | ECS Fargate + RDS + ElastiCache |
| Observability                       | OpenTelemetry → Grafana Cloud + Sentry                              | —                               |
| Commit hooks                        | Husky + lint-staged + commitlint                                    | latest                          |
| CI                                  | GitHub Actions (later milestone)                                    | —                               |

---

## 📁 Repo layout

```
theartisangh/
├── apps/
│   ├── web/                Angular 21 PWA (customer + artisan surfaces)
│   ├── admin/              Angular 21 back-office (verification, disputes, ops)
│   ├── api/                NestJS HTTP + WebSocket gateway
│   ├── worker/             NestJS background-job consumer (BullMQ)
│   ├── web-e2e/            Playwright E2E for web
│   ├── admin-e2e/          Playwright E2E for admin
│   ├── api-e2e/            Jest E2E for api
│   └── worker-e2e/         Jest E2E for worker
├── libs/
│   ├── shared/types/       Zod schemas + inferred TS types (client ↔ server)
│   ├── shared/i18n/        Translation catalogs (en / tw / ga / ee)
│   ├── api/core/           Shared NestJS module (logger, config, filters)
│   ├── web/api-client/     OpenAPI-generated client for Angular
│   └── db/                 Prisma schema + generated client
├── infra/
│   └── docker/             Local dev compose (Postgres + Redis + MinIO + MailHog)
├── .husky/                 Git hooks (pre-commit + commit-msg)
├── .env.example            All env vars consumed by the stack
├── nx.json                 Nx config (plugins, generators, targetDefaults)
├── pnpm-workspace.yaml     apps/* + libs/**
├── tsconfig.base.json      Strict TS for the whole workspace
└── package.json            Convenience scripts (dev:*, db:*, prisma:*)
```

---

## 🚀 Getting started (local dev)

### Prerequisites

- **Node 22+** (we recommend installing via [Volta](https://volta.sh) or `nvm`)
- **pnpm 9+** (`corepack enable && corepack prepare pnpm@latest --activate`)
- **Docker** (for local Postgres / Redis / MinIO)

### First-time setup

```bash
# 1. Install dependencies
pnpm install

# 2. Copy env template and edit secrets as needed
cp .env.example .env

# 3. Bring up local services (Postgres + Redis + MinIO + MailHog)
pnpm db:up

# 4. Generate the Prisma client and apply migrations
pnpm prisma:migrate

# 5. Boot the four dev processes in separate terminals
pnpm dev:api       # NestJS API on :3000
pnpm dev:worker    # NestJS BullMQ worker
pnpm dev:web       # Angular customer/artisan app on :4200
pnpm dev:admin     # Angular admin app on :4300
```

### Useful root scripts

| Script                                       | What it does                                |
| -------------------------------------------- | ------------------------------------------- |
| `pnpm dev:api`                               | Run the API in watch mode                   |
| `pnpm dev:web`                               | Run the Angular customer app                |
| `pnpm dev:admin`                             | Run the Angular admin app                   |
| `pnpm dev:worker`                            | Run the background worker                   |
| `pnpm db:up` / `db:down` / `db:logs`         | Manage the local Docker stack               |
| `pnpm prisma:migrate`                        | Run Prisma migrations against the local DB  |
| `pnpm prisma:studio`                         | Open Prisma Studio                          |
| `pnpm build`                                 | `nx run-many -t build` across the workspace |
| `pnpm lint` / `pnpm typecheck` / `pnpm test` | Quality gates across the workspace          |
| `pnpm exec nx graph`                         | Visualise the project graph                 |

---

## 🔐 Environment variables

See [`.env.example`](./.env.example) for the full set. Highlights:

- `DATABASE_URL` — Postgres connection string
- `REDIS_URL` — Redis connection string
- `S3_*` — object-storage credentials (MinIO locally, R2 in prod)
- `HUBTEL_*` — payment + SMS OTP credentials
- `MAPBOX_ACCESS_TOKEN` — tracking + geocoding
- `WHISPER_PROVIDER` + `OPENAI_API_KEY` — voice transcription
- `AWS_*` + `KYC_KMS_KEY_ID` — Ghana Card verification pipeline
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — auth signing keys

---

## 📈 Milestone roadmap & progress

Each milestone updates this section and the relevant per-app/per-lib READMEs. Boxes are checked only when the verification steps in that milestone pass.

### ✅ Milestone 1 — Foundation

Goal: every subsequent milestone can start without touching scaffolding.

- [x] Nx 22 monorepo with pnpm, integrated TS layout
- [x] Four apps generated: `web`, `admin` (Angular 21 + Tailwind + Vitest + Playwright), `api`, `worker` (NestJS 11 + Jest)
- [x] Shared libs: `shared/types` (Zod), `shared/i18n` (en/tw/ga/ee), `api/core`, `web/api-client`, `db`
- [x] Prisma 6 schema covering users, artisan profiles, verifications, bookings, milestones, payments, ledger, tracking pings, messages, reviews, OTP attempts — with PostGIS geography columns
- [x] Docker Compose for local dev: PostGIS 17, Redis 7, MinIO, MailHog (+ PostGIS init script)
- [x] `.env.example` covering every integration slot (Hubtel, Mapbox, Whisper, AWS KYC, JWT, SMTP)
- [x] Husky pre-commit (lint-staged) + commit-msg (commitlint, conventional commits)
- [x] Prettier + ESLint (per-project flat config from Nx generators) + import-boundary plugin
- [x] Root README + per-app/per-lib READMEs

### ✅ Milestone 2 — Auth + profiles (current)

- [x] `auth` module: phone + SMS OTP, rate-limited, OTPs hashed in Redis. Dev `console` SMS provider logs OTPs to the worker terminal; Hubtel adapter wired and activates when `SMS_PROVIDER=hubtel` + creds are set.
- [x] JWT access (15 min) + rotating refresh token (30 d) in httpOnly cookie; replay-protected via Redis allowlist.
- [x] `users` module (`GET/PATCH /users/me`) + `artisans` module with profile upsert (`PUT /artisans/me`) and PostGIS `ST_DWithin` radius search (`GET /artisans?lat=&lng=&radiusKm=&trade=`).
- [x] Worker app: BullMQ with `sms.send` consumer that delegates to the shared SMS provider interface.
- [x] Web (`apps/web`): signal-store auth, phone+OTP login screen, role pick, artisan onboarding form (trades, hourly rate, radius, geolocation), customer-side search UI with "near me", artisan detail page. Locale picker in the shell (en/tw/ga/ee) backed by `@artisangh/shared-i18n`.
- [x] OpenAPI exposed at `/api/docs` (`/api/openapi.json`). For M2 we ship a hand-rolled typed `ApiClient` in `@artisangh/web-api-client` rather than wiring the OpenAPI generator (it requires Java/Docker) — codegen can replace it later without surface changes.
- [x] GitHub Actions CI: `lint + typecheck + test + build` via `nx affected`, with Postgres + PostGIS + Redis service containers, Prisma migrations applied in-CI.

**Decisions worth knowing:**

- DB host port is `55432` (not `5432`) to coexist with Homebrew Postgres on dev machines.
- Prisma owns the PostGIS extension family (`postgis`, `postgis_topology`, `postgis_tiger_geocoder`, `fuzzystrmatch`, `pgcrypto`, `uuid-ossp`). The init SQL script was removed — `prisma migrate dev` installs everything.
- The Angular apps need `lib: ["es2022", "dom"]` and the project-references flags (`composite`, `declaration`, `declarationMap`, `emitDeclarationOnly`) explicitly unset; baked into `apps/{web,admin}/tsconfig.json`.

### ✅ Milestone 3 — Verification (trust layer)

- [x] Ghana Card front + back + selfie uploaded via S3 presigned PUT URLs. MinIO locally (auto-bucket creation on boot); Cloudflare R2 in prod via the same S3 client.
- [x] Worker `kyc.verify` pipeline runs face-match + ID OCR through provider interfaces, KMS-encrypts the card number, and writes the decision (`APPROVED` / `PENDING` / `REJECTED`).
- [x] Provider abstractions in `@artisangh/api-core`: `FaceMatchProvider`, `IdOcrProvider`, `Encryptor`. Dev stubs auto-approve with a configurable similarity (default 95) and AES-256-GCM encryption with a local key; AWS adapters (Rekognition `CompareFaces`, Textract `AnalyzeID`, KMS `Encrypt`/`Decrypt`) activate when `KYC_PROVIDER=aws` + creds + `KYC_KMS_KEY_ID` are set.
- [x] Admin app (`apps/admin`) now functional: phone+OTP login enforcing `role=ADMIN`, verification queue, detail view with all three photos (via presigned GETs), approve/reject actions.
- [x] Verified badge already surfaces in `/artisans` search results (search joins `Verification` and returns `verified: boolean`); dashboard shows the artisan's own status with retry-on-rejection.
- [x] Admin bootstrap CLI: `pnpm admin:promote +233241234567 "Nicholas Brown"` — the only way to mint an ADMIN account.

**Decisions worth knowing:**

- KYC pipeline thresholds: `KYC_AUTO_APPROVE_THRESHOLD` (default 90) goes straight to APPROVED, 60–89 lands in PENDING (admin review), <60 is REJECTED. OCR card number mismatch always sends to PENDING regardless of face score.
- Encrypted Ghana Card numbers are stored as `Bytes` (`ghanaCardNumberEnc`) with `ghanaCardLast4` exposed for display. Wire format for the local AES-GCM encryptor is `[12B IV][16B tag][ciphertext]` — opaque to the rest of the app.
- The admin app reuses `@artisangh/web-api-client` (same `ApiClient`) — only the `role === 'ADMIN'` gate in `AdminAuthStore` differs.

### ⏳ Milestone 4 — Voice notes + i18n ← **NEXT**

- [ ] Browser MediaRecorder capture in `apps/web`
- [ ] BullMQ `voice.transcribe` job with Whisper provider abstraction
- [ ] ICU message bundles wired through `@angular/localize` for tw / ga / ee
- [ ] Locale picker on first load, persisted per user

### ⏳ Milestone 5 — Bookings + escrow

- [ ] Booking state machine (XState) in `libs/api/core`
- [ ] Hubtel charge-in via MoMo push + card, webhook verification, idempotent
- [ ] Milestone funding / release / refund + double-entry ledger
- [ ] Dispute flow → admin ticket
- [ ] Customer + artisan booking UIs

### ⏳ Milestone 6 — Live tracking

- [ ] Socket.IO gateway with booking-scoped rooms
- [ ] `Geolocation.watchPosition` in artisan UI with battery-conscious throttling
- [ ] Mapbox Directions ETA cached in Redis (~60s TTL)
- [ ] PostGIS tracking-ping table partitioned monthly, downsampled after job completion

### ⏳ Milestone 7 — Production hardening + deploy

- [ ] Production Dockerfiles for `api`, `worker`, `web` (SSR)
- [ ] Terraform / CDK for AWS Cape Town: ECS Fargate, RDS, ElastiCache, ALB, Secrets Manager
- [ ] Cloudflare in front (CDN, WAF, R2)
- [ ] OTel → Grafana Cloud; Sentry wired in all apps
- [ ] Closed beta in one Accra suburb

---

## 📝 Convention: maintaining this README

> **At the end of every milestone, this README and the relevant per-app / per-lib READMEs must be updated:**
>
> - check the boxes that now pass their verification
> - move newly discovered work into the appropriate milestone
> - record any architecture decisions that diverged from the original plan in a new "Decisions" subsection of the affected milestone
>
> This is the single source of truth for the project plan. If it disagrees with the code, the code is right but the README is the bug.

---

## 📜 License

UNLICENSED — proprietary, all rights reserved.
