// Writes an uploaded contact spreadsheet that the API has already validated and queued.
//
// Thin on purpose: batching, resuming after a failed attempt and the trigger fan-out all
// live in `runContactImport`, which the tests drive directly.
import { Job, Worker } from "bullmq";

import { log } from "../../shared/logger.js";
import baseRedis from "../../../utils/redisConnection.js";
import { runContactImport } from "../../../modules/contact/contactImport.service.js";
import type { ContactImportJobData, ContactImportProgress } from "../queues/contactImport.queue.js";

const workerConnection = baseRedis.duplicate();

export const contactImportWorker = new Worker<ContactImportJobData, ContactImportProgress>(
  "contactImport",
  async (job: Job<ContactImportJobData, ContactImportProgress>) => {
    const result = await runContactImport(job);
    log.info({ jobId: job.id, orgId: job.data.orgId, ...result }, "Contact import finished");
    return result;
  },
  // Two at once: each import holds a transaction per batch, and one org's 100k-row file
  // should not stop every other org's 50-row file from starting.
  { connection: workerConnection, concurrency: 2 },
);

contactImportWorker.on("failed", (job, err) => {
  log.error(
    { err, jobId: job?.id, orgId: job?.data?.orgId, attemptsMade: job?.attemptsMade },
    "contactImport job failed",
  );
});
