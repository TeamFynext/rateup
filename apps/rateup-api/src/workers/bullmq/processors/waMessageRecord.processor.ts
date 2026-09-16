// Second chance for the post-send store. See `waMessageRecordQueue` for why
// this exists; `sendMetaMessage` enqueues here when `handleWaMessages` fails
// for a message Meta has already accepted.
import { Job, Worker } from "bullmq";

import { PlatformType } from "../../../../generated/prisma/enums.js";
import { handleWaMessages } from "../../../modules/whatsapp/inbox/message/wamessage.controller.js";
import { getWaMessageByMessageId } from "../../../modules/whatsapp/inbox/message/wamessage.service.js";
import baseRedis from "../../../utils/redisConnection.js";
import { log } from "../../shared/logger.js";
import type { WaMessageRecordJob } from "../queues/whatsapp.queue.js";

const workerConnection = baseRedis.duplicate();

export const waMessageRecordWorker = new Worker<WaMessageRecordJob>(
  "waMessageRecord",
  async (job: Job<WaMessageRecordJob>) => {
    const data = job.data;

    // The first attempt may have written the row and failed afterwards, or the
    // status consumer's own path may have caught up — either way, done.
    if (await getWaMessageByMessageId(data.messageId)) {
      log.info({ messageId: data.messageId }, "Message already recorded; nothing to do");
      return;
    }

    // Throws on failure so BullMQ applies the queue's backoff and attempts.
    await handleWaMessages(
      "send",
      data.payload as never,
      data.recipient,
      data.orgId,
      data.platform as PlatformType,
      data.sourceIdentifier,
      data.userName,
      data.messageId,
      data.userId,
      false,
      data.teamId,
      data.messageType,
      data.isAutomated,
      data.externalApi,
      {},
      data.campaign,
    );
    log.warn(
      { messageId: data.messageId, orgId: data.orgId, attempt: job.attemptsMade + 1 },
      "Message stored by the record queue",
    );
  },
  {
    connection: workerConnection,
    // Deliberately small: this queue only has work when the store path is
    // already struggling, and hammering the pool from here would prolong that.
    concurrency: 10,
  },
);

waMessageRecordWorker.on("failed", (job, err) => {
  const maxAttempts = job?.opts.attempts ?? 1;
  if (job && job.attemptsMade >= maxAttempts) {
    log.error(
      { err, messageId: job.data.messageId, orgId: job.data.orgId },
      "Message was sent but could not be stored after every record attempt",
    );
  }
});

waMessageRecordWorker.on("error", (err) => {
  log.error("waMessageRecord worker error: %s", err);
});

log.info("WhatsApp message record worker initialized");
