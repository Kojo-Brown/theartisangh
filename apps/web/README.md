# apps/web — Customer & Artisan App

Mobile-first responsive Angular 21 PWA. This is the surface customers and artisans use to:

- Browse and search nearby artisans by trade
- Onboard with phone + SMS OTP
- Request jobs (text and voice notes, in en/tw/ga/ee)
- Book, pay (MoMo / card), and track artisans live
- Rate completed jobs

## Run

```bash
pnpm dev:web   # http://localhost:4200
```

## Key choices

- **Standalone components + signals + SSR** — no NgModules, smaller bundles, faster TTI on low-end Android
- **Vitest** for unit, **Playwright** for E2E
- **Tailwind 3** + Angular Material 21 — primitives + custom styling
- **PWA** via `@angular/service-worker` — offline browsing of cached artisan profiles, installable on Android
- **NgRx Signal Store** for state (lighter than classic NgRx)
- **Mapbox GL JS** for maps + live tracking
- **`@angular/localize`** + ICU messages from `@artisangh/shared-i18n`

## Conventions

- Lazy-load every feature route; target < 200 KB initial JS.
- Reactive forms use Zod schemas from `@artisangh/shared-types` (same validators as the API).
- API calls go through the generated client in `@artisangh/web-api-client`. Never hand-write `fetch`.

## Milestone status

- M1 ✅ scaffolded with Tailwind, SSR, Vitest, Playwright. No business code yet.
