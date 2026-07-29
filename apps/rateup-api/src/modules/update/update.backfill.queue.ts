// Background backfill of the missing `Conversation` rows, driven by BullMQ so it
// survives restarts/deploys and runs contacts in parallel.
//
// Why a queue and not the `PUT /backfill-conversations` endpoint:
//   - That endpoint resets its cursor to 0 on every call, so each re-invocation
//     re-scans the whole already-done prefix before it finds fresh work. The
//     further along you are, the more dead rows Postgres wades through per call.
//   - It has no driver: you have to keep hitting it by hand, and a deploy/restart
//     stops the loop.
//
// This module fixes both. One `scan` producer walks the candidate contacts with a
// forward-only keyset cursor carried *through the job chain* (so the expensive
// filter is evaluated once, in a single forward pass), fanning contacts out to
// parallel `process` consumers. Jobs live in Redis, so on restart the worker
// reconnects and resumes exactly where it left off — nothing to babysit.

import { Queue, Worker, Job } from "bullmq";
import baseRedis from "../../utils/redisConnection.js";
import prisma from "../../utils/prisma.js";
import { log } from "../../utils/logger.js";
import {
  backfillMissingConversationWhere,
  backfillContactSelect,
  backfillOneContact,
} from "./update.service.js";

const QUEUE_NAME = "backfillConversationQueue";

// How many candidate contacts the producer pulls per scan step. Larger = fewer
// scan round-trips; each step still re-evaluates the EXISTS/NOT EXISTS filter, so
// this is the unit of forward progress.
const SCAN_BATCH = 1_000;
// Contacts per consumer job. Each contact is its own transaction; this only
// controls fan-out granularity. Kept small so a retry re-does little work.
const PROCESS_CHUNK = 40;
// Parallel process jobs. Each holds a short transaction, so this is the real
// throughput knob. Keep it modest to avoid starving the live app's DB pool.
const CONCURRENCY = 5;

const JOB_OPTS = {
  attempts: 3,
  backoff: { type: "exponential" as const, delay: 2_000 },
  removeOnComplete: true,
  removeOnFail: 1_000,
};

// Redis keys for observable progress (survive restarts alongside the jobs).
const K = {
  status: "backfill:conv:status", // idle | running | scanned | stopped
  startedAt: "backfill:conv:startedAt",
  finishedAt: "backfill:conv:finishedAt",
  scanned: "backfill:conv:scanned",
  created: "backfill:conv:created",
  linked: "backfill:conv:linked",
  assignees: "backfill:conv:assignees",
  skipped: "backfill:conv:skipped", // raced with live traffic → left alone
} as const;

export const backfillConversationQueue = new Queue(QUEUE_NAME, { connection: baseRedis });

interface ScanData {
  cursor: string | null;
}
interface ProcessData {
  contactIds: string[];
}

async function handleScan(cursor: string | null): Promise<void> {
  const contacts = await prisma.contact.findMany({
    where: backfillMissingConversationWhere,
    take: SCAN_BATCH,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    orderBy: { id: "asc" },
    select: { id: true },
  });

  if (!contacts.length) {
    // The forward pass reached the end. Consumers may still be draining; the
    // status endpoint reports `queue.active/waiting` so callers know when it is
    // truly done.
    await baseRedis.set(K.status, "scanned");
    await baseRedis.set(K.finishedAt, new Date().toISOString());
    log.info("[backfill-conv] scan complete — no more candidate contacts");
    return;
  }

  const ids = contacts.map((c) => c.id);
  await baseRedis.incrby(K.scanned, ids.length);

  const processJobs = [];
  for (let i = 0; i < ids.length; i += PROCESS_CHUNK) {
    processJobs.push({
      name: "process",
      data: { contactIds: ids.slice(i, i + PROCESS_CHUNK) } satisfies ProcessData,
      opts: JOB_OPTS,
    });
  }
  await backfillConversationQueue.addBulk(processJobs);

  // Advance the cursor forward and keep scanning. Every candidate is scanned
  // exactly once and enqueued to exactly one process job — no rescans.
  await backfillConversationQueue.add("scan", { cursor: ids.at(-1)! } satisfies ScanData, JOB_OPTS);
}

async function handleProcess(contactIds: string[]): Promise<void> {
  const contacts = await prisma.contact.findMany({
    where: { id: { in: contactIds } },
    select: backfillContactSelect,
  });

  for (const contact of contacts) {
    try {
      const r = await backfillOneContact(contact);
      if (r.created) {
        await baseRedis.incr(K.created);
        if (r.messagesLinked) await baseRedis.incrby(K.linked, r.messagesLinked);
        if (r.assigneesBackfilled) await baseRedis.incrby(K.assignees, r.assigneesBackfilled);
      } else {
        // Raced with live traffic (already threaded) — deliberately left alone.
        await baseRedis.incr(K.skipped);
      }
    } catch (err) {
      // Isolate a bad contact so it does not fail (and retry) the whole chunk.
      log.error({ err, contactId: contact.id }, "[backfill-conv] failed for contact");
    }
  }
}

const workerConnection = baseRedis.duplicate();

export const backfillConversationWorker = new Worker(
  QUEUE_NAME,
  async (job: Job<ScanData | ProcessData>) => {
    if (job.name === "scan") return handleScan((job.data as ScanData).cursor ?? null);
    if (job.name === "process") return handleProcess((job.data as ProcessData).contactIds);
    log.warn(`[backfill-conv] unknown job name: ${job.name}`);
  },
  {
    connection: workerConnection,
    concurrency: CONCURRENCY,
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 1_000 },
  },
);

backfillConversationWorker.on("failed", (job, err) => {
  log.error(`[backfill-conv] job ${job?.id} (${job?.name}) failed: ${err.message}`);
});

backfillConversationWorker.on("error", (err) => {
  log.error(`[backfill-conv] worker error: ${err.message}`);
});

log.info("Backfill conversation worker initialized");

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
