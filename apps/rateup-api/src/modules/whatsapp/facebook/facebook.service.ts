import type { DecryptedMetaChannel } from "../metaChannel/metaChannel.service.js";

/** The Facebook handlers only need the page identity off the channel row. */
type FacebookPageSettings = Pick<DecryptedMetaChannel, "orgId" | "fbPageId" | "pageAccessToken">;
import { callMetaApi } from "../wa_axios.js";
import { log } from "../../../utils/logger.js";
import { updateWaMessageByMessageId } from "../inbox/message/wamessage.service.js";
import { PlatformType } from "../../../../generated/prisma/enums.js";
import { FacebookEvent } from "../../../types/enums.js";
import { handleWaMessages } from "../inbox/message/wamessage.controller.js";
import { getFacebookWebhookEvent } from "./facebook.util.js";
import prisma from "../../../utils/prisma.js";
import { getMessengerChannel } from "../metaChannel/metaChannel.service.js";

export async function getFacebookUserDetailsFromMeta(userId: string, pageId: string) {
  try {
    const waSettings = await getMessengerChannel(pageId);
    if (!waSettings) {
      log.error(`No Facebook settings found for pageId: ${pageId}`);
      throw new Error(`No Facebook settings found for pageId: ${pageId}`);
    }

    const { pageAccessToken } = waSettings;
    // Token passed as callMetaApi's accessToken argument, which sends it as an
    // Authorization header. Interpolated into the URL it ended up in the trace log of
    // config.url, and in the full axios-config dump wa_axios.ts writes on any non-2xx —
    // so a page token leaked to the logs on every failed profile fetch.
    const url = `/${userId}?fields=name,profile_pic`;
    const res = await callMetaApi(url, "GET", pageAccessToken);

    return res.data as {
      name: string;
      email?: string;
      profile_pic: string;
      id: string;
    };
  } catch (error) {
    log.error({ err: error }, "Error getting Facebook user details");
    throw error;
  }
}

/**
 * Processes a webhook batch, returning a per-event outcome.
 *
 * Meta batches events, so both loops are guarded per item: previously
 * the settings lookup sat outside every handler's own try/catch, so one transient DB
 * error on entry 1 silently skipped entries 2..n and dropped a whole batch of inbound
 * messages.
 *
 * The result drives the controller's status code — see 10.6. A thrown error here means
 * nothing was processed at all, which is a different thing from some events failing.
 */
export async function handleFacebookWebhook(
  data: FacebookWebhookBody,
): Promise<{ processed: number; failed: number }> {
  let processed = 0;
  let failed = 0;

  for (const entry of data.entry) {
    const pageId = entry.id;

    let waSettings;
    try {
      // The Messenger channel for this page. A Page connected only for Instagram
      // has none, so its Messenger inbox is ignored here.
      waSettings = await getMessengerChannel(pageId);
    } catch (error) {
      log.error({ err: error, pageId }, "[Facebook] Failed to load settings for page");
      failed++;
      continue;
    }

    if (!waSettings) {
      log.trace("No Facebook settings found for page_id: %s", pageId);
      continue;
    }

    // Handle messaging events
    if (entry.messaging) {
      for (const messaging of entry.messaging) {
        const event = getFacebookWebhookEvent(messaging);
        if (!event) {
          continue;
        }

        const currentEventData = {
          ...data,
          entry: [
            {
              ...entry,
              messaging: [messaging],
            },
          ],
        } as FacebookWebhookBody;

        try {
          switch (event) {
            case FacebookEvent.MESSAGE:
              await handleFacebookMessages(currentEventData, waSettings);
              break;

            case FacebookEvent.MESSAGE_DELIVERED:
              await handleFacebookMessageDelivered(currentEventData);
              break;

            case FacebookEvent.MESSAGE_READ:
              await handleFacebookMessageRead(currentEventData);
              break;

            case FacebookEvent.MESSAGE_REACTION:
              await handleFacebookMessageReaction(currentEventData, waSettings);
              break;

            case FacebookEvent.POSTBACK:
              await handleFacebookPostback(currentEventData, waSettings);
              break;

            case FacebookEvent.QUICK_REPLY:
              await handleFacebookQuickReply(currentEventData, waSettings);
              break;

            default:
              log.warn("Unhandled Facebook event: %s", event);
          }
          processed++;
        } catch (error) {
          log.error({ err: error, pageId, event }, "[Facebook] Failed to handle event");
          failed++;
        }
      }
    }
  }

  return { processed, failed };
}

