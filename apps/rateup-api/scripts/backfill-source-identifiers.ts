/**
 * Start the `sourceIdentifier` normalisation backfill.
 *
 *   npm run backfill:identifiers            # both sweeps
 *   npm run backfill:identifiers contacts   # just the contact column
 *   npm run backfill:identifiers messages   # just the message sweep
 *
 * This only *enqueues* — the `bullmq` service does the work, one batch per job,
 * and the message sweep chains itself to the end of the table. Watch it with the
 * worker's logs, or by counting what is left:
 *
 *   SELECT count(*) FROM "WaMessage"
 *   WHERE "sourcePlatform" = 'WHATSAPP' AND "sourceIdentifier" ~ '[^0-9]';
 *
 * Pause it by pausing the `backfill` queue; nothing depends on it having
 * finished. Safe to start twice — a row already reduced to digits no longer
 * matches, so a second sweep is a no-op that costs one pass.
 */
import "dotenv/config";

import {
  startContactIdentifierNormalisation,
  startMessageIdentifierNormalisation,
} from "../src/workers/bullmq/queues/backfill.queue.js";

const which = process.argv[2] ?? "both";

if (which === "both" || which === "contacts") {
  const job = await startContactIdentifierNormalisation();
  console.log(`queued contact normalisation (job ${job.id})`);
}

if (which === "both" || which === "messages") {
  const batchSize = Number(process.argv[3]) || undefined;
  const job = await startMessageIdentifierNormalisation(batchSize ? { batchSize } : {});
  console.log(
    `queued message normalisation (job ${job.id}${batchSize ? `, batch ${batchSize}` : ""})`,
  );
}

process.exit(0);
