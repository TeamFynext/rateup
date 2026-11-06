import type { DecryptedMetaChannel } from "../metaChannel/metaChannel.service.js";

/** The Facebook handlers only need the page identity off the channel row. */
type FacebookPageSettings = Pick<DecryptedMetaChannel, "orgId" | "fbPageId" | "pageAccessToken">;
import { callMetaApi } from "../wa_axios.js";
import { log } from "../../../utils/logger.js";
import { updateWaMessageByMessageId } from "../inbox/message/wamessage.service.js";
import { PlatformType } from "../../../generated/prisma/enums.js";
import { FacebookEvent } from "../../../types/enums.js";
import { handleWaMessages } from "../inbox/message/wamessage.controller.js";
import { getFacebookWebhookEvent } from "./facebook.util.js";
import prisma from "../../../utils/prisma.js";
import { getMessengerChannel } from "../metaChannel/metaChannel.service.js";
import { checkAndExecuteRuleByTriggerEvent } from "../automatedReply/wa_automatedReply.utils.js";
import redisConnection from "../../../utils/redisConnection.js";
import type { PendingComment } from "../meta/sendApiMessages.js";
import { handleMetaFlowUserResponse } from "../automatedReply/metaFlow.service.js";

/**
 * What an inbound Messenger message does once it is stored: an answer to a running
 * chatbot belongs to that chatbot, and anything else goes to the Page's rules. Mirrors
 * the Instagram handlers. Errors are logged, not thrown: the message is already saved.
 */
async function continueFlowOrRunRules(params: {
  psid: string;
  orgId: string;
  fbPageId: string | null | undefined;
  /** What the user typed or the title of what they tapped. */
  text: string;
  /** The tapped quick reply's or button's payload, when there was one. */
  buttonPayload?: string;
  /** What keyword rules match against; defaults to `text`. */
  ruleMessage?: string;
}) {
  const { psid, orgId, fbPageId, text, buttonPayload, ruleMessage = text } = params;
  if (!fbPageId) {
    log.warn({ orgId }, "[Facebook] Messenger channel has no page id; skipping flows and rules");
    return;
  }

  try {
    if (
      buttonPayload?.startsWith("shop_") &&
      (await handleMessengerShopReply(buttonPayload, psid, orgId, fbPageId))
    ) {
      return;
    }

    const answeredFlow = await handleMetaFlowUserResponse(
      psid,
      text,
      orgId,
      { platform: PlatformType.FACEBOOK, accountId: fbPageId },
      buttonPayload,
    );
    if (answeredFlow) return;

    await checkAndExecuteRuleByTriggerEvent("MESSAGE_RECEIVED", {
      orgId,
      platform: "FACEBOOK",
      phoneNumberId: fbPageId,
      phone: psid,
      message: ruleMessage,
    });
  } catch (error) {
    log.error({ err: error, senderId: psid }, "[Facebook] Error running flows and rules");
  }
}

/** "Buy now" and checkout replies on a shop message (payloads starting `shop_`). */
async function handleMessengerShopReply(
  payload: string,
  psid: string,
  orgId: string,
  fbPageId: string,
): Promise<boolean> {
  const contact = await prisma.contact.findUnique({
    where: { contact_psid_org_id_unique: { psid, orgId } },
    select: { id: true },
  });
  const { handleShopReply } = await import("../../commerce/shop/checkout.service.js");
  return handleShopReply(payload, {
    orgId,
    contactId: contact?.id ?? null,
    channel: "MESSENGER",
    channelAccountId: fbPageId,
  });
}

/**
 * Runs the "m.me link opened" rules for a ref; true when one of them ran. Mirrors
 * runInstagramLinkRules: a rule naming this ref wins over one that answers every link.
 */
