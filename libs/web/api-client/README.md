# libs/web/api-client — Generated API Client for Angular

Generated from the NestJS-exposed OpenAPI document via `openapi-generator-cli`. Hand-editing files in this lib is forbidden — they will be overwritten.

## How it gets generated

A script (added in M2) will:

1. Boot `apps/api` long enough to dump `/api-json`.
2. Run `openapi-generator-cli generate -i ./openapi.json -g typescript-angular -o libs/web/api-client/src/generated`.
3. Re-export from `libs/web/api-client/src/index.ts`.

## Usage

```ts
import { ArtisansService } from '@artisangh/web-api-client';
```

## Milestone status

- M1 done — lib scaffolded as a placeholder. Generation wired in M2 once the API exposes routes.