/**
 * Stores a reaction as an inbound message, the same way the Instagram equivalent does
 * (handleInstagramMessageReaction) — the raw messaging object goes through
 * handleWaMessages so the inbox renders it like any other reaction.
 */
export async function handleFacebookMessageReaction(
  data: FacebookWebhookBody,
  waSettings: FacebookPageSettings,
) {
  const { orgId, fbPageId } = waSettings;
  const messaging = data.entry[0].messaging[0];
  const { sender } = messaging;

  if (!sender?.id) {
    log.warn("No sender ID in Facebook reaction");
    return;
  }

  await handleWaMessages(
    "receive",
    messaging,
    sender.id,
    orgId,
    PlatformType.FACEBOOK,
    fbPageId ?? undefined,
  );
}

export async function handleFacebookMessages(
  data: FacebookWebhookBody,
  waSettings: FacebookPageSettings,
) {
  const { orgId, fbPageId } = waSettings;
  const sourceIdentifier = fbPageId ?? undefined;

  const messaging = data.entry[0].messaging[0];

  const { sender, message } = messaging;

  if (!sender?.id) {
    log.warn("No sender ID in Facebook message");
    return;
  }

  // Skip echoes
  if (message?.is_echo) {
    log.trace("Skipping Facebook message echo");
    return;
  }

  if (message?.mid) {
    const existing = await prisma.waMessage.findFirst({
      where: { messageId: message.mid },
      select: { id: true },
    });
    if (existing) {
      log.trace("[Facebook] Skipping message %s, already stored", message.mid);
      return;
    }
  }

  try {
    await handleWaMessages(
      "receive",
      messaging,
      sender.id,
      orgId,
      PlatformType.FACEBOOK,
      sourceIdentifier,
      undefined,
      message?.mid,
    );
  } catch (error) {
    log.error(
      {
        err: error,
        stack: error instanceof Error ? error.stack : undefined,
      },
      `[Facebook] Error handling message from user ${sender.id}`,
    );
  }
}

export async function handleFacebookMessageDelivered(data: FacebookWebhookBody) {
  const messaging = data.entry[0].messaging[0];
  const { delivery } = messaging;

  if (!delivery?.mids) {
    return;
  }

  for (const mid of delivery.mids) {
    try {
      const deliveredTime = new Date().toISOString();
      await updateWaMessageByMessageId(mid, {
        stats: {
          delivered: deliveredTime,
        },
      });
    } catch (error) {
      log.error({ err: error }, `[Facebook] Error updating delivery status for ${mid}`);
    }
  }
}

