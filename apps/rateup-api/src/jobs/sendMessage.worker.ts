import { Worker } from "bullmq";
import { randomUUID } from "node:crypto";

import { PlatformType } from "../../generated/prisma/enums.js";
import { handleWaMessages } from "../modules/whatsapp/inbox/message/wamessage.controller.js";
import baseRedis from "../utils/redisConnection.js";
import { log } from "../utils/logger.js";

const workerConnection = baseRedis.duplicate();

/** What `generateInboxResponse` enqueues for each seeded message. */
interface SendMessageJob {
  message: string;
  contactId: string;
  type: "send" | "receive";
  options: {
    orgId: string;
    /** The contact's phone — the customer side of the exchange. */
    to: string;
    /** The business number the message arrived on / was sent from. */
    sourceIdentifier?: string;
    phone?: string;
    phoneId?: string;
    profileName?: string;
  };
}

/** A webhook `value` object as WhatsApp delivers one for an inbound text. */
function inboundBody(job: SendMessageJob, messageId: string) {
  return {
    messaging_product: "whatsapp",
    metadata: {
      phone_number_id: job.options.phoneId,
      display_phone_number: job.options.phone,
    },
    contacts: [{ wa_id: job.options.to, profile: { name: job.options.profileName } }],
    messages: [
      {
        id: messageId,
        from: job.options.to,
        type: "text",
        text: { body: job.message },
        timestamp: Math.floor(Date.now() / 1000).toString(),
      },
    ],
  };
}

/** The send payload shape the outbound path already speaks. */
function outboundBody(job: SendMessageJob) {
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: job.options.to,
    type: "text",
    text: { body: job.message, preview_url: false },
  };
}

/**
 * Seeded inbox traffic from the admin "Generate Test Data" page.
 *
 * The generator enqueues one job per message but nothing consumed them, so the
 * jobs piled up in Redis and no chat was ever generated. Each job now goes
 * through `handleWaMessages` — the same path a real webhook takes — so seeded
 * messages get a contact, a ticket, a subject and a websocket broadcast exactly
 * like production traffic, instead of rows written straight to the table.
 */
const sendMessageWorker = new Worker(
  "sendMessageQueue",
  async (job) => {
    const data = job?.data as SendMessageJob | undefined;
    if (!data?.options?.orgId || !data?.options?.to) {
      log.warn("send-message job missing orgId/to, skipping: %o", job?.data);
      return;
    }

    const messageId = `wamid.${randomUUID()}`;
    const isSend = data.type === "send";
    await handleWaMessages(
      isSend ? "send" : "receive",
      isSend ? outboundBody(data) : inboundBody(data, messageId),
      data.options.to,
      data.options.orgId,
      PlatformType.WHATSAPP,
      data.options.sourceIdentifier ?? "",
      data.options.profileName,
      messageId,
    );
  },
  {
    connection: workerConnection,
    concurrency: 5,
    removeOnComplete: {
      count: 1,
    },
  },
);

sendMessageWorker.on("error", (err) => {
  log.error("Send message worker error: %s", err);
});

log.info("Send message worker initialized");
