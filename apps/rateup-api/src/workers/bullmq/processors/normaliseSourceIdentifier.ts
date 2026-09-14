import prisma from "../../../utils/prisma.js";
import { log } from "../../../utils/logger.js";
import {
  NormaliseMessagesJob,
  startMessageIdentifierNormalisation,
} from "../queues/backfill.queue.js";

/**
 * The lowest uuid, so the first batch needs no special case.
 */
const START_OF_TABLE = "00000000-0000-0000-0000-000000000000";

const DEFAULT_BATCH_SIZE = 10_000;

/**
 * A `sourceIdentifier` worth rewriting: it still holds separators, *and* it is a
 * phone number written with formatting.
 *
 * The second half is not optional. The column is shared — it also holds the
 * `internal` marker for system notes, Instagram and Facebook account ids, and a
 * WhatsApp phone id for an org with no number string. Stripping one of those to
 * its digits would invent an identifier rather than tidy one: `phone-1` becomes
 * `1`, which is a different channel and a plausible-looking one.
 */
const NEEDS_REWRITE = `
  "sourceIdentifier" ~ '[^0-9]'
  AND "sourceIdentifier" ~ '^[+[:space:]().-]*[0-9][0-9[:space:]().-]*$'`;

/**
 * Settle `WaMessage.sourceIdentifier` on one spelling: digits.
 *
 * Several paths wrote this column from different sources — the campaign worker
 * stored `WhatsappSettings.phone` verbatim (`+9655-033-4145`, or `+965 5033 4145`
 * where the display string carries spaces), the inbox send path stripped only the
 * `+`, and the webhook stores Meta's `display_phone_number` — so one number is
 * stored at least four ways and every `=` between two of them is a coin flip.
 *
 * Messages written since the fix are already digits. This converges the rest.
 *
 * ── Why a worker and not a migration ──────────────────────────────────────────
 * `sourceIdentifier` is indexed, so changing it cannot be a HOT update: each row
 * rewrites its entry in all 16 of `WaMessage`'s indexes. Measured at ~1,000
 * rows/second, which is over an hour for a few million rows — far longer than a
 * deploy step can wait, and one transaction that size holds back vacuum across
 * the whole database while it runs.
 *
 * One job per batch instead: each commits on its own, so a failure retries a
 * batch rather than losing an hour, and the sweep can be paused by pausing the
 * queue.
 *
 * ── Why a cursor ──────────────────────────────────────────────────────────────
 * The obvious form — "take the next 10k rows that still need fixing" — re-reads
 * every row already done on each pass, because the predicate is an expression
 * and no index can serve it. `EXPLAIN` shows the planner walking the primary key
 * and discarding non-matches, so by the millionth row each batch is skipping a
 * million. Carrying a cursor keeps that constant: ~15k rows visited per 10k
 * found, wherever in the table the sweep has reached.
 *
 * Concurrency is 1 deliberately. The work is index maintenance, which is disk
 * and WAL, and running several batches at once contends for exactly the resource
 * that is already the bottleneck.
 */
export async function normaliseMessageBatch(job: { data: NormaliseMessagesJob }) {
  const { cursor = START_OF_TABLE, batchSize = DEFAULT_BATCH_SIZE } = job.data;
  const scannedSoFar = job.data.scanned ?? 0;
  const rewrittenSoFar = job.data.rewritten ?? 0;

  // One page of the primary key, whether or not those rows need anything. Taken
  // as the page's last id rather than `max(id)`, which PostgreSQL has no
  // implementation of for uuid.
  const page = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM (
      SELECT id FROM "WaMessage"
      WHERE id > ${cursor}::uuid
      ORDER BY id
      LIMIT ${batchSize}
    ) AS page
    ORDER BY id DESC
    LIMIT 1`;

  const batchEnd = page[0]?.id;
  if (!batchEnd) {
    log.info(
      { scanned: scannedSoFar, rewritten: rewrittenSoFar },
      "sourceIdentifier normalisation: reached the end of WaMessage",
    );
    return { done: true, scanned: scannedSoFar, rewritten: rewrittenSoFar };
  }

  // Bounded to this page, so a retry after a partial failure redoes only this
  // batch — and redoing it is free, since a row already reduced to digits no
  // longer matches.
  const rewritten = await prisma.$executeRawUnsafe(
    `UPDATE "WaMessage"
     SET "sourceIdentifier" = regexp_replace("sourceIdentifier", '\\D', '', 'g')
     WHERE id > $1::uuid AND id <= $2::uuid
       AND "sourcePlatform" = 'WHATSAPP'
       AND ${NEEDS_REWRITE}`,
    cursor,
    batchEnd,
  );

  const scanned = scannedSoFar + batchSize;
  const total = rewrittenSoFar + rewritten;
  log.info({ rewritten, total, scanned, cursor: batchEnd }, "sourceIdentifier normalisation batch");

  // The next batch is enqueued only once this one has committed, which is what
  // makes the chain resumable: a worker that dies mid-batch leaves the job to be
  // retried, never a gap in the sweep.
  await startMessageIdentifierNormalisation({
    cursor: batchEnd,
    batchSize,
    scanned,
    rewritten: total,
  });

  return { done: false, scanned, rewritten: total, cursor: batchEnd };
}

/**
 * The same for `Contact.lastMessageSourceIdentifier`, the denormalised copy the
 * inbox falls back to for a ticket with no message rows of its own.
 *
 * One statement, no batching: nothing indexes this column, so its updates take
 * the HOT path and skip index maintenance entirely — and there is no index to
 * serve the predicate either, so a cursor would only turn one sequential scan
 * into many random ones. Measured at 37ms for the whole column on 61k contacts.
 */
export async function normaliseContactIdentifiers() {
  const rewritten = await prisma.$executeRawUnsafe(
    `UPDATE "Contact"
     SET "lastMessageSourceIdentifier" =
       regexp_replace("lastMessageSourceIdentifier", '\\D', '', 'g')
     WHERE "lastMessageSourceIdentifier" ~ '[^0-9]'
       AND "lastMessageSourceIdentifier" ~ '^[+[:space:]().-]*[0-9][0-9[:space:]().-]*$'`,
  );

  log.info({ rewritten }, "sourceIdentifier normalisation: contacts");
  return { rewritten };
}
