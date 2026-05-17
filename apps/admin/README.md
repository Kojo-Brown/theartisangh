# apps/admin — Back-office Console

Angular 21 SPA for the operations team. Runs separately from `apps/web` because the audience, auth scope, and bundle are different.

## What lives here

- **Verification queue** — ambiguous Ghana Card / selfie matches that need a human reviewer (M3)
- **Dispute handling** — bookings in `DISPUTED` state, evidence + ledger view, refund/release tools (M5)
- **Ledger inspection** — money-movement audit trail (M5)
- **Ops dashboards** — bookings funnel, payment failure rates, artisan supply per city (M7)

## Run

```bash
pnpm dev:admin   # http://localhost:4300
```

## Key choices

- No SSR (internal tool, SEO doesn't matter).
- Same UI primitives as `apps/web` (Material + Tailwind) for visual consistency.
- Admin-only JWT scope enforced at the API.

## Milestone status

- M1 ✅ scaffolded. No business code yet.
