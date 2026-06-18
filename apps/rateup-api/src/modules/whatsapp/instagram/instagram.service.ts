import { callMetaApi } from "../wa_axios.js";
import {
  getWaSettingsByIbaId,
  getWaSettingsById,
} from "../settings/wa_settings.service.js";
import { log } from "../../../utils/logger.js";
import { updateWaMessageByMessageId } from "../inbox/message/wamessage.service.js";
import { PlatformType } from "../../../../generated/prisma/enums.js";
import { getInstagramWebhookEvent } from "./instagram.util.js";
import { InstagramEvent } from "../../../types/enums.js";
import { handleWaMessages } from "../inbox/message/wamessage.controller.js";
import { sendInstagramPrivateReply } from "./instagram_messaging.service.js";
import { checkAndExecuteRuleByTriggerEvent } from "../automatedReply/wa_automatedReply.utils.js";

export async function getIgUserDetailsFromMeta(igsId, ibaId) {
  const { pageAccessToken } = await getWaSettingsByIbaId(ibaId);
  const url = `/${igsId}?fields=name,username,profile_pic,follower_count,is_verified_user,is_user_follow_business,is_business_follow_user&access_token=${pageAccessToken}`;
  const res = await callMetaApi(url, "GET");
  log.info("Instagram user details: %o", res.data);
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

export async function handleInstagramWebhook(data: InstagramWebhookBody) {
  for (const entry of data.entry) {
    const waSettings = await getWaSettingsByIbaId(entry.id);
    if (!waSettings) {
      log.trace(
        "No instagram settings found for instagram business account id: %s",
        entry.id,
      );
      continue;
    }

    // Handle comment/live_comment change events
    if (entry.changes) {
      for (const change of entry.changes) {
        if (change.field === "comments" || change.field === "live_comments") {
          const event =
            change.field === "live_comments"
              ? InstagramEvent.LIVE_COMMENT
              : InstagramEvent.COMMENT;
          await handleInstagramComment(change.value, event, waSettings);
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
      switch (event) {
        case InstagramEvent.MESSAGE:
          await handleInstagramMessages(data, waSettings);
          break;
        case InstagramEvent.POSTBACK:
          await handleInstagramPostback(data, waSettings);
          break;
        case InstagramEvent.REFERRAL:
          await handleInstagramReferral(data, waSettings);
          break;
        case InstagramEvent.STORY_MENTION:
          await handleInstagramStoryMentionRule(messaging, waSettings);
          break;
        case InstagramEvent.MESSAGE_REACTION:
          await handleInstagramMessageReaction(data, waSettings);
          break;
        case InstagramEvent.MESSAGE_SEEN:
          await handleInstagramMessageSeen(data);
          break;
        default:
          log.warn("Unhandled event: %s", event);
      }
    }
  }
}

export async function handleInstagramComment(
  comment: InstagramCommentValue,
  event: InstagramEvent.COMMENT | InstagramEvent.LIVE_COMMENT,
  waSettings,
) {
  const { orgId, ibaId } = waSettings;
  const { id: commentId, text, from, created_time } = comment;
  const igsId = from.id;

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
    log.error(`[Instagram] Error storing comment ${commentId}: %o`, error);
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
    log.error(
      `[Instagram] Error in rule execution for comment ${commentId}: %o`,
      error,
    );
  }
}

async function handleInstagramStoryMentionRule(
  messaging: InstagramWebhookBody["entry"][0]["messaging"][0],
  waSettings: { orgId: string; ibaId: string },
) {
  const { orgId, ibaId } = waSettings;
  const { sender, message } = messaging;
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
    const storyAttachment = messaging.message?.attachments?.find(
      (a) => a.type === "story_mention",
    );
    await checkAndExecuteRuleByTriggerEvent("INSTAGRAM_STORY_MENTION", {
      orgId: waSettings.orgId,
      phoneNumberId: waSettings.ibaId,
      message: messaging.message?.text || "",
      phone: messaging.sender.id,
      instagramMediaId: storyAttachment?.payload?.url,
      platform: "INSTAGRAM",
    });
  } catch (error) {
    log.error(
      "[Instagram] Error in rule execution for story mention: %o",
      error,
    );
  }
}

export async function handleInstagramMessages(
  data: InstagramWebhookBody,
  waSettings,
) {
  const { orgId, ibaId } = waSettings;
  const { sender, message } = data.entry[0].messaging[0];
  const { mid } = message;
  if (message.is_echo) return;

  // Handle message storage
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

  try {
    await checkAndExecuteRuleByTriggerEvent("MESSAGE_RECEIVED", {
      orgId,
      phoneNumberId: ibaId,
      message: message.text || "",
      phone: sender.id,
      platform: "INSTAGRAM",
    });
  } catch (error) {
    log.error(`[Instagram] Error in rule execution for message: %o`, error);
  }
}

export async function handleInstagramPostback(
  data: InstagramWebhookBody,
  waSettings,
) {
  const { orgId, ibaId } = waSettings;
  const messaging = data.entry[0].messaging[0];
  const { sender, postback, timestamp } = messaging;

  if (!postback?.payload) {
    log.warn("No postback payload in Instagram event");
    return;
  }

  try {
    log.info(
      `[Instagram] Postback received from user ${sender.id}: ${postback.payload}`,
    );

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
    log.error(
      `[Instagram] Error handling postback from user ${sender.id}: %o`,
      error,
    );
  }
}

export async function handleInstagramReferral(
  data: InstagramWebhookBody,
  waSettings,
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
    log.info(
      `[Instagram] Referral received from user ${sender.id}: ${referralText}`,
    );

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
    log.error(
      `[Instagram] Error handling referral from user ${sender.id}: %o`,
      error,
    );
  }
}

export async function handleInstagramMessageSeen(data: InstagramWebhookBody) {
  const messaginObj = data.entry[0].messaging[0];
  const { timestamp, read } = messaginObj;
  const seentime = new Date(timestamp).toISOString();
  await updateWaMessageByMessageId(read.mid, {
    stats: {
      read: seentime,
    },
  });
}

export async function handleInstagramMessageReaction(
  data: InstagramWebhookBody,
  waSettings,
) {
  const messaginObj = data.entry[0].messaging[0];
  const { sender } = messaginObj;
  const { orgId, ibaId } = waSettings;
  await handleWaMessages(
    "receive",
    messaginObj,
    sender.id,
    orgId,
    PlatformType.INSTAGRAM,
    ibaId,
  );
}

export async function getFbPages(settingsId) {
  const { accessToken } = await getWaSettingsById(settingsId);
  const res = await callMetaApi(
    `/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${accessToken}`,
    "GET",
  );
  return res.data.data.map((i) => ({
    fbPageId: i.id,
    ibaId: i.instagram_business_account.id,
    pageAccessToken: i.access_token,
    fbPageName: i.name,
  }));
}
