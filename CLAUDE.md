<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->

# The Artisan GH — Project-specific notes

- **Read `README.md` first.** It is the source of truth for architecture, stack and milestones.
- **Workspace package manager is `pnpm`.** Don't use npm/yarn.
- **TS setup uses Nx project references with `composite: true`.** The Angular generator does not support this — when running `nx g @nx/angular:*`, set `NX_IGNORE_UNSUPPORTED_TS_SETUP=true`.
- **Prisma schema lives in `libs/db/prisma/schema.prisma`.** Run migrations with `pnpm prisma:migrate` from the repo root.
- **Phone number is the primary user identifier** (Ghana market). Email is optional.
- **Money is in GHS (Ghana cedis).** Use the `Money` schema from `@artisangh/shared-types`.
- **Geo data uses PostGIS `geography(Point, 4326)`** — Prisma sees it as `Unsupported(...)` so raw SQL is needed for distance / radius queries.
- **At the end of every milestone, update `README.md` and the relevant per-app / per-lib README** — that's the project convention.
