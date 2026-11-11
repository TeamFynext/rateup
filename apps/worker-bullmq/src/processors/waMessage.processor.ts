// Ported from message-dispatcher/src/index.ts.
//
// The hot path of the whole system: one job per campaign recipient, at
// concurrency `CAMPAIGN_SEND_CONCURRENCY` (default 50). `processParticipant` renders the template for that contact and
// sends it.
//
// Completion is tracked in a Redis set rather than by watching the queue, because
// the enqueue processor records every job id it fans out into
// `campaignSend:<sendId>:jobs`. When the last id is removed *that attempt* is
// finished: the send is closed, the next retry is scheduled, and the owning team
// gets notified.
import { DelayedError, Job, Worker } from "bullmq";

import { log } from "@rateup/api/workers/shared/logger.js";
import baseRedis from "@rateup/api/utils/redisConnection.js";
import { processParticipant } from "@rateup/api/workers/shared/modules/messageDispatch/messageDispatch.service.js";
import { WaFailureClass } from "@rateup/api/utils/waRetryableErrors.js";
import { notify } from "@rateup/api/modules/settings/notifications/notify.js";
import { campaignSendJobsKey, getCampaignById } from "@rateup/api/workers/shared/whatsapp/index.js";
import { completeCampaignSend } from "@rateup/api/modules/campaigns/campaignSend.service.js";
import { scheduleNextRetry } from "@rateup/api/modules/campaigns/campaignRetry.service.js";
import { finishCampaignIfSettled } from "@rateup/api/modules/campaigns/campaignSettle.service.js";
import {
  acquirePhoneSendSlot,
  resolvePhoneRate,
} from "@rateup/api/workers/shared/phoneRateLimit.js";

/**
 * In-flight jobs per worker process. Not a throughput control — throughput is
 * per phone number and lives in `phoneRateLimit` — just the number of Graph
 * calls and post-send stores this process holds open at once. The stores are
 * the expensive half (a dozen queries each, across a region boundary in
 * production), so this multiplied by the store's latency is the connection
 * demand that `DB_POOL_MAX` has to absorb.
 *
 * Default 50, down from 250: at 250 against two pools of `DB_POOL_MAX` = 10 the
 * jobs mostly sat waiting for a connection, and the waits are what timed out.
 * Keep `CAMPAIGN_SEND_CONCURRENCY` within a small multiple of `DB_POOL_MAX` (a send
 * holds a connection only for its store, not for the Graph call) and raise them
 * together — budgeting `DB_POOL_MAX × 2 pools × replicas` against Postgres'
 * `max_connections` (or PgBouncer's pool). See AGENTS.md → "Worker capacity".
 */
const CAMPAIGN_SEND_CONCURRENCY = Number.parseInt(
  process.env.CAMPAIGN_SEND_CONCURRENCY || "50",
  10,
);

const workerConnection = baseRedis.duplicate();

/**
 * The one exception this processor lets escape, so BullMQ retries the job.
 *
 * A distinct type rather than a bare `throw`, so the catch below can tell it
 * apart from a genuine bug in the dispatch path — which must still be logged and
 * swallowed, exactly as before.
 */
class TransientSendError extends Error {
  constructor(jobId: string) {
    super(`Transient Meta failure on job ${jobId}; retrying`);
    this.name = "TransientSendError";
  }
}

