// HTTP control surface for the conversation backfill (wired to update.controller.ts).
//
// Producer-side only: it enqueues the first `scan` job and reads progress. The
// queue lives in workers/bullmq/queues/backfill.queue.ts and the consumer in
// workers/bullmq/processors/backfillConversation.processor.ts, so importing this
// from a route never boots a worker.
//
// Why a queue and not a plain `PUT /backfill-conversations` loop:
//   - That endpoint reset its cursor to 0 on every call, so each re-invocation
//     re-scanned the whole already-done prefix before finding fresh work.
//   - It had no driver: you had to keep hitting it by hand, and a deploy stopped
//     the loop. Jobs live in Redis, so the worker resumes where it left off.

import baseRedis from "../../utils/redisConnection.js";
import {
  BACKFILL_JOB_OPTS as JOB_OPTS,
  BACKFILL_KEYS as K,
  backfillConversationQueue,
  type ScanData,
} from "../../workers/bullmq/queues/backfill.queue.js";

// ---------------------------------------------------------------------------
// Control surface (wired to HTTP handlers in update.controller.ts)
// ---------------------------------------------------------------------------

/** Kicks off (or refuses to double-start) the backfill and resets its counters. */
export async function startBackfillConversations() {
  const status = await baseRedis.get(K.status);
  const counts = await backfillConversationQueue.getJobCounts("active", "waiting", "delayed");
  const inFlight = counts.active + counts.waiting + counts.delayed;
  if (status === "running" || inFlight > 0) {
    return {
      started: false,
      reason: "already running",
      status: status ?? "running",
      queue: counts,
    };
  }

  await Promise.all([
    baseRedis.set(K.status, "running"),
    baseRedis.set(K.startedAt, new Date().toISOString()),
    baseRedis.del(K.finishedAt),
    baseRedis.set(K.scanned, "0"),
    baseRedis.set(K.created, "0"),
    baseRedis.set(K.linked, "0"),
    baseRedis.set(K.assignees, "0"),
    baseRedis.set(K.skipped, "0"),
  ]);

  await backfillConversationQueue.add("scan", { cursor: null } satisfies ScanData, JOB_OPTS);
  return { started: true, status: "running" };
}

/** Snapshot of progress + live queue depth. `isComplete` once scan is done and drained. */
export async function getBackfillConversationStatus() {
  const [queue, status, startedAt, finishedAt, scanned, created, linked, assignees, skipped] =
    await Promise.all([
      backfillConversationQueue.getJobCounts("active", "waiting", "delayed", "completed", "failed"),
      baseRedis.get(K.status),
      baseRedis.get(K.startedAt),
      baseRedis.get(K.finishedAt),
      baseRedis.get(K.scanned),
      baseRedis.get(K.created),
      baseRedis.get(K.linked),
      baseRedis.get(K.assignees),
      baseRedis.get(K.skipped),
    ]);

  const isComplete =
    status === "scanned" && queue.active === 0 && queue.waiting === 0 && queue.delayed === 0;

  return {
    status: isComplete ? "completed" : (status ?? "idle"),
    isComplete,
    startedAt,
    finishedAt,
    scannedContacts: Number(scanned ?? 0),
    conversationsCreated: Number(created ?? 0),
    messagesLinked: Number(linked ?? 0),
    assigneesBackfilled: Number(assignees ?? 0),
    skippedRaced: Number(skipped ?? 0),
    queue,
  };
}

/** Hard stop: drops every queued/scheduled job. In-flight jobs finish on their own. */
export async function stopBackfillConversations() {
  await backfillConversationQueue.obliterate({ force: true });
  await baseRedis.set(K.status, "stopped");
  return { stopped: true, status: "stopped" };
}
