import { callMetaApi } from "../wa_axios.js";
import { log } from "../../../utils/logger.js";
import prisma from "../../../utils/prisma.js";
import { updateWaMessageByMessageId } from "../inbox/message/wamessage.service.js";
import { PlatformType } from "../../../../generated/prisma/enums.js";
import { getInstagramWebhookEvent, resolveCommentTimestampMs } from "./instagram.util.js";
import { getInstagramMediaPermalink } from "./instagram_messaging.service.js";
import { InstagramEvent } from "../../../types/enums.js";
import { handleWaMessages } from "../inbox/message/wamessage.controller.js";
import { checkAndExecuteRuleByTriggerEvent } from "../automatedReply/wa_automatedReply.utils.js";
import { handleMetaFlowUserResponse } from "../automatedReply/metaFlow.service.js";
import { getInstagramChannel } from "../metaChannel/metaChannel.service.js";
import { sendViaWstoOrgHandler } from "../../org/ws/org.ws.controller.js";
import {
  handleInstagramMentionChange,
  linkPendingInstagramMentions,
  recordInstagramStoryMention,
} from "./instagram_mentions.service.js";

/**
 * How long a thread opened from a click-to-Instagram-Direct ad stays open past the
 * usual 24 h. Meta's figure for ad threads (Messenger changelog 16 Sep 2025, partner
 * reports for Instagram); the send path reads `Conversation.adThreadUntil`, not this.
 */
export const AD_THREAD_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export async function getIgUserDetailsFromMeta(igsId: string, ibaId: string) {
  const channel = await getInstagramChannel(ibaId);
  if (!channel) {
    throw new Error(`No Instagram settings found for ibaId ${ibaId}`);
  }
  const { pageAccessToken } = channel;
  const url = `/${igsId}?fields=name,username,profile_pic,follower_count,is_verified_user,is_user_follow_business,is_business_follow_user`;
  const res = await callMetaApi(url, "GET", pageAccessToken);
  // trace, not info: this is the customer's whole Instagram profile.
  log.trace("Instagram user details: %o", res.data);
  return res.data as {
    name: string;
    username: string;
    follower_count: number;
    is_user_follow_business: boolean;
    is_business_follow_user: boolean;
    is_verified_user: boolean;
    profile_pic: string;
  };
}

export async function handleInstagramWebhook(
  data: InstagramWebhookBody,
): Promise<{ processed: number; failed: number }> {
  let processed = 0;
  let failed = 0;

  for (const entry of data.entry) {
    let waSettings;
    try {
      waSettings = await getInstagramChannel(entry.id);
    } catch (error) {
      log.error({ err: error, ibaId: entry.id }, "[Instagram] Failed to load settings for account");
      failed++;
      continue;
    }

    if (!waSettings) {
      log.trace("No instagram settings found for instagram business account id: %s", entry.id);
      continue;
    }
    const { orgId, accountId: ibaId } = waSettings;
    const settings = { orgId, ibaId };

    // Handle comment/live_comment change events
    if (entry.changes) {
      for (const change of entry.changes) {
        if (change.field === "comments" || change.field === "live_comments") {
          const event =
            change.field === "live_comments" ? InstagramEvent.LIVE_COMMENT : InstagramEvent.COMMENT;
          try {
            await handleInstagramComment(change.value, event, settings, entry.time);
            processed++;
          } catch (error) {
            log.error({ err: error, ibaId, event }, "[Instagram] Failed to handle comment");
            failed++;
          }
        } else if (change.field === "mentions") {
          // Tagged in a caption or a comment: loyalty points for mentions. Never throws.
          await handleInstagramMentionChange(change.value, settings);
          processed++;
        }
      }
    }

    if (!entry.messaging) {
      continue;
    }

    for (const messaging of entry.messaging) {
      const event = getInstagramWebhookEvent(messaging);
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
      } as InstagramWebhookBody;

      try {
        switch (event) {
          case InstagramEvent.MESSAGE:
            await handleInstagramMessages(currentEventData, settings);
            break;
          case InstagramEvent.POSTBACK:
            await handleInstagramPostback(currentEventData, settings);
            break;
          case InstagramEvent.REFERRAL:
            await handleInstagramReferral(currentEventData, settings);
            break;
          case InstagramEvent.STORY_MENTION:
            await handleInstagramStoryMentionRule(messaging, settings);
            break;
          case InstagramEvent.MESSAGE_REACTION:
            await handleInstagramMessageReaction(currentEventData, settings);
            break;
          case InstagramEvent.MESSAGE_SEEN:
            await handleInstagramMessageSeen(currentEventData);
            break;
          case InstagramEvent.MESSAGE_EDIT:
            await handleInstagramMessageEdit(messaging, settings);
            break;
          default:
            log.warn("Unhandled event: %s", event);
        }
        processed++;
      } catch (error) {
        log.error({ err: error, ibaId, event }, "[Instagram] Failed to handle event");
        failed++;
      }
    }
  }

  return { processed, failed };
}

