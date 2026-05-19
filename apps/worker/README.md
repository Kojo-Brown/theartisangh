# apps/worker — Background Job Processor

NestJS 11 application that runs **BullMQ** consumers. Shares the codebase with `apps/api` but boots its own process so heavy work doesn't starve the HTTP event loop.

## Run

```bash
pnpm dev:worker
```

## What it handles

| Queue                | Purpose                                              | Milestone |
| -------------------- | ---------------------------------------------------- | --------- |
| `sms.send`           | Hubtel SMS dispatch (OTP, booking updates)           | M2        |
| `kyc.verify`         | Rekognition face-match + Textract OCR for Ghana Card | M3        |
| `voice.transcribe`   | Whisper transcription of customer voice notes        | M4        |
| `payment.reconcile`  | Hubtel webhook follow-up + ledger writes             | M5        |
| `tracking.compact`   | Downsample tracking pings after job completion       | M6        |
| `notifications.push` | Web push notifications                               | M7        |

## Key choices

- Shares `@artisangh/db` and `@artisangh/api-core` with the API — code reuse, not duplication.
- One process can host all queues at MVP scale; can be split per-queue when load demands.
- Idempotency built into every job — assume Hubtel/Whisper may deliver duplicates.

## Milestone status

- M1 ✅ scaffolded as a default Nest app.
- M2 ✅ BullMQ wired; `sms.send` consumer active and delegates to the shared `SMS_PROVIDER` injection token from `@artisangh/api-core` (Console stub in dev, Hubtel adapter when `SMS_PROVIDER=hubtel`).
- M3 ✅ `kyc.verify` consumer reads photos from S3, runs face-match + OCR through the shared provider interfaces, KMS-encrypts the Ghana Card number, and writes the decision back to the `Verification` row. Stub providers in dev auto-approve at the configured similarity; AWS adapters activate when `KYC_PROVIDER=aws`.
- M4 ✅ `voice.transcribe` consumer reads audio from S3, calls the `Transcriber` provider (Stub in dev, OpenAI Whisper when `WHISPER_PROVIDER=openai`), and writes transcript + detected locale back to the artisan profile. Job payload discriminates on `kind` so M5 booking voice notes can reuse the queue.
