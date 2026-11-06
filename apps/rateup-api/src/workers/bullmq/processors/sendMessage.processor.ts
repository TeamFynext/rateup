import { Worker } from "bullmq";
import { randomUUID } from "node:crypto";

import { PlatformType } from "../../../../generated/prisma/enums.js";
import { handleWaMessages } from "../../../modules/whatsapp/inbox/message/wamessage.controller.js";
import baseRedis from "../../../utils/redisConnection.js";
import { log } from "../../../utils/logger.js";
import { createTextMessage } from "../../shared/whatsapp/index.js";
import { simulateIncomingMessage } from "../../../utils/metaMock.js";
import { sendMetaMessage } from "../../../modules/whatsapp/meta/metaMessage.service.js";

const workerConnection = baseRedis.duplicate();

/**
 * Ad-hoc single-message sends, and the seeded inbox traffic the admin "Generate
 * Test Data" page enqueues.
 *
 * This queue used to have two competing consumers — one in rateup-api, one in
 * message-dispatcher — that each did half the job and raced for every message.
 * The API's did the full inbox bookkeeping (contact, ticket, subject, websocket
 * broadcast) but never actually sent anything; the dispatcher's really sent via
 * Graph but recorded a bare WaMessage row with none of the inbox side effects.
 * Whichever picked a job up first decided which half you got.
 *
 * Both halves now run here, in order: the message goes out over Graph, and the
 * resulting message id is threaded into `handleWaMessages` so persistence stays
 * on the single (Prisma) path. Sending through `callWhatsappApi` directly rather
 * than the shared `sendMessage()` wrapper is deliberate — that wrapper writes its
 * own WaMessage row, which would double-record every message.
 */
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
    accessToken?: string;
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

export const sendMessageWorker = new Worker(
  "sendMessageQueue",
  async (job) => {
    const data = job?.data as SendMessageJob | undefined;
    if (!data?.options?.orgId || !data?.options?.to) {
      log.warn("send-message job missing orgId/to, skipping: %o", job?.data);
      return;
    }

    if (data.type === "receive") {
      // Against @rateup/meta-mock, replay the message as a real inbound webhook
      // so the whole receive path is exercised. `simulateIncomingMessage` is a
      // no-op without META_API_BASE_URL, in which case fall through and
      // synthesize the webhook body directly.
      if (
        await simulateIncomingMessage({
          from: data.options.to,
          text: data.message,
          profileName: data.options.profileName,
        })
      ) {
        return;
      }

      const messageId = `wamid.${randomUUID()}`;
      await handleWaMessages(
        "receive",
        inboundBody(data, messageId),
        data.options.to,
        data.options.orgId,
        PlatformType.WHATSAPP,
        data.options.sourceIdentifier ?? "",
        data.options.profileName,
        messageId,
      );
      return;
    }

    // One call sends and records — including recording a send that Meta
    // rejected, which is the whole point of the service.
    const result = await sendMetaMessage({
      platform: PlatformType.WHATSAPP,
      orgId: data.options.orgId,
      to: data.options.to,
      payload: outboundBody(data),
      userName: data.options.profileName,
      ...(data.options.accessToken && data.options.phoneId
        ? {
            credentials: {
              accessToken: data.options.accessToken,
              phoneId: data.options.phoneId,
              sourceIdentifier: data.options.sourceIdentifier ?? "",
              auth: "header" as const,
            },
          }
        : {}),
    });

    if (!result.ok) {
      log.warn("send-message job for org %s could not send: %s", data.options.orgId, result.error);
    }
  },
  {
    connection: workerConnection,
    concurrency: 5,
    removeOnComplete: {
      count: 1,
    },
    removeOnFail: {
      count: 1,
    },
  },
);

sendMessageWorker.on("error", (err) => {
  log.error("Send message worker error: %s", err);
});

log.info("Send message worker initialized");