async function runMessengerLinkRules(
  ref: string,
  psid: string,
  orgId: string,
  fbPageId: string,
): Promise<boolean> {
  try {
    const result = await checkAndExecuteRuleByTriggerEvent("MESSENGER_REFERRAL", {
      orgId,
      phoneNumberId: fbPageId,
      phone: psid,
      messengerRef: ref,
      platform: "FACEBOOK",
    });
    return Boolean(result);
  } catch (error) {
    log.error({ err: error, ref }, "[Facebook] Error in m.me link rules");
    return false;
  }
}

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

    // Page feed changes: only new comments are acted on.
    for (const change of entry.changes ?? []) {
      try {
        await handleFacebookComment(change, waSettings);
        processed++;
      } catch (error) {
        log.error({ err: error, pageId }, "[Facebook] Failed to handle a feed change");
        failed++;
      }
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

            case FacebookEvent.REFERRAL:
              await handleFacebookReferral(currentEventData, waSettings);
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
    const stored = await handleWaMessages(
      "receive",
      messaging,
      sender.id,
      orgId,
      PlatformType.FACEBOOK,
      sourceIdentifier,
      undefined,
      message?.mid,
    );
    // Another delivery of this mid stored it between the check above and here,
    // and answers it too.
    if (stored === null) return;
  } catch (error) {
    log.error(
      {
        err: error,
        stack: error instanceof Error ? error.stack : undefined,
      },
      `[Facebook] Error handling message from user ${sender.id}`,
    );
    // Not stored, so not answered either: a flow or rule replying to a message the
    // inbox never shows would leave the agent looking at half a conversation.
    return;
  }

  await continueFlowOrRunRules({
    psid: sender.id,
    orgId,
    fbPageId,
    text: message?.text ?? "",
  });
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
    log.trace({ senderId: sender.id }, "[Facebook] Postback received");

    // Store postback as message
    const messageBody = {
      type: "postback",
      payload: postback.payload,
      title: postback.title,
      referral: postback.referral,
      timestamp: timestamp,
      sender: sender,
    };

    // A postback has no mid of its own. The sender is part of the id because the
    // id is unique across every org: a timestamp alone let two people tapping in
    // the same millisecond collide, and the second tap would be dropped as a
    // redelivery. A real redelivery repeats both, so it still dedupes.
    const stored = await handleWaMessages(
      "receive",
      messageBody,
      sender.id,
      orgId,
      PlatformType.FACEBOOK,
      sourceIdentifier,
      undefined,
      `postback_${sender.id}_${timestamp}`,
    );
    if (stored === null) return;
  } catch (error) {
    log.error({ err: error, senderId: sender.id }, "[Facebook] Error handling postback");
    return;
  }

  // A first conversation opened from an m.me link carries the link's ref on the Get
  // Started postback. The link's own rule wins, as it does on Instagram.
  const linkRef = postback.referral?.ref;
  if (linkRef && fbPageId && (await runMessengerLinkRules(linkRef, sender.id, orgId, fbPageId))) {
    return;
  }

  // As on Instagram, rules see the button's payload; a flow matches either.
  await continueFlowOrRunRules({
    psid: sender.id,
    orgId,
    fbPageId,
    text: postback.title ?? "",
    buttonPayload: postback.payload,
    ruleMessage: postback.payload,
  });
}

/**
 * Someone who has chatted with the Page before opened an m.me link. The visit is stored
 * so the inbox shows where they came from, then the link's rules run. Without one, a
 * keyword rule on the ref text answers it, as on Instagram.
 */
