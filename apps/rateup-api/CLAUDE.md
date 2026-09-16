# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

`AGENTS.md` (imported above) covers build/lint/test commands, the tech stack, and common pitfalls. The notes below cover architecture that spans multiple files.

## Running a single test

- All tests: `npm run test` (Vitest, runs silently)
- One file: `npx vitest run src/modules/foo/foo.test.ts`
- By name: `npx vitest run -t "test name substring"`
- Watch a file: `npx vitest src/modules/foo/foo.test.ts`

## App bootstrap flow

1. `src/index.ts` — entry point; sets server options (body limit, timeouts, `trustProxy`), wires `unhandledRejection`/`uncaughtException` and SIGTERM/SIGINT graceful shutdown, then `listen()`s and calls `server.cron.startAllJobs()`.
2. `src/app.ts` — `build()` creates the Fastify instance with the Zod type provider (`validatorCompiler`/`serializerCompiler`), registers plugins, then registers routes inside `server.after()`.
3. `src/plugins/index.ts` — `registerPlugins()` initializes, in order: SuperTokens (auth) + its Fastify plugin and error handler, CORS, WebSocket, Kafka producer, BullMQ workers, cron jobs, and Swagger (only when `SWAGGER=1`).
4. `src/registerRoutes.ts` — a single `routeConfigs` array maps each module's route plugin to a URL prefix. **To add a new route group, import its route plugin and add an entry here.** Public (unauthenticated) routes live under `/api/public/*`; everything else expects a session.

## Module pattern

Feature modules live in `src/modules/<domain>/` and follow a consistent file layout (see `src/modules/survey/` as the reference):

- `*.route.ts` — Fastify plugin exporting the route definitions; attaches `preHandler` hooks and Zod `schema` per route. Public variants are named `*.public.route.ts`.
- `*.controller.ts` — request handlers (the `*Handler` functions).
- `*.service.ts` — business logic and Prisma access; also holds functions invoked by cron jobs.
- `*.schema.ts` — Zod request/response schemas and their inferred types.
- `*.auth.ts` — module-specific `preHandler` access checks (e.g. `verifySurveyAccess`).

## Request auth & authorization layering

Auth is applied via `preHandler` hooks, typically composed in this order on protected routes:

1. `checkSession` (`src/utils/checkSession.ts`) — validates the SuperTokens session, then decorates the request with `request.userId` and `request.user = { userId, role, orgId, email }` (pulled from the access-token payload set in `src/config.ts`'s `Session.init` override). Also fires the audit-log hook.
2. `getVerifySubscriptionHandler([...features])` (`src/utils/auth.ts`) — checks the org's subscription/expiry and required feature flags; sets `request.subscription`. Note: when no subscription exists it currently auto-creates an unlimited free plan rather than rejecting.
3. Feature gating (`src/utils/permissions.ts`) — `requireFeature(TeamFeature.x)` / `attachUserFeatures` gate on per-team `TeamFeature` access; `SUPER_ADMIN` bypasses all feature checks.
4. Module-specific checks (`*.auth.ts`) — resource ownership, e.g. `hasAccessToSurvey`/`hasAccessToTeam` in `src/utils/auth.ts`.

Authentication is **SuperTokens** (EmailPassword + Google/Apple ThirdParty + Passwordless SMS), all configured in `src/config.ts`. Sign-up/sign-in overrides there create the app-side user record and stamp `orgId`/`role` onto the session. Authorization combines role checks, CASL (`@casl/ability`), and the `TeamFeature` system.

## Database (Prisma)

- Single schema: `prisma/schema.prisma`. The client is generated to **`generated/prisma/`** (not `node_modules`), so imports use a relative path like `import { Role } from "../../generated/prisma/client.js"`.
- Import the shared client instance from `src/utils/prisma.ts` (default export) — it wires the `@prisma/adapter-pg` Postgres adapter. Do not instantiate `PrismaClient` per module.
- Run `npx prisma generate` after any schema change (also runs on `npm install` via postinstall).
- `excludeFields(obj, [...])` in `src/utils/prisma.ts` is the helper for omitting fields Prisma can't selectively exclude.

## Background processing

Three independent mechanisms — know which one a task belongs to:

- **BullMQ queues** (`src/utils/redisConnection.ts`) — all `Queue` instances (WhatsApp campaigns, webhooks, notifications, Shopify, etc.) share one ioredis connection (default export). Workers live in `src/jobs/*.worker.ts` and are registered by importing them in `src/jobs/index.ts` (`registerWorkers`). Workers duplicate the base Redis connection. Producers enqueue by importing the relevant queue.
- **Cron jobs** (`src/plugins/cron.ts`) — `fastify-cron` schedule; each `onTick` calls service functions wrapped in `safeRun()` so one failure doesn't abort the batch. Add recurring work here.
- **Kafka** (`src/plugins/kafka.ts`) — a single producer is decorated onto the instance as `server.kafka.producer`; connection retries on startup and continues without Kafka if it can't connect.

## Conventions & gotchas

- **ESM only**: every relative import must include the `.js` extension (even for `.ts` source), e.g. `import { x } from "./foo.js"`. CommonJS `require` is not available.
- **Generated Prisma path**: import types/enums from `generated/prisma/client.js` via relative path, not `@prisma/client`.
- **Formatting/linting**: oxfmt + oxlint (not Prettier), enforced on staged files by husky + lint-staged.
- **External partner API**: `src/external/v1/` is a versioned, org-scoped API surface (mounted at `/api/external/v1/:orgId`) distinct from the first-party `/api/*` routes; token auth via the `apiAccessToken` module.
