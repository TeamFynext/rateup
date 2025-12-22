import prisma from "../../../utils/prisma.js";
import { callWhatsappApi } from "../wa_axios.js";
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

export async function getIgUserDetailsFromMeta(igsId, ibaId) {
  const { pageAccessToken } = await getWaSettingsByIbaId(ibaId);
  const url = `/${igsId}?fields=name,username,profile_pic,follower_count,is_verified_user,is_user_follow_business,is_business_follow_user&access_token=${pageAccessToken}`;
  const res = await callWhatsappApi(url, "GET");
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
    for (const messaging of entry.messaging) {
      const event = getInstagramWebhookEvent(messaging);
      if (!event) {
        continue;
      }
      switch (event) {
        case InstagramEvent.MESSAGE:
          await handleInstagramMessages(data, waSettings);
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

export async function handleInstagramMessages(
  data: InstagramWebhookBody,
  waSettings,
) {
  const { orgId, ibaId } = waSettings;
  const { sender, message } = data.entry[0].messaging[0];
  const { mid } = message;
  if (message.is_echo) return;
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
}

export async function handleInstagramMessageSeen(data: InstagramWebhookBody) {
  const messaginObj = data.entry[0].messaging[0];
  const { timestamp, read } = messaginObj;
  const seentime = new Date(timestamp).toISOString();
  await updateWaMessageByMessageId(read.mid, {
    stats: { sent: "", failed: "", delivered: "", read: seentime },
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
  const res = await callWhatsappApi(
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
