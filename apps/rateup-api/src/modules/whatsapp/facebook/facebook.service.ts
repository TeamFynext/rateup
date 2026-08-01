import type { WhatsappSettings } from "../../../../generated/prisma/client.js";

/** The Facebook handlers only need the page identity off the settings row. */
type FacebookPageSettings = Pick<WhatsappSettings, "orgId" | "fbPageId" | "pageAccessToken">;
import { callMetaApi } from "../wa_axios.js";
import { getWaSettingsByPageId } from "../settings/wa_settings.service.js";
import { log } from "../../../utils/logger.js";
import { updateWaMessageByMessageId } from "../inbox/message/wamessage.service.js";
import { PlatformType } from "../../../../generated/prisma/enums.js";
import { FacebookEvent } from "../../../types/enums.js";
import { handleWaMessages } from "../inbox/message/wamessage.controller.js";
import { getFacebookWebhookEvent } from "./facebook.util.js";
import prisma from "../../../utils/prisma.js";

export async function getFacebookUserDetailsFromMeta(userId: string, pageId: string) {
  try {
    const waSettings = await getWaSettingsByPageId(pageId);
    if (!waSettings) {
      log.error(`No Facebook settings found for pageId: ${pageId}`);
      throw new Error(`No Facebook settings found for pageId: ${pageId}`);
    }

    const { pageAccessToken } = waSettings;
    const url = `/${userId}?fields=name,profile_pic&access_token=${pageAccessToken}`;
    const res = await callMetaApi(url, "GET");

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

export async function handleFacebookWebhook(data: FacebookWebhookBody) {
  for (const entry of data.entry) {
    const pageId = entry.id;

    // Get Facebook settings for this page
    const waSettings = await getWaSettingsByPageId(pageId);
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

          case FacebookEvent.POSTBACK:
            await handleFacebookPostback(currentEventData, waSettings);
            break;

          case FacebookEvent.QUICK_REPLY:
            await handleFacebookQuickReply(currentEventData, waSettings);
            break;

          default:
            log.warn("Unhandled Facebook event: %s", event);
        }
      }
    }
  }
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

        // Only outbound messages
        sendBy: {
          not: null,
        },

        // Messages sent to this customer
        messageBody: {
          path: ["sent", "recipient", "id"],
          equals: sender.id,
        },

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

    await Promise.all(
      messages.map((message) =>
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

    log.trace(`[Facebook] Updated ${messages.length} messages as read`);
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
      fbPageId || data.entry[0].id,
      undefined,
      `postback_${timestamp}`,
    );
  } catch (error) {
    log.error({ err: error }, `[Facebook] Error handling postback from user ${sender.id}`);
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
      fbPageId || data.entry[0].id,
      undefined,
      message.mid,
    );
  } catch (error) {
    log.error({ err: error }, `[Facebook] Error handling quick_reply from user ${sender.id}`);
  }
}
