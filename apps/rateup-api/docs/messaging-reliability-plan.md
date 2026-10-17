# Messaging Reliability Plan: rateup-api

## 1. Why this plan exists

RateUp sends and receives WhatsApp messages at campaign scale. Today the brokers are not what limits reliability. The code around them is:

- A deploy or crash can **lose inbound customer messages**.
- A stalled worker can **send the same campaign message twice**.
- Some campaign sends **never close**.
- Status updates can be **lost or shown before they're saved**.

This plan lists the changes that fix those problems. It splits them into five independent PRs, in priority order.

## 2. How messaging works today

All the code lives in the `rateup-api` repo. Railway runs it as three services.

| Service                          | Entry point                   | What it does                                                                                                                |
| -------------------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `api` (`railway.api.json`)       | `src/index.ts`                | REST, WebSockets and Meta webhooks. It enqueues BullMQ jobs and produces to Kafka.                                          |
| `bullmq` (`railway.bullmq.json`) | `src/workers/bullmq/index.ts` | Every BullMQ worker: campaign fan-out, `waMessage` sends (concurrency 250), `sendMessage`, webhooks, integrations and cron. |
| `kafka` (`railway.kafka.json`)   | `src/workers/kafka/index.ts`  | Consumes `status-events` (delivery and read receipts) with a DLQ. It runs one replica.                                      |

How data flows:

- **Outbound sends:** BullMQ calls the Meta Graph API.
- **Delivery statuses:** the webhook produces them to Kafka, and the kafka service batch-updates Postgres.
- **Inbound customer messages:** these do **not** go through Kafka. They are processed inline inside the webhook HTTP request.
- **Real-time UI:** updates go out on Redis pub/sub channel `ws:messages`.

The `message-dispatcher` repo is deprecated. Its code now lives in `rateup-api/src/workers/`.

## 3. Problems, with evidence

All paths are relative to `rateup-api/src/`.

| #   | Problem                                                                                                                                             | Where                                                                            | Impact                                                                                     |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| A   | The webhook replies 200 to Meta **before** processing, then does all the work inline.                                                               | `modules/whatsapp/whatsappSurvey/wasurvey.controller.ts:172-235`                 | A deploy or crash mid-request loses the event, and Meta won't retry.                       |
| B   | Only the first message or change in a webhook payload is processed.                                                                                 | `wasurvey.utils.ts:51-88` (`getEventType`), `:678-686` (`getMessageObject`)      | Batched payloads drop messages.                                                            |
| C   | A mixed-status batch gets every status labelled with the first one's type.                                                                          | `wasurvey.controller.ts:560`                                                     | Wrong delivered/read state.                                                                |
| D   | No-event payloads never get a reply.                                                                                                                | `wasurvey.controller.ts:180`                                                     | Meta times out and retries.                                                                |
| E   | Signature verification exists but only logs (`META_WEBHOOK_SIGNATURES` defaults to `log`).                                                          | `modules/whatsapp/meta/metaWebhookSignature.ts:13-16`                            | Anyone can post fake webhooks.                                                             |
| F   | `WaMessage.messageId` is not unique, and dedupe is check-then-insert.                                                                               | `prisma/schema.prisma` (WaMessage), `wamessage.service.ts:2160` and 4 call sites | Meta retries plus multiple replicas create duplicate rows and duplicate automation runs.   |
| G   | Campaign fan-out runs `SADD` on job ids **after** all `addBulk` chunks.                                                                             | `workers/shared/whatsapp/index.ts:263-272`                                       | Fast jobs `SREM` before their ids are added, so the send never closes.                     |
| H   | Meta calls have no timeout. `axiosWithRetry` also retries POSTs on timeout.                                                                         | `modules/whatsapp/wa_axios.ts:5-48`                                              | A hung connection blocks a worker slot. Adding a timeout naively would cause double sends. |
| I   | Non-JSON 5xx and empty 429 responses are classed PERMANENT.                                                                                         | `wa_axios.ts:~92`, `utils/graphError.ts:50-67`, `messageDispatch.service.ts:370` | Transient Meta outages permanently fail sends.                                             |
| J   | No send idempotency. A stalled job that reruns calls Graph again.                                                                                   | `workers/bullmq/processors/waMessage.processor.ts:75-99`                         | The customer gets a duplicate message.                                                     |
| K   | The decrypted access token is copied into every campaign job in Redis.                                                                              | `campaignEnqueue.processor.ts:144-160`, `workers/shared/whatsapp/index.ts:236`   | Secrets sit in Redis for days on delayed jobs.                                             |
| L   | "Status before message exists" retries are in-memory `setTimeout`s that run after the offset is committed.                                          | `workers/kafka/consumers/status.consumer.ts:59-87`                               | A crash loses those receipts.                                                              |
| M   | The WebSocket publish happens before the DB transaction commits.                                                                                    | `workers/shared/whatsapp/index.ts:~1240` vs COMMIT at `:796`                     | The UI can show a status the DB rolled back.                                               |
| N   | Kafka topics are auto-created (1 partition). There is one broker, no idempotent producer and 1 consumer replica. The API "continues without Kafka". | `plugins/kafka.ts`, `railway.kafka.json`                                         | No parallelism and no failover.                                                            |
| O   | Each process runs 250 concurrent jobs against 2 pools of 10 DB connections.                                                                         | `waMessage.processor.ts:33`, `utils/db.ts:12`, `utils/prisma.ts:15`              | Pool starvation and timeouts under load.                                                   |
| P   | `UsageStats` gets +1 per send on one row per org.                                                                                                   | `messageDispatch.service.ts:185`                                                 | Hot-row lock contention during campaigns.                                                  |
| Q   | An outgoing-webhook job is enqueued for every status, even when the org has no webhook.                                                             | `wasurvey.controller.ts:562`                                                     | Wasted Redis and worker load.                                                              |
| R   | No metrics, and no health endpoint on the bullmq or kafka services.                                                                                 | —                                                                                | Failures are silent.                                                                       |