export const waMessageWorker = new Worker(
  "waMessageQueue",
  async (job: Job, token?: string) => {
    if (!job?.data) {
      return;
    }

    // Meta's ceiling is per phone number, so the throttle is too. When this
    // second on this number is spent the job is parked until the next one and
    // the worker moves on to a job for a different number — every org keeps its
    // own full rate however many campaigns are running. `moveToDelayed` does
    // not consume an attempt, and DelayedError tells BullMQ this was a park,
    // not a failure, so neither `completed` nor `failed` fires for it.
    if (job.data.phoneId) {
      const slot = await acquirePhoneSendSlot(
        baseRedis,
        job.data.phoneId,
        resolvePhoneRate(job.data.messagesPerSecond),
      );
      if (!slot.granted) {
        await job.moveToDelayed(Date.now() + slot.retryAfterMs, token);
        throw new DelayedError();
      }
    }
    // BullMQ only retries a job that *throws*. This processor used to swallow
    // every exception, so the queue's `attempts` would have been decorative.
    const maxAttempts = job.opts.attempts ?? 1;
    const isFinalAttempt = job.attemptsMade >= maxAttempts - 1;

    try {
      // The job id makes the Graph call at-most-once: a job that stalls after
      // Meta accepted its message is rerun by BullMQ from the top, and without
      // the key that rerun sent the message a second time.
      const outcome = await processParticipant(job.data, {
        isFinalAttempt,
        idempotencyKey: job.id,
      });

      // Rethrow only for a transient failure, and only while attempts remain. A
      // permanent rejection would spend three attempts and two backoff waits to
      // arrive at the same answer, and a frequency cap belongs to the scheduled
      // retry engine hours from now, not to a five-second backoff.
      //
      // Never rethrown after a successful send: `sendMetaMessage` records the
      // message as it sends it, so a retry after `ok` would deliver twice. A
      // transient `{ ok: false }` is safe to repeat precisely because Meta never
      // accepted the message.
      if (!outcome.ok && !isFinalAttempt && outcome.failureClass === WaFailureClass.TRANSIENT) {
        throw new TransientSendError(job.id ?? "unknown");
      }

      log.debug("Queue processing completed successfully");
    } catch (error) {
      if (error instanceof TransientSendError || error instanceof DelayedError) throw error;
      log.error(
        { err: error, jobId: job?.id, campaignId: job?.data?.campaignId },
        "Error processing job",
      );
    }
  },
  {
    connection: workerConnection,
    removeOnFail: {
      count: 1,
    },
    concurrency: CAMPAIGN_SEND_CONCURRENCY,
  },
);

/**
 * Drain one job from its send session's set, and close the send if it was the
 * last.
 *
 * Registered on **both** `completed` and `failed`. Before the queue had
 * `attempts`, every job reached `completed` whatever happened, so `completed`
 * alone was enough. Now a job that exhausts its three attempts ends in `failed`
 * instead — and a set that still holds its id never empties, so the send would
 * hang in RUNNING forever and no retry would ever be scheduled.
 */
async function settleJob(job: Job) {
  const campaignSendId = job?.data?.campaignSendId;
  if (!job?.data?.campaignId || !campaignSendId || !job.id) return;

  try {
    const key = campaignSendJobsKey(campaignSendId);
    // SREM and SCARD in one MULTI. Previously these were two round trips, and at
    // concurrency 250 two finishers could each observe zero and both "complete"
    // the campaign — two completion emails, and (now) two retries scheduled.
    // Piping them means exactly one caller sees the removal that emptied the set.
    const results = await baseRedis.multi().srem(key, job.id).scard(key).exec();
    const removed = Number(results?.[0]?.[1] ?? 0);
    const remaining = Number(results?.[1]?.[1] ?? 0);
    // Only the job that actually removed an id can be the one that drained the
    // set. A duplicate `completed` event removes nothing and must not close the
    // send a second time.
    if (removed === 0 || remaining !== 0) return;

    // The DB is the second guard, and the authoritative one: a Redis flush
    // between the fan-out and here would leave an empty set for every job.
    const closed = await completeCampaignSend(campaignSendId);
    if (!closed) return;

    // A drained queue is not a settled campaign — a message can still be SENT
    // here and only flip to FAILED when Meta's webhook lands. The retry
    // scheduler's minimum offset is what covers that; see campaignRetry.service.
    await scheduleNextRetry(campaignSendId);

    // Once the retry engine has had its say, the campaign is finished if nothing
    // is left in flight. `finishCampaignIfSettled` re-reads the live sends rather
    // than trusting the return above, so a manual resend running alongside this
    // one also holds the campaign open.
    await finishCampaignIfSettled(job.data.campaignId);

    if (job?.data?.teamId) {
      const campaign = await getCampaignById(job.data.campaignId);
      await notify({
        event: "campaign.completed",
        orgId: job.data.orgId,
        audience: { kind: "team", teamId: job.data.teamId },
        data: { campaignId: campaign.id, campaignName: campaign.name },
      });
    }
    log.info(`Campaign ${job.data.campaignId} send ${campaignSendId} finished`);
  } catch (error) {
    log.error(`Error removing job ${job.id} from Redis set: %o`, error);
  }
}

waMessageWorker.on("completed", settleJob);

waMessageWorker.on("failed", async (job) => {
  if (!job) return;
  // Only once BullMQ has given up. An intermediate failure is about to be
  // retried, and removing its id would let the set empty early — closing the
  // send while messages are still going out.
  const maxAttempts = job.opts.attempts ?? 1;
  if (job.attemptsMade < maxAttempts) return;
  await settleJob(job);
});

waMessageWorker.on("error", (err) => {
  log.error("waMessage worker error: %s", err);
});

log.info("WhatsApp message worker initialized");
