# libs/shared/i18n — Translation Catalogs

Plain JSON message catalogs for the four supported locales.

| Code | Language   |
| ---- | ---------- |
| `en` | English    |
| `tw` | Twi (Akan) |
| `ga` | Ga         |
| `ee` | Ewe        |

## How it's consumed

- `apps/web` and `apps/admin` use `@angular/localize` with ICU messages backed by these JSON files.
- `apps/api` and `apps/worker` use them for SMS / push notification copy.

## Editorial workflow

- All keys must exist in `en.json` first.
- Translations are placeholders today and need a human linguistic review before launch (M4 includes that pass).

## Milestone status

- M1 done — scaffolded with starter strings in all four locales. Real copy + review in M4.