## 4. The changes: five PRs

Each PR is independent and can be reviewed and shipped on its own, in this order.

### PR 1: Send-path correctness (small, highest value)

Fixes G, H, I, J and K.

1. Run `SADD` on each chunk's job ids **before** that chunk's `addBulk`.
2. Add `timeout: 15_000` to the Meta axios instance. In `axiosWithRetry`, only retry POSTs on connect-phase errors (`ECONNREFUSED`, `ENOTFOUND`) or 429/5xx responses. Never retry on timeout or abort.
3. Keep the HTTP status on non-JSON errors and pass it to `classifyWaFailure(code, httpStatus)`. Map 429 and 5xx to TRANSIENT in `utils/waRetryableErrors.ts`.
4. After Graph accepts a message, run `SET wa:sent:<jobId> <wamid> NX EX 7d`. If the key exists when a job starts, skip the Graph call and only record the message.
5. Remove `accessToken` from job data. The processor resolves it by phoneId through a short in-process TTL cache.

### PR 2: Unique WhatsApp message ids

Fixes F.

1. Migration:
   - De-duplicate existing `WaMessage` rows, keeping the earliest per `messageId` and repointing FKs.
   - Add a partial unique index `ON "WaMessage"("messageId") WHERE "messageId" IS NOT NULL`, built `CONCURRENTLY`.
   - Drop the old plain index and the redundant `[contactId]` index.
2. Replace check-then-insert with `INSERT … ON CONFLICT DO NOTHING` (or catch Prisma `P2002`). Treat a conflict as "already processed". Call sites:
   - `wasurvey.controller.ts:337` and `:767`
   - `metaMessage.service.ts:217`
   - `waMessageRecord.processor.ts:22`
3. Run `npx prisma generate`, and check the raw SQL in `workers/shared/` that writes `WaMessage`.

### PR 3: Durable webhook ingress (largest)

Fixes A, B, C, D, E and Q.

