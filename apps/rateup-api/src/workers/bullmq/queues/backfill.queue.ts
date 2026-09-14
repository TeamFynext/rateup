import { Queue } from "bullmq";
import connection from "../../../utils/redisConnection.js";

/**
 * One-off data repairs that are too large to run as a migration.
 *
 * A backfill here converges old rows onto what the code already writes for new
 * ones. Nothing depends on one having finished: until it does, the old rows are
 * stale, never broken — so a backfill can be paused, resumed, or abandoned
 * part-way without breaking the app.
 */
export const backfillQueue = new Queue("backfill", { connection });

export const BackfillJob = {
  /** `Contact.lastMessageSourceIdentifier` — one statement, the whole column. */
  NormaliseContactIdentifiers: "normalise-contact-identifiers",
  /** `WaMessage.sourceIdentifier` — millions of rows, one batch per job. */
  NormaliseMessageIdentifiers: "normalise-message-identifiers",
} as const;

/** Where a message batch starts from. The sweep walks the primary key. */
export interface NormaliseMessagesJob {
  /** Exclusive lower bound; absent on the first batch. */
  cursor?: string;
  batchSize?: number;
  /** Carried across the chain so the logs read as one run. */
  scanned?: number;
  rewritten?: number;
}

/**
 * Start the `WaMessage.sourceIdentifier` sweep.
 *
 * Each batch enqueues the next, so this is the only call needed: the chain
 * stops on its own when the sweep reaches the end of the table.
 */
export async function startMessageIdentifierNormalisation(job: NormaliseMessagesJob = {}) {
  return backfillQueue.add(BackfillJob.NormaliseMessageIdentifiers, job, {
    attempts: 5,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: { count: 50 },
    removeOnFail: { count: 100 },
  });
}

export async function startContactIdentifierNormalisation() {
  return backfillQueue.add(
    BackfillJob.NormaliseContactIdentifiers,
    {},
    { attempts: 5, backoff: { type: "exponential", delay: 5000 }, removeOnComplete: { count: 10 } },
  );
}