export async function handleFacebookReferral(
  data: FacebookWebhookBody,
  waSettings: FacebookPageSettings,
) {
  const { orgId, fbPageId } = waSettings;
  const messaging = data.entry[0].messaging[0];
  const { sender, referral, timestamp } = messaging;

  if (!sender?.id || !referral) {
    log.warn("[Facebook] Referral event with no sender or referral; skipping");
    return;
  }

  // Meta can deliver the same event twice; the timestamp keys it like a postback.
  const messageId = `fb_referral_${sender.id}_${timestamp}`;
  try {
    const existing = await prisma.waMessage.findFirst({
      where: { messageId },
      select: { id: true },
    });
    if (existing) return;

    await handleWaMessages(
      "receive",
      { type: "referral", referral, timestamp, sender },
      sender.id,
      orgId,
      PlatformType.FACEBOOK,
      fbPageId ?? undefined,
      undefined,
      messageId,
    );
  } catch (error) {
    log.error({ err: error, senderId: sender.id }, "[Facebook] Error storing referral");
    return;
  }

  const ref = referral.ref;
  if (!ref || !fbPageId) return;
  if (await runMessengerLinkRules(ref, sender.id, orgId, fbPageId)) return;

  try {
    await checkAndExecuteRuleByTriggerEvent("MESSAGE_RECEIVED", {
      orgId,
      phoneNumberId: fbPageId,
      phone: sender.id,
      message: ref,
      platform: "FACEBOOK",
    });
  } catch (error) {
    log.error({ err: error, senderId: sender.id }, "[Facebook] Error running rules for a referral");
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

    log.trace({ senderId: sender.id }, "[Facebook] Quick reply received");

    // Store quick reply as message
    const messageBody = {
      type: "quick_reply",
      text: text,
      payload: payload,
      timestamp: timestamp,
      sender: sender,
    };

    const stored = await handleWaMessages(
      "receive",
      messageBody,
      sender.id,
      orgId,
      PlatformType.FACEBOOK,
      sourceIdentifier,
      undefined,
      message.mid,
    );
    // A redelivered tap: the first copy already ran the flow or rules.
    if (stored === null) return;
  } catch (error) {
    log.error({ err: error }, `[Facebook] Error handling quick_reply from user ${sender.id}`);
    return;
  }

  // Messenger sends a quick-reply tap as its own event, so it needs the same hand-off.
  await continueFlowOrRunRules({
    psid: sender.id,
    orgId,
    fbPageId,
    text: message.text ?? "",
    buttonPayload: message.quick_reply.payload,
  });
}

/** How long a comment is remembered as handled: Meta allows a private reply for 7 days. */
const COMMENT_SEEN_SECONDS = 7 * 24 * 60 * 60;

/**
 * Someone commented on a Page post. The Page's "Facebook comment" rules run with no
 * contact: a comment does not carry the person's Messenger id. The first thing a rule
 * sends is a private reply to the comment, and Meta's answer names them; only then is the
 * comment filed in their conversation, as Instagram comments are. A comment no rule
 * answered stays out of the inbox, since nobody could message that person.
 */
export async function handleFacebookComment(
  change: FacebookFeedChange,
  waSettings: FacebookPageSettings,
) {
  const { orgId, fbPageId } = waSettings;
  const value = change.value;
  if (change.field !== "feed" || value?.item !== "comment" || value.verb !== "add") return;
  if (!value.comment_id || !fbPageId) return;
  // The Page answering under its own post is not a customer, and answering it would loop.
  if (value.from?.id === fbPageId) return;

  const commentId = value.comment_id;
  // Meta retries a batch it did not get a 2xx for; a comment is answered once.
  const fresh = await redisConnection.set(
    `fb_comment:${commentId}`,
    "1",
    "EX",
    COMMENT_SEEN_SECONDS,
    "NX",
  );
  if (!fresh) {
    log.trace("[Facebook] Comment %s already handled", commentId);
    return;
  }

  const comment: PendingComment = { commentId };
  try {
    await checkAndExecuteRuleByTriggerEvent("FACEBOOK_COMMENT", {
      orgId,
      platform: "FACEBOOK",
      phoneNumberId: fbPageId,
      message: value.message ?? "",
      facebookComment: comment,
      facebookPostId: value.post_id,
    });
  } catch (error) {
    log.error({ err: error, commentId }, "[Facebook] Error running comment rules");
  }

  const psid = comment.recipientId;
  if (!psid) return;

  const timestamp = value.created_time ? value.created_time * 1000 : Date.now();
  // The reply already went out and the comment is claimed, so a retry could not help.
  try {
    await handleWaMessages(
      "receive",
      {
        sender: { id: psid },
        recipient: { id: fbPageId },
        timestamp,
        message: {
          mid: `fb_comment_${commentId}`,
          text: value.message,
          comment_id: commentId,
          media_id: value.post_id,
          media_permalink: value.post?.permalink_url,
        },
      },
      psid,
      orgId,
      PlatformType.FACEBOOK,
      fbPageId,
      value.from?.name,
      `fb_comment_${commentId}`,
    );
  } catch (error) {
    log.error(
      { err: error, commentId, psid },
      "[Facebook] Answered a comment but could not file it",
    );
  }
}