1. **Signatures.** Check the prod logs to confirm that `log` mode shows no false rejections. Then switch `META_WEBHOOK_SIGNATURES` to `enforce`, which makes it the code default. This also covers the Instagram and Facebook webhooks.
2. **Ingress to Kafka.** The webhook verifies the signature, produces the raw body to a new topic `wa-webhooks`, and **then** replies 200. It replies 5xx if the produce fails, so Meta retries. Records are keyed by customer `wa_id` to keep per-conversation order (status-only payloads use `phone_number_id`). Every path replies.
3. **New consumer** `workers/kafka/consumers/waWebhook.consumer.ts` runs the existing message and status handling, moved out of the controller.
   - It iterates **every** entry, change, message and status.
   - It uses each status's own `status.status`.
   - Statuses still flow on to `status-events`.
4. Enqueue outgoing-webhook jobs only when the org has a webhook configured, using a cached lookup.

### PR 4: Kafka crash-safety and provisioning

Fixes L, M and N.

1. Replace the in-memory status retries with a BullMQ delayed queue that uses the same backoff (`statusRetry.ts`). Jobs go to the DLQ after max attempts.
2. Collect WebSocket events during the batch and publish them only after `executeBulkUpdates` commits.
3. At startup, create the topics explicitly with `admin.createTopics`: `status-events`, `wa-webhooks` and their DLQs, with 12 partitions and the replication factor taken from env.
4. Turn on `idempotent: true` for the producer, and accept a comma-separated `KAFKA_BROKERS`.
5. The API reports unhealthy when Kafka is down, because ingress depends on it. Set the kafka service to `numReplicas` 2 or more.

### PR 5: Capacity and visibility

Fixes O, P and R.

1. Lower the default `WA_MESSAGE_CONCURRENCY` to match the pool size (about 50), and document how the env vars pair. As an ops task, put PgBouncer (transaction mode) in front of Postgres.
2. Count `UsageStats` in Redis with `HINCRBY usage:<orgId>`. A `SCHEDULED_JOBS` cron flushes it every ~10s with one `UPDATE` per org.
3. Add a minimal HTTP `/health` to the bullmq and kafka services, wired to Railway healthchecks.
4. Add `prom-client` metrics: queue depth, failed counts, consumer lag, Meta error codes and send latency.

## 5. Out of scope for now

These are still worth doing later:

- A separate campaign queue for fairness between orgs, and drip-feeding campaign chunks.
- Per-org WebSocket channels (`ws:org:<id>`), instead of every API replica parsing `ws:messages`.
- Monthly partitioning of `WaMessage`, and a denormalised `status` column instead of the `stats` JSON.
- bull-board and error tracking (Sentry).
- Moving Instagram and Facebook webhooks onto the Kafka ingress.

## 6. How to verify each PR

- **PR 1:**
  - Run a local campaign with about 2k participants against an instant Graph mock, with concurrency 250. The `campaignSend:<id>:jobs` set should drain to 0 and the send should close.
  - Kill the worker mid-send. There should be no second Graph call for the same job.
  - Make the mock hang for more than 15s. There should be exactly one POST.
  - Make the mock return an HTML 502 or an empty 429. The failure should be TRANSIENT and retried.
  - Delayed jobs in Redis should contain no token.
- **PR 2:** Send 20 parallel copies of the same inbound payload. There should be exactly one `WaMessage` row and one automation run.
- **PR 3:**
  - An unsigned post should get 401.
  - Stop the consumer, post webhooks, then restart it. Every webhook should be processed, in per-`wa_id` order.
  - Send a payload with 2 messages and mixed delivered/read statuses. Both messages should be stored, and each status applied correctly.
- **PR 4:**
  - Produce a status for an unknown wamid, kill the consumer, insert the row, then restart. The status should be applied.
  - Force a rollback in `executeBulkUpdates`. No WebSocket event should go out.
- **PR 5:** Run a load test with a campaign. There should be no pool-timeout errors, and `/health` and the metrics should report correctly.
- **Every PR:** run `npm run typecheck`, `npm test` and `npm run lint` in `rateup-api`.
