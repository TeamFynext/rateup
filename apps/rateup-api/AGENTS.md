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
- Railway config-as-code lives in `railway.api.json`, `railway.bullmq.json`,
  `railway.kafka.json`; set each service's config path in its Railway settings.

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
- **Authorization:** permission catalogue + system roles in `src/authz/` — every `/api` route declares `config.permission` or `config.access` (see CLAUDE.md "Request auth & authorization layering")
- **Payments:** Stripe, Razorpay
- **Storage:** AWS S3
- **Email:** AWS SES (Nodemailer)
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

Modules are organized by domain: `campaign`, `contact`, `dashboard`, `email`, `integrations`, `landingPage`, `lifecycle`, `loyalty`, `menu`, `notification`, `org`, `payment`, `question`, `referrals`, `response`, `services`, `stats`, `subscription`, `survey`, `team`, `testimonial`, `user`, `webhook`, `whatsapp`, and more.

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
