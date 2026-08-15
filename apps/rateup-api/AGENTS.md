# AGENTS.md

## Project Description

- **Name:** rateup-api
- **Type:** Scalable API backend for the Rateup platform
- **Language:** TypeScript (Node.js, ESM)
- **Framework:** Fastify 5
- **Main entry:** src/index.ts (API), src/workers/bullmq/index.ts, src/workers/kafka/index.ts
- **Repository:** https://github.com/TeamFynext/rateup-api

## Deployment Topology

One repo, three long-running processes, deployed as three Railway services off the same
build:

| Service  | Entry                         | Runs                                   | Replicas              |
| -------- | ----------------------------- | -------------------------------------- | --------------------- |
| `api`    | `src/index.ts`                | HTTP routes, WebSocket, Kafka producer | scale freely          |
| `bullmq` | `src/workers/bullmq/index.ts` | Queue consumers + wall-clock schedule  | scale freely          |
| `kafka`  | `src/workers/kafka/index.ts`  | Stream consumers (`status-events`)     | up to partition count |

All three scale horizontally. The `bullmq` service used to be pinned to one replica
because its cron ran as in-process timers with no lock; the schedule now lives in Redis as
BullMQ job schedulers (`SCHEDULED_JOBS` in `queues/cron.queue.ts`), so each occurrence is
delivered to exactly one worker no matter how many are running. For throughput on a single
backed-up queue, raising that processor's `concurrency` is usually cheaper than another
replica. The `kafka` service scales up to the topic's partition count, since every consumer
joins a fixed `groupId`.

One consequence of the Redis-backed schedule: an occurrence missed while the service is
down is **not** skipped the way a cron timer would skip it. The delayed job is already in
Redis, so it runs late — once — when a worker returns.

```
src/workers/
├── bullmq/
│   ├── index.ts          # bullmq service entrypoint
│   ├── queues/           # Queue (producer) definitions — safe to import anywhere
│   └── processors/       # Worker (consumer) definitions — worker service only
├── kafka/
│   ├── index.ts          # kafka service entrypoint
│   └── consumers/
└── shared/               # support code both worker services use
```

`shared/` is the absorbed message-dispatcher service (see "Absorbed services" below): a
raw `pg` data layer plus the WhatsApp send/status helpers. It talks to Postgres through
`pg.Pool`, **not** Prisma — do not assume Prisma models are available in there.

Rules to keep in mind when adding code:

- **Never construct a `Worker` in a module the API imports.** Producers and consumers
  belong in separate files — see `queues/backfill.queue.ts` vs
  `processors/backfillConversation.processor.ts`. A `Worker` at module scope in a
  route-reachable file turns every API replica into a consumer.
- Anything that _enqueues_ imports from `src/workers/bullmq/queues/`. Nothing outside
  `src/workers/` may import from `processors/`.
- New consumers go in `processors/`, export their `Worker` instance, and get added to
  `PROCESSOR_MODULES` in `src/workers/bullmq/index.ts` (the export is what lets shutdown
  drain them).
- New scheduled jobs need two edits: an entry in `SCHEDULED_JOBS` (`queues/cron.queue.ts`)
  and a handler of the same id in `HANDLERS`
  (`processors/scheduledJobs.processor.ts`). The handler map is typed against the
  definition list, so forgetting either half is a compile error. `syncJobSchedulers()`
  registers them on boot and removes schedulers whose definition is gone.
- Railway config-as-code lives in `railway.api.json`, `railway.bullmq.json`,
  `railway.kafka.json`; set each service's config path in its Railway settings.

## Absorbed services

`message-dispatcher` was merged into this repo — its BullMQ workers became
`processors/{waMessage,campaignEnqueue,campaignDequeue,zapierTrigger}.processor.ts`,
its Kafka consumer became `kafka/consumers/status.consumer.ts`, and its `src/utils` +
`src/modules` became `workers/shared/`. That repo is deprecated; do not add to it.

## Build & Run Commands

- **Dev (API):** `npm run dev` (hot-reloads with `tsx watch src/index.ts`)
- **Dev (bullmq):** `npm run dev:bullmq` (separate terminal)
- **Dev (kafka):** `npm run dev:kafka` (separate terminal)
- **Build:** `npm run build` (compiles TypeScript via `tsc -p tsconfig.json`)
- **Start (API):** `npm run start` (runs `node dist/src/index.js`)
- **Start (bullmq):** `npm run start:bullmq`
- **Start (kafka):** `npm run start:kafka`
- **Test:** `npm run test` (Vitest)
- **Lint:** `npm run lint` (oxlint) / `npm run lint:fix`
- **Format:** `npm run fmt` (oxfmt) / `npm run fmt:check`
- **Prisma generate:** `npx prisma generate` (runs automatically on `npm install` via postinstall)

## Tech Stack

- **Runtime:** Node.js 24.x
- **Framework:** Fastify 5 with Zod type provider
- **Database:** PostgreSQL via Prisma ORM (v7)
- **Queue:** BullMQ + Redis (ioredis)
- **Streaming:** Kafka (kafkajs)
- **Auth:** SuperTokens
- **Authorization:** CASL
- **Payments:** Stripe, Razorpay
- **Storage:** AWS S3
- **Email:** SendGrid, Nodemailer
- **Validation:** Zod 4
- **API Docs:** Swagger + Scalar

## Directory Structure

```
src/
├── app.ts              # Fastify app setup (API service)
├── config.ts           # Configuration
├── index.ts            # API entry point (HTTP only)
├── workers/            # bullmq + kafka worker services (see Deployment Topology)
├── registerRoutes.ts   # Route registration
├── modules/            # Feature modules (each with routes, handlers, schemas)
├── plugins/            # Fastify plugins (kafka, swagger)
├── routes/             # Route definitions
├── external/           # External API integrations
├── types/              # TypeScript type definitions
└── utils/              # Shared utilities
prisma/                 # Prisma schema and migrations
generated/              # Generated Prisma client
```

### Feature Modules

Modules are organized by domain: `ai`, `campaign`, `chatbot`, `contact`, `dashboard`, `email`, `integrations`, `landingPage`, `lifecycle`, `loyalty`, `menu`, `notification`, `org`, `payment`, `question`, `referrals`, `response`, `services`, `stats`, `subscription`, `survey`, `team`, `testimonial`, `ticket`, `user`, `webhook`, `whatsapp`, and more.

## Key Conventions

- **Module pattern:** Each module typically contains route handlers, Zod schemas, service logic, and authorization rules.
- **Prisma:** Always run `npx prisma generate` after modifying the schema. Migrations live in `prisma/`.
- **Linting:** oxlint is used for linting, oxfmt for formatting. Both are enforced on staged files via lint-staged + husky.
- **Environment:** Node.js 24.x required. Configuration via `.env`.
- **ESM:** The project uses ES modules (`"type": "module"` in package.json).

## Common Pitfalls

- Forgetting to run `npx prisma generate` after schema changes.
- Not using Node.js 24.x (see `engines` in package.json).
- Using Prettier instead of oxfmt — the project has migrated to oxc tooling.
- Using CommonJS syntax (`require`) — the project is ESM-only.
