import "dotenv/config";

import { Worker } from "bullmq";

import { log } from "../../utils/logger.js";
import { connectKafkaProducer, producer } from "../../plugins/kafka.js";
import { syncJobSchedulers } from "./queues/cron.queue.js";
import { reconcileScheduledCampaignSends } from "../../modules/campaign/campaignRetry.service.js";

import * as campaignDequeue from "./processors/campaignDequeue.processor.js";
import * as campaignEnqueue from "./processors/campaignEnqueue.processor.js";
import * as campaignRetryFire from "./processors/campaignRetryFire.processor.js";
import * as integration from "./processors/integration.processor.js";
import * as notification from "./processors/notification.processor.js";
import * as outgoingWebhook from "./processors/outgoingWebhook.processor.js";
import * as pausedAutomation from "./processors/pausedAutomation.processor.js";
import * as scheduledJobs from "./processors/scheduledJobs.processor.js";
import * as sendMessage from "./processors/sendMessage.processor.js";
import * as userAvailability from "./processors/userAvailability.processor.js";
import * as waMessage from "./processors/waMessage.processor.js";
import * as waMessageRecord from "./processors/waMessageRecord.processor.js";
import * as webhook from "./processors/webhook.processor.js";
import * as zapierTrigger from "./processors/zapierTrigger.processor.js";

/**
 * BullMQ worker service entrypoint — queue consumers and the wall-clock schedule.
 * No HTTP server: nothing here serves a request, so the process is a plain Node
 * program that stays alive on its Redis connections.
 *
 * Safe to run at any replica count: every consumer competes for jobs, and the
 * wall-clock schedule lives in Redis as BullMQ job schedulers (see
 * queues/cron.queue.ts), so each occurrence is delivered to exactly one worker.
 * For more throughput on a single backed-up queue, raising that processor's
 * `concurrency` is usually cheaper than another replica.
 */

// Importing a processor module attaches its worker as a side effect. Collecting
// the exported instances is what lets shutdown drain them instead of dropping
// in-flight jobs on SIGTERM.
const PROCESSOR_MODULES = [
  campaignDequeue,
  campaignEnqueue,
  campaignRetryFire,
  integration,
  notification,
  outgoingWebhook,
  pausedAutomation,
  scheduledJobs,
  sendMessage,
  userAvailability,
  waMessage,
  waMessageRecord,
  webhook,
  zapierTrigger,
];

function collectWorkers(): Worker[] {
  const workers: Worker[] = [];
  for (const mod of PROCESSOR_MODULES) {
    for (const exported of Object.values(mod as Record<string, unknown>)) {
      if (exported instanceof Worker) workers.push(exported);
    }
  }
  return workers;
}

async function start() {
  // Scheduled actions reach into services that publish to Kafka, so the producer
  // has to be connected here too.
  await connectKafkaProducer();

  const workers = collectWorkers();
  log.info(`Registered ${workers.length} BullMQ workers`);

  const { registered, removed } = await syncJobSchedulers();
  log.info(`Synced ${registered} job schedulers${removed ? ` (removed ${removed} stale)` : ""}`);

  // Scheduled retries fire from delayed jobs in Redis, so a Redis that lost them
  // leaves rows nothing will look at. Startup is when that is most likely to
  // have just happened, and re-arming is idempotent.
  const { checked, armed } = await reconcileScheduledCampaignSends();
  log.info(`Checked ${checked} scheduled campaign sends (re-armed ${armed})`);

  process.on("unhandledRejection", (reason) => {
    log.error(reason, "Unhandled promise rejection");
  });

  process.on("uncaughtException", (err) => {
    log.error(err, "Uncaught exception");
    process.exit(1);
  });

  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    log.info(`Received ${signal}, shutting down bullmq worker gracefully`);
    try {
      // Draining the workers is enough: the schedule itself lives in Redis, so
      // there are no in-process timers left to stop.
      await Promise.all(
        workers.map((worker) =>
          worker.close().catch((err) => log.error(err, `Failed to close worker "${worker.name}"`)),
        ),
      );
      await producer.disconnect();
      process.exit(0);
    } catch (err) {
      log.error(err, "Error during bullmq worker graceful shutdown");
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  log.info(`BullMQ worker service started (${workers.length} workers, ${registered} schedules)`);
}

start();

export default start;