export async function handleInstagramComment(
  comment: InstagramCommentValue,
  event: InstagramEvent.COMMENT | InstagramEvent.LIVE_COMMENT,
  waSettings: { orgId: string; ibaId: string },
  entryTime?: number,
) {
  const { orgId, ibaId } = waSettings;
  const { id: commentId, text, from, created_time } = comment;
  const igsId = from.id;

  if (igsId === ibaId) {
    log.trace("[Instagram] Skipping the business's own comment %s", commentId);
    return;
  }

  log.trace({ event, igsId, commentId }, "[Instagram] Comment event received");

  // Resolved once, here, rather than every time an agent opens the ticket: a
  // comment carries only the media's numeric id, and an instagram.com/p/ URL
  // needs the shortcode. Permalinks never change, so the value keeps.
  let mediaPermalink: string | null = null;
  if (comment.media?.id) {
    try {
      mediaPermalink = await getInstagramMediaPermalink(comment.media.id, ibaId);
    } catch (error) {
      // The link is a convenience; the comment is the message. Never lose the
      // second because Meta would not hand over the first.
      log.error(
        { err: error, mediaId: comment.media.id },
        `[Instagram] Could not resolve the post link for comment ${commentId}`,
      );
    }
  }

  try {
    // Store the comment as a received message in the inbox
    const commentBody = {
      sender: { id: igsId },
      recipient: { id: ibaId },
      timestamp: resolveCommentTimestampMs(created_time, entryTime),
      message: {
        mid: `ig_comment_${commentId}`,
        text,
        comment_id: commentId,
        media_id: comment.media?.id,
        media_permalink: mediaPermalink ?? undefined,
      },
    };

    const stored = await handleWaMessages(
      "receive",
      commentBody,
      igsId,
      orgId,
      PlatformType.INSTAGRAM,
      ibaId,
      undefined,
      `ig_comment_${commentId}`,
    );
    // A redelivered comment: the first copy already ran the comment rules.
    if (stored === null) return;
    if (stored?.conversationId && comment.media?.id) {
      await attributeConversationToMedia(stored.conversationId, stored.id, comment.media.id);
    }
  } catch (error) {
    log.error({ err: error }, `[Instagram] Error storing comment ${commentId}`);
  }

  try {
    await checkAndExecuteRuleByTriggerEvent("INSTAGRAM_COMMENT", {
      orgId,
      phoneNumberId: ibaId,
      message: text || "",
      phone: igsId,
      instagramMediaId: comment.media?.id,
      instagramCommentId: commentId,
      instagramLiveComment: event === InstagramEvent.LIVE_COMMENT,
      platform: "INSTAGRAM",
    });
  } catch (error) {
    log.error({ err: error }, `[Instagram] Error in rule execution for comment ${commentId}`);
  }
}