export async function handleFacebookMessageRead(data: FacebookWebhookBody) {
  const messaging = data.entry[0].messaging[0];
  const { read, sender, recipient } = messaging;

  if (!read?.watermark) {
    return;
  }
  try {
    const readTime = new Date(read.watermark);

    log.trace(`[Facebook] Messages read up to watermark: ${readTime.toISOString()}`);

    const messages = await prisma.waMessage.findMany({
      where: {
        sourcePlatform: PlatformType.FACEBOOK,

        // Your page/account id
        sourceIdentifier: recipient.id,

        // Outbound bodies are stored under the key `send` — handleWaMessages builds
        // { exchangeProcess, send, receive }. The filter used to say `sent`, which no
        // row has, so this matched nothing and the handler logged "Updated 0 messages"
        // every time.
        messageBody: {
          path: ["send", "recipient", "id"],
          equals: sender.id,
        },

        // No sendBy filter: it holds the agent's user id, so it is null for anything the
        // platform sent on its own — automated replies, campaigns, chatbot messages.
        // Requiring it meant those could never be marked read.

        // Only older messages
        waCreatedAt: {
          lte: readTime,
        },
      },
      select: {
        id: true,
        stats: true,
      },
    });

    // Only rows not already marked read. A watermark covers everything up to that point,
    // so without this every receipt re-selected the whole conversation and stamped the
    // newest watermark over it — an old message's read time drifted forward to whenever
    // the customer last opened the thread, and a long thread issued one write per
    // message on every receipt.
    const unread = messages.filter((message) => {
      const stats = message.stats as Record<string, unknown> | null;
      return !stats?.read;
    });

    // Still one update per row rather than updateMany: `stats` is a Json column and each
    // row's existing contents have to be preserved, which updateMany cannot do without
    // overwriting the whole value.
    await Promise.all(
      unread.map((message) =>
        prisma.waMessage.update({
          where: {
            id: message.id,
          },
          data: {
            stats: {
              ...(message.stats as Record<string, unknown>),
              read: readTime.toISOString(),
            },
          },
        }),
      ),
    );

    log.trace(`[Facebook] Updated ${unread.length} messages as read`);
  } catch (error) {
    log.error({ err: error }, "[Facebook] Error handling read receipt");
  }
}

export async function handleFacebookPostback(
  data: FacebookWebhookBody,
  waSettings: FacebookPageSettings,
) {
  const { orgId, fbPageId } = waSettings;
  const sourceIdentifier = fbPageId ?? undefined;
  const messaging = data.entry[0].messaging[0];
  const { sender, postback, timestamp } = messaging;

  // Guarded like handleFacebookMessages. Without it, `${sender.id}` in the log below
  // threw a TypeError inside the try, and the catch then dereferenced sender AGAIN in
  // its own message — throwing a second TypeError out of the catch, which unwound
  // handleFacebookWebhook and abandoned every remaining event in the batch.
  if (!sender?.id) {
    log.warn("No sender ID in Facebook postback");
    return;
  }

  if (!postback?.payload) {
    log.warn("No postback payload in Facebook event");
    return;
  }

  try {
    log.info(`[Facebook] Postback received from user ${sender.id}: ${postback.payload}`);

    // Store postback as message
    const messageBody = {
      type: "postback",
      payload: postback.payload,
      title: postback.title,
      timestamp: timestamp,
      sender: sender,
    };

    await handleWaMessages(
      "receive",
      messageBody,
      sender.id,
      orgId,
      PlatformType.FACEBOOK,
      sourceIdentifier,
      undefined,
      `postback_${timestamp}`,
    );
  } catch (error) {
    log.error({ err: error, senderId: sender.id }, "[Facebook] Error handling postback");
  }
}

export async function handleFacebookQuickReply(
  data: FacebookWebhookBody,
  waSettings: FacebookPageSettings,
) {
  const { orgId, fbPageId } = waSettings;
  const sourceIdentifier = fbPageId ?? undefined;
  const messaging = data.entry[0].messaging[0];
  const { sender, message, timestamp } = messaging;

  // Same guard as handleFacebookPostback — see the note there.
  if (!sender?.id) {
    log.warn("No sender ID in Facebook quick reply");
    return;
  }

  if (!message?.quick_reply?.payload) {
    log.warn("No quick_reply payload in Facebook event");
    return;
  }

  try {
    const payload = message.quick_reply.payload;
    const text = message.text || "";

    log.info(`[Facebook] Quick reply from user ${sender.id}: ${payload}`);

    // Store quick reply as message
    const messageBody = {
      type: "quick_reply",
      text: text,
      payload: payload,
      timestamp: timestamp,
      sender: sender,
    };

    await handleWaMessages(
      "receive",
      messageBody,
      sender.id,
      orgId,
      PlatformType.FACEBOOK,
      sourceIdentifier,
      undefined,
      message.mid,
    );
  } catch (error) {
    log.error({ err: error }, `[Facebook] Error handling quick_reply from user ${sender.id}`);
  }
}
