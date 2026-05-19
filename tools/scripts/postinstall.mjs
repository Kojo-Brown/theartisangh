/* eslint-disable no-console */
/**
 * Runs after every `pnpm install`. Idempotent and safe on CI:
 *   1. Copy .env.example → .env if .env is missing (dev convenience).
 *   2. Generate the Prisma client into the hoisted @prisma/client location
 *      so apps/api + apps/worker can boot without "did not initialize yet".
 *
 * If anything fails we log a hint and exit 0 — we never want a postinstall
 * to break `pnpm install` (e.g. on a contributor's first checkout before
 * they've copied .env).
 */
import { existsSync, copyFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..', '..');
const envPath = resolve(root, '.env');
const examplePath = resolve(root, '.env.example');

// 1. Bootstrap .env once.
if (!existsSync(envPath) && existsSync(examplePath)) {
  copyFileSync(examplePath, envPath);
  console.log('postinstall: copied .env.example → .env');
}

// 2. Generate the Prisma client.
const schema = resolve(root, 'libs/db/prisma/schema.prisma');
if (!existsSync(schema)) {
  console.log('postinstall: no Prisma schema, skipping generate');
  process.exit(0);
}

const result = spawnSync(
  'pnpm',
  ['--filter', '@artisangh/db', 'exec', 'prisma', 'generate'],
  { cwd: root, stdio: 'inherit', shell: false },
);

if (result.status !== 0) {
  console.log(
    'postinstall: prisma generate failed (probably first install before .env was filled in). Run `pnpm prisma:generate` manually.',
  );
}

process.exit(0);