async function handleInstagramStoryMentionRule(
  messaging: InstagramWebhookBody["entry"][0]["messaging"][0],
  waSettings: { orgId: string; ibaId: string },
) {
  const { orgId, ibaId } = waSettings;
  const { sender, message } = messaging;
  if (!message) {
    log.warn("[Instagram] Story mention event with no message payload; skipping");
    return;
  }
  const { mid } = message;
  if (message.is_echo) return;

  // Handle message storage
  const stored = await handleWaMessages(
    "receive",
    messaging,
    sender.id,
    orgId,
    PlatformType.INSTAGRAM,
    ibaId,
    undefined,
    mid,
  );
  // Already stored by an earlier delivery, which ran the rules.
  if (stored === null) return;
  // Loyalty points for the mention, keyed by the DM's mid. Never throws.
  await recordInstagramStoryMention({ orgId, ibaId, igsId: sender.id, storyId: mid });
  try {
    const storyAttachment = messaging.message?.attachments?.find((a) => a.type === "story_mention");
    await checkAndExecuteRuleByTriggerEvent("INSTAGRAM_STORY_MENTION", {
      orgId: waSettings.orgId,
      phoneNumberId: waSettings.ibaId,
      message: messaging.message?.text || "",
      phone: messaging.sender.id,
      instagramMediaId: storyAttachment?.payload?.url,
      platform: "INSTAGRAM",
    });
  } catch (error) {
    log.error({ err: error }, "[Instagram] Error in rule execution for story mention");
  }
}

/** Runs the "ig.me link opened" rules for a ref; true when one of them ran. */
async function runInstagramLinkRules(
  ref: string,
  igsId: string,
  waSettings: { orgId: string; ibaId: string },
): Promise<boolean> {
  try {
    const result = await checkAndExecuteRuleByTriggerEvent("INSTAGRAM_REFERRAL", {
      orgId: waSettings.orgId,
      phoneNumberId: waSettings.ibaId,
      phone: igsId,
      instagramRef: ref,
      platform: "INSTAGRAM",
    });
    return Boolean(result);
  } catch (error) {
    log.error({ err: error, ref }, "[Instagram] Error in link rule execution");
    return false;
  }
}

export async function handleInstagramMessages(
  data: InstagramWebhookBody,
  waSettings: { orgId: string; ibaId: string },
) {
  const { orgId, ibaId } = waSettings;
  const { sender, message } = data.entry[0].messaging[0];
  if (!message) {
    log.warn("[Instagram] Message event with no message payload; skipping");
    return;
  }
  const { mid } = message;
  // Echoes are already dropped by getInstagramWebhookEvent (12.6); kept as a
  // second line of defence for direct callers.
  if (message.is_echo) return;

  // Storage guarded separately from the rules, as handleInstagramComment does.
  // It used to sit outside the try, so a failed write escaped the handler and —
  // before 12.2 — abandoned the rest of the batch. It is rethrown so the webhook
  // still counts the event as failed and Meta retries.
  let stored;
  try {
    stored = await handleWaMessages(
      "receive",
      data.entry[0].messaging[0],
      sender.id,
      orgId,
      PlatformType.INSTAGRAM,
      ibaId,
      undefined,
      mid,
    );
  } catch (error) {
    log.error({ err: error }, "[Instagram] Error storing message");
    throw error;
  }
  // A redelivery of a message already stored — and already answered.
  if (stored === null) return;

  if (stored?.contactId) await linkMentionsWaitingForContact(orgId, stored.contactId);

  // A thread opened from a click-to-Direct ad stays open longer than 24 h.
  const referral = message.referral;
  if (referral && "source" in referral && referral.source === "ADS" && stored?.conversationId) {
    await openAdThreadWindow(stored.conversationId, data.entry[0].messaging[0].timestamp);
  }

  if (message.quick_reply?.payload?.startsWith("shop_")) {
    if (await handleInstagramShopReply(message.quick_reply.payload, sender.id, waSettings)) return;
  }

  // A first message sent from an ig.me link carries its ref; the link's own rule wins.
  const linkRef = message.referral && "ref" in message.referral ? message.referral.ref : undefined;
  if (linkRef && (await runInstagramLinkRules(linkRef, sender.id, waSettings))) return;

  // An answer to a running flow belongs to that flow, not to the keyword rules.
  const answeredFlow = await handleMetaFlowUserResponse(
    sender.id,
    message.text || "",
    orgId,
    { platform: PlatformType.INSTAGRAM, accountId: ibaId },
    message.quick_reply?.payload,
  );
  if (answeredFlow) return;

  // A reply to one of the business's stories: its own rules win over keyword rules,
  // the way link rules do. One that no story rule answers falls through to them.
  const story = message.reply_to?.story;
  if (story?.id) {
    try {
      const fired = await checkAndExecuteRuleByTriggerEvent("INSTAGRAM_STORY_REPLY", {
        orgId,
        phoneNumberId: ibaId,
        message: message.text || "",
        phone: sender.id,
        instagramStoryId: story.id,
        platform: "INSTAGRAM",
      });
      if (fired) return;
    } catch (error) {
      log.error({ err: error, storyId: story.id }, "[Instagram] Error in story reply rules");
    }
  }

  try {
    await checkAndExecuteRuleByTriggerEvent("MESSAGE_RECEIVED", {
      orgId,
      phoneNumberId: ibaId,
      message: message.text || "",
      phone: sender.id,
      platform: "INSTAGRAM",
    });
  } catch (error) {
    log.error({ err: error }, "[Instagram] Error in rule execution for message");
  }
}

