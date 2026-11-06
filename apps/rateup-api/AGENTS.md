# rateup-api

The Rateup platform's API backend: TypeScript (Node.js 26, ESM) on Fastify 5. One repo builds
three long-running processes: the HTTP API, a BullMQ worker and a Kafka worker (see
[Deployment Topology](#deployment-topology)). Repository: https://github.com/TeamFynext/rateup-api

## Commands

```bash
pnpm install                  # also runs `prisma generate` (postinstall)
pnpm run dev                  # API with hot reload (tsx watch src/index.ts)
pnpm run dev:bullmq           # BullMQ worker, in a separate terminal
pnpm run dev:kafka            # Kafka worker, in a separate terminal
pnpm run build                # compile to dist/ (tsc -p tsconfig.json)
pnpm run start                # API from dist/ (start:bullmq / start:kafka for the workers)
pnpm run test                 # all tests (Vitest, silent)
pnpm exec vitest run <file>   # one file; add -t "name substring" to filter, drop `run` to watch
pnpm run lint                 # oxlint (lint:fix to fix)
pnpm run fmt                  # oxfmt (fmt:check to check only)
pnpm exec prisma generate     # after any schema change
pnpm run staff:add <email> --owner   # first staff-console owner
```

Git hooks (Husky, `.husky/`): pre-commit formats staged files with oxfmt via lint-staged;
pre-push runs `pnpm run build`, so type errors block a push.

## Tech Stack

- **Runtime:** Node.js 26.x (LTS)
- **Framework:** Fastify 5 with Zod type provider
- **Database:** PostgreSQL via Prisma ORM (v7)
- **Queue:** BullMQ + Redis (ioredis)
- **Streaming:** Kafka (kafkajs)
- **Auth:** SuperTokens
- **Authorization:** permission catalogue + system roles in `src/authz/` — every `/api` route declares `config.permission` or `config.access` (see [Request auth & authorization layering](#request-auth--authorization-layering))
- **Payments:** Stripe, Razorpay
- **Storage:** AWS S3
- **Email:** AWS SES (Nodemailer)
- **Validation:** Zod 4
- **API Docs:** Swagger + Scalar

## Directory Structure

```
src/
├── app.ts              # Fastify app setup (API service)
├── config.ts           # Configuration (SuperTokens recipes live here)
├── index.ts            # API entry point (HTTP only)
├── registerRoutes.ts   # Route registration + root authz hooks
├── authz/              # Roles, permissions, actor, scope (see Request auth below)
├── emails/             # React Email templates (`pnpm run email:dev` previews them)
├── external/           # Partner API: v1, v2 and shared/
├── modules/            # Feature modules (route, controller, service, schema, auth)
├── plugins/            # Fastify plugins (kafka, swagger)
├── routes/             # Standalone routes (health)
├── types/              # TypeScript type definitions
├── utils/              # Shared utilities
└── workers/            # bullmq + kafka worker services (see Deployment Topology)
prisma/                 # Prisma schema and migrations
generated/              # Generated Prisma client
```

### Feature Modules

Modules are organized by domain: `campaign`, `contact`, `dashboard`, `email`, `integrations`, `landingPage`, `lifecycle`, `loyalty`, `menu`, `notification`, `org`, `payment`, `question`, `referrals`, `response`, `services`, `stats`, `subscription`, `survey`, `team`, `testimonial`, `user`, `webhook`, `whatsapp`, and more.

## App bootstrap flow

1. `src/index.ts` — entry point; sets server options (body limit, timeouts, `trustProxy`), wires `unhandledRejection`/`uncaughtException` and SIGTERM/SIGINT graceful shutdown, then `listen()`s. It is HTTP only; queue consumers and the schedule run in the worker services.
2. `src/app.ts` — `build()` creates the Fastify instance with the Zod type provider (`validatorCompiler`/`serializerCompiler`), registers plugins, then registers routes inside `server.after()`.
3. `src/plugins/index.ts` — `registerPlugins()` initializes, in order: SuperTokens (auth) + its Fastify plugin and error handler, the auth rate limit, CORS, WebSocket, the Kafka producer, and Swagger (only when `SWAGGER=1`). BullMQ consumers and scheduled jobs deliberately do not register here.
4. `src/registerRoutes.ts` — a single `routeConfigs` array maps each module's route plugin to a URL prefix. **To add a new route group, import its route plugin and add an entry here.** Public (unauthenticated) routes live under `/api/public/*`; everything else expects a session.

## Module pattern

Feature modules live in `src/modules/<domain>/` and follow a consistent file layout (see `src/modules/survey/` as the reference):

- `*.route.ts` — Fastify plugin exporting the route definitions; attaches `preHandler` hooks and Zod `schema` per route. Public variants are named `*.public.route.ts`.
- `*.controller.ts` — request handlers (the `*Handler` functions).
- `*.service.ts` — business logic and Prisma access; also holds functions invoked by cron jobs.
- `*.schema.ts` — Zod request/response schemas and their inferred types.
- `*.auth.ts` — module-specific `preHandler` access checks (e.g. `verifySurveyAccess`).

## Request auth & authorization layering

Every route under `/api` declares who may reach it, and the root hooks in `src/registerRoutes.ts` enforce it. There is no per-route role check to remember.

1. **Declaration** — a route carries `config: { permission: "inbox.reply" }` (any one of a list also works) or `config: { access: "session" | "public" | "token" }`. A module usually declares once at the top of its plugin with `declareAccess(server, { read: "x.read", write: "x.manage" })` (`src/authz/registry.ts`); a route's own `config` wins over the module default. `/api/public/*`, `/api/health/*`, `/api/external/v1/*` and `/api/external/v2/*` are tagged by prefix. With `AUTHZ_STRICT=1` (set in vitest) an undeclared route fails boot.
2. **`authorize`** (`src/authz/authorize.ts`), a root `preHandler` — for a session or permission route it validates the SuperTokens session, loads the **actor** (`src/authz/actor.ts`: role key, permissions, team scope, cached in Redis for 60 s under `authz:<userId>:<orgId>`) and sets `request.actor` plus the legacy `request.user` (`role` now comes from the database, not the token). A missing permission answers `403 { reason: "permission", permission }`. `AUTHZ_AUDIT_ONLY=<module,...>` logs the refusal and lets the request through, per `/api/<module>` prefix, for a rollout soak.
3. `getVerifySubscriptionHandler([...features])` (`src/utils/auth.ts`) — plan gate; `403 { reason: "subscription" }`. Kept separate from permissions on purpose: "upgrade" and "ask your admin" are different messages.
4. **Scope** (`src/authz/scope.ts`, `resourceScope.ts`) — team-scoped roles see only rows whose team is in `actor.scope.teamIds`; `inScope`, `assertInScope`, `scopeWhere`, `surveyInScope`, `pipelineInScope`. Module `*.auth.ts` guards read `request.actor`, never `request.user.role`.

**Roles** (`src/authz/roles.ts`): OWNER, ADMIN (org-wide), MANAGER, STAFF, AGENT, VIEWER (their teams). The catalogue of `resource.action` permissions is `src/authz/permissions.ts`; rateup-ui keeps a mirror in `src/utils/authz/`. `OrgMember.roleKey` holds the role; for a member without one the actor derives it from the legacy `role` column and `Org.ownerId`. Handing out a role goes through `assertCanGrant` (`src/authz/grant.ts`); ownership moves only through `POST /api/org/transfer-ownership`. A member can be fine-tuned with `OrgMember.permissionGrants` / `permissionDenies` (`PUT /api/org/members/:id/permissions`, resolved by `src/authz/overrides.ts`); overrides never change team scope and never apply to the owner.

Non-user principals (API key, Zapier, the widget socket, the public flow callback) set `request.principal` and get an actor from it (`src/authz/principal.ts`); an API key's `scopes` narrow it.

**Staff console** (`/api/staff`, `src/modules/staff/`, UI in the `rateup-admin` repo) is a separate auth world: RateUp employees sign in with Google Workspace against the `StaffUser` allowlist, never SuperTokens. Its routes carry `access: "staff"`, which `authorize` stands aside for; `staff.plugin.ts` runs its own `onRequest` chain for every route inside it (Cloudflare Access JWT → Origin → rate limit → staff session → CSRF), so a new staff route registered in that plugin inherits all of it. `access: "staff"` outside `/api/staff/` refuses to boot. Mutations record `StaffAuditLog` rows via `recordStaffAction(tx, request, …)`; a fallback row catches any that don't. Destructive actions call `assertRecentAuth(request.staffSession)` for step-up. The console is off unless `STAFF_CONSOLE_ORIGIN` is set (see `.env.example` and `staff.config.ts`; there is no proxy secret any more); the first owner comes from `pnpm run staff:add <email> --owner`.

Authentication is **SuperTokens** (EmailPassword + Google/Apple ThirdParty + Passwordless SMS), all configured in `src/config.ts`. Sign-up/sign-in overrides there create the app-side user record and stamp `orgId` onto the session.

## Database (Prisma)

- Single schema: `prisma/schema.prisma`. The client is generated to **`generated/prisma/`** (not `node_modules`), so imports use a relative path like `import { Role } from "../../generated/prisma/client.js"`.
- Import the shared client instance from `src/utils/prisma.ts` (default export) — it wires the `@prisma/adapter-pg` Postgres adapter. Do not instantiate `PrismaClient` per module.
- Run `pnpm exec prisma generate` after any schema change (also runs on `pnpm install` via postinstall).
- `excludeFields(obj, [...])` in `src/utils/prisma.ts` is the helper for omitting fields Prisma can't selectively exclude.

## Background processing

Three mechanisms. Know which one a task belongs to; [Deployment Topology](#deployment-topology)
has the file layout and the rules.

- **BullMQ queues**: producers in `src/workers/bullmq/queues/` (safe to import from the API),
  consumers in `src/workers/bullmq/processors/` (worker service only, listed in
  `PROCESSOR_MODULES`). All `Queue` instances share the ioredis connection from
  `src/utils/redisConnection.ts`.
- **Scheduled jobs**: BullMQ job schedulers, not in-process cron. Definitions are
  `SCHEDULED_JOBS` in `queues/cron.queue.ts`, handlers are `HANDLERS` in
  `processors/scheduledJobs.processor.ts`.
- **Kafka** (`src/plugins/kafka.ts`, config in `src/utils/kafka.ts`): the API decorates a single
  producer as `server.kafka.producer`. It retries on startup, continues without Kafka if it
  cannot connect, and keeps reconnecting in the background. `/api/health` stays a plain liveness
  check (Railway's deploy healthcheck); `/api/health/ready` answers 503 while Kafka is
  unreachable. Topics (`status-events`, `wa-webhooks` and their `-dlq`s) are created at boot with
  12 partitions; brokers come from `KAFKA_BROKERS` (comma-separated) or `KAFKA_URL`. Consumers
  live in `src/workers/kafka/consumers/`.

## Deployment Topology

One repo, three long-running processes, deployed as three Railway services off the same
build:

| Service  | Entry                         | Runs                                              | Replicas              |
| -------- | ----------------------------- | ------------------------------------------------- | --------------------- |
| `api`    | `src/index.ts`                | HTTP routes, WebSocket, Kafka producer            | scale freely          |
| `bullmq` | `src/workers/bullmq/index.ts` | Queue consumers + wall-clock schedule             | scale freely          |
| `kafka`  | `src/workers/kafka/index.ts`  | Stream consumers (`status-events`, `wa-webhooks`) | up to partition count |

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
  belong in separate files — see `queues/webhook.queue.ts` vs
  `processors/webhook.processor.ts`. A `Worker` at module scope in a
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
- The WhatsApp webhook POST does no work in the API: it verifies the signature, publishes
  the delivery to `wa-webhooks` and only then answers 200 (`wasurvey.ingress.ts`). The
  kafka service processes it (`consumers/waWebhook.consumer.ts` → `wasurvey.webhook.ts`).
  New webhook handling goes in `wasurvey.webhook.ts`, not in the route.
- Railway config-as-code lives in `railway.api.json`, `railway.bullmq.json`,
  `railway.kafka.json`; set each service's config path in its Railway settings.

### Worker capacity, health and metrics

- **Concurrency pairs with the pool.** Every process opens two `pg` pools of
  `DB_POOL_MAX` (default 10) — Prisma's adapter pool and the raw pool in
  `src/utils/db.ts`. `WA_MESSAGE_CONCURRENCY` (default 50) is how many campaign
  sends one bullmq process holds in flight; keep it within a small multiple of
  `DB_POOL_MAX` and raise them together. The total to budget against Postgres'
  `max_connections` (or PgBouncer's pool) is `DB_POOL_MAX × 2 × replicas` per service.
- **Usage counters are buffered.** `UsageStats.messagesCount` is incremented in Redis
  (`HINCRBY usage:<orgId>`, `workers/shared/usageCounter.ts`) and applied by the
  `usageFlush` scheduled job every 10 s, so it lags by up to ~10 s. Only buffer a
  counter nothing enforces — `campaignCreditsUsed` and the active-contact meter must
  stay conditional UPDATEs.
- **Health and metrics.** The bullmq and kafka services serve `/health` (Redis ping /
  consumer connected) and `/metrics` (prom-client: queue depth, failures, consumer lag,
  Meta errors, send latency, process metrics) on `PORT` via
  `workers/shared/healthServer.ts`; Railway's `healthcheckPath` points at `/health`.
  The api serves `/api/health/metrics` only when `METRICS_TOKEN` is set.

## Campaign send sessions

Every outbound campaign message belongs to exactly one `CampaignSend` row — the
initial send, a resend, or an automatic retry. Two things depend on that, and
both break silently if a new send path forgets it:

- **BullMQ job ids are scoped to the send** (`${campaignSendId}:${participantId}`
  in `enqueueCampaignMessages`). The queue's `deduplication` exists so the drip
  cron's four-minute re-enqueue does not reset delays; without the send prefix it
  also swallows every retry to a participant already messaged, and the retry
  engine goes inert with no error anywhere.
- **Completion is tracked per send**, in `campaignSend:<sendId>:jobs`. Draining
  that set is what closes the `CampaignSend` and schedules the next retry.

So: never call `enqueueCampaignMessage` without opening a `CampaignSend` first
(`campaignSend.service.ts`), and close it on every path that does not enqueue —
an unclosed live send holds the campaign's lane against the partial unique index
in `20260907090000_campaign_send_sessions`.

A `SCHEDULED` `CampaignSend` is the source of truth for _what_ is scheduled —
cancelling is an UPDATE, and the UI reads the row rather than the queue. _When_ it
fires is owned by one delayed job per row (`queues/campaignRetry.queue.ts`), so a
retry goes off at its exact `scheduledFor`; the old `campaignRetries` cron capped
that at its tick interval. Firing re-claims the row with a conditional UPDATE, so a
job whose row was cancelled is a no-op and a duplicated job still sends once. The
cost is that Redis can lose a job the database still expects, which
`reconcileScheduledCampaignSends()` re-arms at worker startup.

`waMessageQueue` has `attempts: 3`. That only does anything because
`waMessage.processor.ts` rethrows — and it rethrows _only_ for a failure that
classifies as `TRANSIENT` (`src/utils/waRetryableErrors.ts`). It also drains the
job set on both `completed` and `failed`; a job that exhausts its attempts never
reaches `completed`, and a set that keeps its id never empties.

## Loyalty feedback

`src/modules/loyalty/feedback/` asks a customer how their visit went, some time after
points are earned, and sends happy customers to the team's Google review link. It is built
out of things that already existed, and the seams matter:

- **Feedback never owns the flow.** The business creates an ordinary `WaFlow`/`Survey` pair
  in WhatsApp → Flow with the RateUp-only `LOYALTY_FEEDBACK` category — stored on the row,
  swapped for `SURVEY` before Meta sees it (`flows/flowCategories.ts`) — and pre-filled from a
  template in `flows/flowTemplates.ts`; Feedback then _selects_ it (`feedback.eligibility.ts`
  decides which flows qualify) and detaching leaves it alone. The only loyalty-specific fact
  on the flow is `googleReview.minRating` on the overall-rating element — the same gate
  `shouldShowGoogleReviewV2` applies to every flow. It is stripped before Meta sees the JSON,
  so the threshold can change without a re-publish.
- **A run is attributed by the flow token.** `feedbackRequestId` (`f`) rides in the token
  the sender signs; `flow.service.ts`'s two completion paths call
  `onFeedbackFlowCompleted` when it is present and skip the plain Google CTA. A flow sent
  any other way (campaign, automation) is not feedback, whatever its questions.
- **Two send channels.** An interactive flow message only delivers inside the customer's
  24-hour service window; outside it the `submit` step's UTILITY template with a FLOW
  button (`loyalty_feedback_request_v1`) is sent instead — the thing that actually waits on
  Meta approval. `feedback.sender.ts` picks per request via `isCustomerSessionOpen`.
- **API vs worker.** `feedback.scheduler.ts` is imported by `awardPoints` and may only open
  a `LoyaltyFeedbackRequest` row and arm its delayed job (`queues/loyaltyFeedback.queue.ts`).
  Sending lives in `feedback.sender.ts`, which only the worker loads — the same split as
  campaign retries, with the same conditional-UPDATE claim and startup reconciler.
- **The review reward is granted once** because the public redirect
  (`/api/public/loyalty/feedback/review/:requestId/:sig`) calls `assignRewardToCustomer`,
  and `CustomerReward`'s unique `(rewardId, accountId)` is what makes a second grant fail.
  `LoyaltyRewardType.REVIEW` rewards cost no points and are excluded from every catalogue a
  customer can buy from (`getActiveLoyaltyRewards`, the public programme, the wizard).

## Loyalty messaging

Every message the loyalty programme sends goes through `src/modules/loyalty/messaging/`.
Nothing under `modules/loyalty` calls `sendMessage`, `sendTextMessage` or a template sender
directly. The layer sits between "what to say" and "which medium carries it":

- **Entry points.** `sendLoyaltyEvent(orgId, event, to, data)` for the catalog's automatic
  messages. It runs the programme's switches, uses the event's own `body` (or
  `catalog.ts`'s default) and its WhatsApp template. `sendLoyalty` is for anything else.
  `replyLoyalty` / `replyText` / `replySystem` answer an inbound message on the channel and
  number it arrived on.
- **Parameter order lives in `catalog.ts`.** `eventVars` is the only thing that turns named
  data into `{{n}}` values. The UI's `loyaltyMessageCatalog.ts` labels the same order.
- **Routing.** A notification goes to the member's `preferredChannel` when the programme's
  `enabledChannels` include it, then down that list. The router falls back only when a
  channel _plans_ a refusal (`no_template`, `session_closed`, …). It never falls back
  after `send_failed`, because the first send may have been delivered.
- **Adding a medium** (RCS, SMS, email) means an adapter implementing `LoyaltyChannel`
  (`types.ts`), plus a line in `registry.ts` and in `AVAILABLE_LOYALTY_CHANNELS`
  (`channelIds.ts`, which request schemas validate against). Callers do not change.
  `fitToChannel` turns lists, buttons and links into text for a channel that cannot show
  them. Reading those replies back is that channel's inbound handler's job.
- **WhatsApp specifics stay in its adapter.** The adapter owns the 24-hour window
  (`findOpenSession`), template approval, and `sendTextInSession`. It sends a message's
  words inside an open window even when it has no template.
- **Reminder sweeps check the outcome.** A `send_failed` hands the member's claim marker
  back so the next hourly sweep retries. The exception is an occasion that also issued a
  reward or wrote the ledger, where a retry would repeat that side effect.

## Email

Bulk and background email leaves from the `bullmq` service: callers enqueue and the worker calls
`sendAWSEmail`. Do not add a `sendAWSEmail` call of your own for that kind of mail — enqueue it,
so retries and send logging stay in one place.

Email a user is actively waiting on is the exception: `sendTransactionalEmail()`
(`queues/notification.queue.ts`) makes the SES call inline, on the API's request path, so the
mail goes out while the request is still open instead of after a Redis round-trip. If that
direct send fails it enqueues onto `transactionalEmailQueue`, which is what still gives it the
worker's five attempts.

| Lane                    | Send with                    | For                                                                             |
| ----------------------- | ---------------------------- | ------------------------------------------------------------------------------- |
| `notificationQueue`     | `notificationQueue.add(...)` | Bulk/background: in-app notifications, weekly reports, billing notices          |
| inline + fallback queue | `sendTransactionalEmail()`   | Anything a user is waiting on: password reset, email verification, OTP, invites |

`transactionalEmailQueue` stays a queue of its own rather than a `priority` on
`notificationQueue` because BullMQ's `priority` cannot express "jump the line" here.
`fetchNextJob.lua` drains the `wait` list (un-prioritized jobs) with `RPOPLPUSH` **before** it
looks at the prioritized zset, so giving a retried reset email a priority would have put it
_behind_ every bulk job. Separate queues also mean separate concurrency pools.

Both queues set `attempts: 5` with exponential backoff. That only works because
`processNotification` throws when `sendAWSEmail` returns `false` and the workers no longer
swallow the error — a send failure has to reach BullMQ to be retried.

One consequence worth knowing before you add a route that emails: a caller that enqueues only
ever learns that the job was _accepted_. `POST /email/send-email` and `/email/otp/send-email`
now go out inline, so a hard SES failure reaches the handler; a failure that lands in the
fallback queue still surfaces only as a worker log and a retry.

## Absorbed services

`message-dispatcher` was merged into this repo — its BullMQ workers became
`processors/{waMessage,campaignEnqueue,campaignDequeue,zapierTrigger}.processor.ts`,
its Kafka consumer became `kafka/consumers/status.consumer.ts`, and its `src/utils` +
`src/modules` became `workers/shared/`. That repo is deprecated; do not add to it.

## Conventions & Pitfalls

- **ESM only**: every relative import includes the `.js` extension (even for `.ts` source),
  e.g. `import { x } from "./foo.js"`. CommonJS `require` is not available.
- **Prisma**: run `pnpm exec prisma generate` after any schema change; migrations live in
  `prisma/`. Import types and enums from `generated/prisma/client.js` by relative path, not
  `@prisma/client`.
- **Formatting/linting**: oxfmt + oxlint, never Prettier or ESLint. The pre-commit hook only
  formats, so run `pnpm run lint` yourself.
- **Node.js 26.x (LTS)** is required (`engines` in package.json). Configuration comes from `.env`.
- **External partner API**: two versions, distinct from the first-party `/api/*` routes, with
  token auth via the `apiAccessToken` module. `src/external/v2/` (`/api/external/v2`, current)
  takes `rk_` keys that name their org, so the URL has no org id. `src/external/v1/`
  (`/api/external/v1/:orgId`) is the legacy surface, kept in its original shapes for existing
  integrations. Each key works only on its own `version`. Both roots share
  `src/external/shared/` (error envelope, scopes, idempotency, rate limits, `partnerHooks.ts`);
  every route declares a `config.permission` that the key's scopes must include.
