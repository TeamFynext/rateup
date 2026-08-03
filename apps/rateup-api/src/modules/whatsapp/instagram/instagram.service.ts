import { callMetaApi } from "../wa_axios.js";
import { getWaSettingsByIbaId, getWaSettingsById } from "../settings/wa_settings.service.js";
import { log } from "../../../utils/logger.js";
import { updateWaMessageByMessageId } from "../inbox/message/wamessage.service.js";
import { PlatformType } from "../../../../generated/prisma/enums.js";
import { getInstagramWebhookEvent } from "./instagram.util.js";
import { InstagramEvent } from "../../../types/enums.js";
import { handleWaMessages } from "../inbox/message/wamessage.controller.js";
import { checkAndExecuteRuleByTriggerEvent } from "../automatedReply/wa_automatedReply.utils.js";

export async function getIgUserDetailsFromMeta(igsId: string, ibaId: string) {
  const waSettings = await getWaSettingsByIbaId(ibaId);
  if (!waSettings) {
    throw new Error(`No Instagram settings found for ibaId ${ibaId}`);
  }
  const { pageAccessToken } = waSettings;
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
      waSettings = await getWaSettingsByIbaId(entry.id);
    } catch (error) {
      log.error({ err: error, ibaId: entry.id }, "[Instagram] Failed to load settings for account");
      failed++;
      continue;
    }

    if (!waSettings) {
      log.trace("No instagram settings found for instagram business account id: %s", entry.id);
      continue;
    }
    const { orgId, ibaId } = waSettings;
    if (!ibaId) {
      // Guaranteed non-null in practice: waSettings was just looked up BY ibaId, but
      // the column itself is nullable, so this narrows the type for everything below.
      log.trace("Instagram settings for account %s have no ibaId configured", entry.id);
      continue;
    }
    const settings = { orgId, ibaId };

    // Handle comment/live_comment change events
    if (entry.changes) {
      for (const change of entry.changes) {
        if (change.field === "comments" || change.field === "live_comments") {
          const event =
            change.field === "live_comments" ? InstagramEvent.LIVE_COMMENT : InstagramEvent.COMMENT;
          try {
            await handleInstagramComment(change.value, event, settings);
            processed++;
          } catch (error) {
            log.error({ err: error, ibaId, event }, "[Instagram] Failed to handle comment");
            failed++;
          }
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
) {
  const { orgId, ibaId } = waSettings;
  const { id: commentId, text, from, created_time } = comment;
  const igsId = from.id;

  if (igsId === ibaId) {
    log.trace("[Instagram] Skipping the business's own comment %s", commentId);
    return;
  }

  log.info(
    `[Instagram] Received ${event} from igsId ${igsId} (${from.username}): "${text}" (comment: ${commentId})`,
  );

  try {
    // Store the comment as a received message in the inbox
    const commentBody = {
      sender: { id: igsId },
      recipient: { id: ibaId },
      timestamp: created_time * 1000,
      message: {
        mid: `ig_comment_${commentId}`,
        text,
        comment_id: commentId,
        media_id: comment.media?.id,
      },
    };

    await handleWaMessages(
      "receive",
      commentBody,
      igsId,
      orgId,
      PlatformType.INSTAGRAM,
      ibaId,
      undefined,
      `ig_comment_${commentId}`,
    );
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
  await handleWaMessages(
    "receive",
    messaging,
    sender.id,
    orgId,
    PlatformType.INSTAGRAM,
    ibaId,
    undefined,
    mid,
  );
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
  try {
    await handleWaMessages(
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
    log.info(`[Instagram] Postback received from user ${sender.id}: ${postback.payload}`);

    const messageBody = {
      type: "postback",
      payload: postback.payload,
      title: postback.title,
      referral: postback.referral,
      timestamp,
      sender,
    };

    await handleWaMessages(
      "receive",
      messageBody,
      sender.id,
      orgId,
      PlatformType.INSTAGRAM,
      ibaId,
      undefined,
      `ig_postback_${timestamp}`,
    );

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
  const referral = messaging.message?.referral || messaging.postback?.referral;

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
    log.info(`[Instagram] Referral received from user ${sender.id}: ${referralText}`);

    const messageBody = {
      type: "referral",
      referral,
      timestamp,
      sender,
    };

    await handleWaMessages(
      "receive",
      messageBody,
      sender.id,
      orgId,
      PlatformType.INSTAGRAM,
      ibaId,
      undefined,
      `ig_referral_${timestamp}`,
    );

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
  const { sender, reaction } = messaginObj;
  const { orgId, ibaId } = waSettings;
  await handleWaMessages(
    "receive",
    messaginObj,
    sender.id,
    orgId,
    PlatformType.INSTAGRAM,
    ibaId,
    undefined,
    reaction?.mid,
  );
}

interface MetaFbPage {
  id: string;
  name: string;
  access_token: string;
  instagram_business_account?: { id: string };
}

export async function getFbPages(settingsId: string, orgId: string) {
  const waSettings = await getWaSettingsById(settingsId, orgId);
  if (!waSettings) {
    throw new Error(`No WhatsApp settings found for id ${settingsId}`);
  }
  const { accessToken } = waSettings;
  const res = await callMetaApi(
    `/me/accounts?fields=id,name,access_token,instagram_business_account`,
    "GET",
    accessToken,
  );
  return (res.data.data as MetaFbPage[])
    .filter((i) => Boolean(i.instagram_business_account?.id))
    .map((i) => ({
      fbPageId: i.id,
      ibaId: i.instagram_business_account!.id,
      pageAccessToken: i.access_token,
      fbPageName: i.name,
    }));
}