/**
 * A caption or comment mention names its author only by username, so it waits until that
 * person DMs us. The indexed lookup keeps the common case — nothing waiting — to one read.
 */
async function linkMentionsWaitingForContact(orgId: string, contactId: string) {
  try {
    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
      select: { whatsappUserName: true },
    });
    const username = contact?.whatsappUserName?.trim().replace(/^@/, "").toLowerCase();
    if (!username) return;
    const waiting = await prisma.instagramMention.findFirst({
      where: { orgId, username, contactId: null, status: "PENDING" },
      select: { id: true },
    });
    if (waiting) await linkPendingInstagramMentions(orgId, contactId, username);
  } catch (error) {
    log.warn({ err: error, contactId }, "[Instagram] Could not link waiting mentions");
  }
}

/**
 * Remember the post whose comment opened this conversation, for the Instagram analytics
 * view (DMs, leads and orders per post). Only when the comment is the conversation's
 * first message — a comment from someone already chatting did not start anything — and
 * never over a post already recorded.
 */
async function attributeConversationToMedia(
  conversationId: string,
  messageRowId: string,
  mediaId: string,
) {
  try {
    const earlier = await prisma.waMessage.count({
      where: { conversationId, id: { not: messageRowId } },
    });
    if (earlier > 0) return;
    await prisma.conversation.updateMany({
      where: { id: conversationId, sourceMediaId: null },
      data: { sourceMediaId: mediaId },
    });
  } catch (error) {
    // Analytics only; the comment is stored and its rules still run.
    log.warn({ err: error, conversationId, mediaId }, "[Instagram] Could not attribute post");
  }
}

/** Extend the conversation's window for an ad-opened thread; never shortens one already set. */
async function openAdThreadWindow(conversationId: string, timestamp: number | undefined) {
  const startedAt = typeof timestamp === "number" && timestamp > 0 ? timestamp : Date.now();
  const until = new Date(startedAt + AD_THREAD_WINDOW_MS);
  try {
    await prisma.conversation.updateMany({
      where: {
        id: conversationId,
        OR: [{ adThreadUntil: null }, { adThreadUntil: { lt: until } }],
      },
      data: { adThreadUntil: until },
    });
  } catch (error) {
    log.warn({ err: error, conversationId }, "[Instagram] Could not record the ad thread window");
  }
}

/**
 * The customer edited a message. The stored body takes the new text, so search, the
 * ticket preview and the bubble all show what they now say; the earlier text is kept
 * under `editHistory`. `num_edit` orders edits that arrive out of order, and makes a
 * redelivery a no-op.
 */
