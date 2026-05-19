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

- M1 ✅ scaffolded with Tailwind, SSR, Vitest, Playwright.
- M2 ✅ end-to-end auth flow + onboarding + search.
- M3 ✅ verification flow (Ghana Card front+back+selfie via camera or upload, direct presigned PUT to S3, then submit). Dashboard surfaces the status (approved / pending / rejected) with retry-on-rejection.
- M4 ✅ voice intro recorder integrated into artisan onboarding (browser MediaRecorder, up to 60s, browser-direct upload). Customers hear the intro on the artisan detail page with the transcript inline. Translation catalogs expanded to ~50 keys per locale; locale auto-detects from `navigator.language` on first load.
- M5 ✅ Booking flow end-to-end. Customer "Request this artisan" page accepts text + voice description, geolocation, scheduled time, and amount; dev stub auto-confirms payment, real Hubtel redirects to checkout. `/bookings` list shows status badges. `/bookings/:id` detail surfaces state-aware action buttons (Accept/Decline/Start/Arrive/Complete for artisans, Confirm/Dispute/Cancel for customers).

## Routes (M2)

| Path                    | Component                      | Auth     |
| ----------------------- | ------------------------------ | -------- |
| `/`                     | `HomeComponent`                | Public   |
| `/auth/login`           | `LoginComponent` (phone → OTP) | Public   |
| `/onboarding`           | `RolePickComponent`            | Required |
| `/onboarding/artisan`   | `ArtisanOnboardingComponent`   | Required |
| `/dashboard`            | `DashboardComponent`           | Required |
| `/search`               | `SearchComponent` (PostGIS)    | Public   |
| `/artisans/:id`         | `ArtisanDetailComponent`       | Public   |
| `/verification`         | `VerificationComponent`        | Required |
| `/artisans/:id/request` | `RequestBookingComponent`      | Required |
| `/bookings`             | `BookingsListComponent`        | Required |
| `/bookings/:id`         | `BookingDetailComponent`       | Required |

## State + i18n

- `AuthStore` (signals, `providedIn: 'root'`) holds the access token + cached user; refresh-token rotation is transparent via `ApiClient.onUnauthorized`.
- `I18nService` exposes a `t()` lookup over the `@artisangh/shared-i18n` catalogs; the locale picker in the shell writes to localStorage (browser-only).