export async function handleInstagramMessageEdit(
  messaging: InstagramWebhookBody["entry"][0]["messaging"][0],
  waSettings: { orgId: string; ibaId: string },
) {
  const edit = messaging.message_edit;
  if (!edit?.mid) return;
  const row = await prisma.waMessage.findFirst({
    where: { messageId: edit.mid, contact: { orgId: waSettings.orgId } },
  });
  if (!row) {
    log.trace("[Instagram] Edit for a message we never stored: %s", edit.mid);
    return;
  }

  const body = row.messageBody as WaInboxMessageBody;
  const receive = body.receive as IgReceiveMessageBody | undefined;
  if (!receive?.message) return;
  const metaEditNumber = Number(edit.num_edit);
  const editNumber =
    Number.isFinite(metaEditNumber) && metaEditNumber > 0
      ? metaEditNumber
      : (body.editCount ?? 0) + 1;
  if (editNumber <= (body.editCount ?? 0)) return;

  const editedAt = new Date(
    typeof messaging.timestamp === "number" && messaging.timestamp > 0
      ? messaging.timestamp
      : Date.now(),
  );
  const nextBody: WaInboxMessageBody = {
    ...body,
    receive: { ...receive, message: { ...receive.message, text: edit.text ?? "" } },
    editHistory: [
      ...(body.editHistory ?? []),
      { text: receive.message.text ?? null, editedAt: editedAt.toISOString() },
    ],
    editCount: editNumber,
  };

  const updated = await prisma.waMessage.update({
    where: { id: row.id },
    data: { messageBody: nextBody, editedAt },
  });

  await sendViaWstoOrgHandler(
    waSettings.orgId,
    {
      type: "message_edited",
      message_edited: {
        messageId: edit.mid,
        contactId: updated.contactId,
        conversationId: updated.conversationId,
        editedAt: editedAt.toISOString(),
        message: updated,
      },
    },
    "main",
  );
}

/** "Buy now" and checkout replies on a shop message (payloads starting `shop_`). */
async function handleInstagramShopReply(
  payload: string,
  igsId: string,
  waSettings: { orgId: string; ibaId: string },
): Promise<boolean> {
  try {
    const contact = await prisma.contact.findUnique({
      where: { contact_igsid_org_id_unique: { igsId, orgId: waSettings.orgId } },
      select: { id: true },
    });
    const { handleShopReply } = await import("../../commerce/shop/checkout.service.js");
    return await handleShopReply(payload, {
      orgId: waSettings.orgId,
      contactId: contact?.id ?? null,
      channel: "INSTAGRAM",
      channelAccountId: waSettings.ibaId,
    });
  } catch (error) {
    log.error({ err: error }, "[Instagram] Error handling a shop reply");
    return false;
  }
}

export async function handleInstagramPostback(
  data: InstagramWebhookBody,
  waSettings: { orgId: string; ibaId: string },
) {
  const { orgId, ibaId } = waSettings;
  const messaging = data.entry[0].messaging[0];
  const { sender, postback, timestamp } = messaging;

  if (!postback?.payload) {
    log.warn("No postback payload in Instagram event");
    return;
  }

  if (!sender?.id) {
    log.warn("[Instagram] Postback event with no sender; skipping");
    return;
  }

  try {
    log.trace({ senderId: sender.id }, "[Instagram] Postback received");

    const messageBody = {
      type: "postback",
      payload: postback.payload,
      title: postback.title,
      referral: postback.referral,
      timestamp,
      sender,
    };

    // No mid of its own, so one is made up. It carries the sender because message
    // ids are unique across every org, and a bare timestamp let two people tapping
    // in the same millisecond collide. A real redelivery repeats both.
    const stored = await handleWaMessages(
      "receive",
      messageBody,
      sender.id,
      orgId,
      PlatformType.INSTAGRAM,
      ibaId,
      undefined,
      `ig_postback_${sender.id}_${timestamp}`,
    );
    if (stored === null) return;

    if (postback.payload.startsWith("shop_")) {
      if (await handleInstagramShopReply(postback.payload, sender.id, waSettings)) return;
    }

    // A new conversation opened from an ig.me link, started by tapping an ice breaker,
    // carries the link's ref on the postback. The link's own rule wins, as it does for a
    // first message sent from a link.
    const linkRef =
      postback.referral && "ref" in postback.referral ? postback.referral.ref : undefined;
    if (linkRef && (await runInstagramLinkRules(linkRef, sender.id, waSettings))) return;

    const answeredFlow = await handleMetaFlowUserResponse(
      sender.id,
      postback.title ?? "",
      orgId,
      { platform: PlatformType.INSTAGRAM, accountId: ibaId },
      postback.payload,
    );
    if (answeredFlow) return;

    await checkAndExecuteRuleByTriggerEvent("MESSAGE_RECEIVED", {
      orgId,
      phoneNumberId: ibaId,
      message: postback.payload,
      phone: sender.id,
      platform: "INSTAGRAM",
    });
  } catch (error) {
    // sender.id is safe here — it is guarded above — but the id is captured into
    // the log context rather than interpolated, so the catch cannot itself throw.
    log.error({ err: error, senderId: sender?.id }, "[Instagram] Error handling postback");
  }
}

export async function handleInstagramReferral(
  data: InstagramWebhookBody,
  waSettings: { orgId: string; ibaId: string },
) {
  const { orgId, ibaId } = waSettings;
  const messaging = data.entry[0].messaging[0];
  const { sender, timestamp } = messaging;
  const referral =
    messaging.referral || messaging.message?.referral || messaging.postback?.referral;

  if (!referral) {
    log.warn("No referral payload in Instagram event");
    return;
  }

  let referralText = "";
  if ("ref" in referral && referral.ref) {
    referralText = String(referral.ref);
  } else if ("product" in referral) {
    referralText = referral.product.id;
  }

  try {
    log.trace({ senderId: sender.id }, "[Instagram] Referral received");

    const messageBody = {
      type: "referral",
      referral,
      timestamp,
      sender,
    };

    // Made-up id, scoped to the sender for the same reason as the postback's.
    const stored = await handleWaMessages(
      "receive",
      messageBody,
      sender.id,
      orgId,
      PlatformType.INSTAGRAM,
      ibaId,
      undefined,
      `ig_referral_${sender.id}_${timestamp}`,
    );
    if (stored === null) return;

    const ref = "ref" in referral ? referral.ref : undefined;
    if (ref && (await runInstagramLinkRules(ref, sender.id, waSettings))) return;

    // Keyword rules on the ref text were the only way to answer a link before the
    // INSTAGRAM_REFERRAL trigger; rules written that way keep working.
    await checkAndExecuteRuleByTriggerEvent("MESSAGE_RECEIVED", {
      orgId,
      phoneNumberId: ibaId,
      message: referralText,
      phone: sender.id,
      platform: "INSTAGRAM",
    });
  } catch (error) {
    log.error({ err: error, senderId: sender?.id }, "[Instagram] Error handling referral");
  }
}

export async function handleInstagramMessageSeen(data: InstagramWebhookBody) {
  const messaginObj = data.entry[0].messaging[0];
  const { timestamp, read } = messaginObj;
  if (!read) {
    log.warn("[Instagram] Message-seen event with no read receipt payload; skipping");
    return;
  }
  if (!read.mid) {
    log.warn("[Instagram] Read receipt carries no message id; skipping");
    return;
  }
  const seentime = new Date(timestamp).toISOString();
  await updateWaMessageByMessageId(read.mid, {
    stats: {
      read: seentime,
    },
  });
}

export async function handleInstagramMessageReaction(
  data: InstagramWebhookBody,
  waSettings: { orgId: string; ibaId: string },
) {
  const messaginObj = data.entry[0].messaging[0];
  const { sender, timestamp } = messaginObj;
  const { orgId, ibaId } = waSettings;
  // `reaction.mid` is the message reacted *to*, which is already stored under
  // that id — used as this row's id it now collides, and the reaction would be
  // dropped as a redelivery. The inbox pairs a reaction with its message through
  // the body's `reaction.mid`, so the row gets an id of its own.
  await handleWaMessages(
    "receive",
    messaginObj,
    sender.id,
    orgId,
    PlatformType.INSTAGRAM,
    ibaId,
    undefined,
    `ig_reaction_${sender.id}_${timestamp}`,
  );
}
