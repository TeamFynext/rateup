import prisma from "../../../utils/prisma";
import { callWhatsappApi } from "../wa_axios";
import {
  getWaSettingsByIbaId,
  getWaSettingsById,
} from "../settings/wa_settings.service";
import { log } from "../../../utils/logger";
import {
  getOrCreateContactByIgsId,
  updateContactById,
} from "../../contact/contact.service";
import {
  addNewWaMessage,
  getWaMessageByMessageId,
  updateWaMessageByMessageId,
} from "../inbox/message/wamessage.service";
import { PlatformType } from "../../../../generated/prisma/enums";
import { getInstagramWebhookEvent } from "./instagram.util";
import { InstagramEvent, WaMessageAssignStatus } from "../../../types/enums";
import { WhatsappSettings } from "../../../../generated/prisma/client";
import { handleWaMessages } from "../inbox/message/wamessage.controller";

export async function getIgUserDetailsFromMeta(igsId, ibaId) {
  const { pageAccessToken } = await getWaSettingsByIbaId(ibaId);
  const url = `/${igsId}?fields=name,username,profile_pic,follower_count,is_verified_user,is_user_follow_business,is_business_follow_user&access_token=${pageAccessToken}`;
  const res = await callWhatsappApi(url, "GET");
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
      // console.log(`No instagram settings found for instagram business account id: ${data.entry[0].id}`)
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

// {
//   object: 'instagram',
//   entry: [
//     {
//       time: 1753704741836,
//       id: '17841476126718028',
//       messaging: [
//         {
//           sender: { id: '1741212203201498' },
//           recipient: { id: '17841476126718028' },
//           timestamp: 1753704740623,
//           read: {
//             mid: 'aWdfZAG1faXRlbToxOklHTWVzc2FnZAUlEOjE3ODQxNDc2MTI2NzE4MDI4OjM0MDI4MjM2Njg0MTcxMDMwMTI0NDI3NjAxNzgyOTQwNjYyNjYyMzozMjM1MDE0MjUxMTYxNTE1MTM5NDMyNjcxMDc5OTMwMjY1NgZDZD'
//           }
//         }
//       ]
//     }
//   ]
// }

export async function handleIgSendMessages(
  data: IgSendMessageBody,
  recipientId: string,
  messageId: string,
  waSettings: WhatsappSettings,
) {
  const contact = await getOrCreateContactByIgsId(
    recipientId,
    waSettings.orgId,
  );
  const messageBody = {
    send: data,
    receive: null,
    exchangeProcess: "send",
  } as WaInboxMessageBody;
  const newMessage = await addNewWaMessage(
    messageBody,
    contact.id,
    new Date().toISOString(),
    PlatformType.INSTAGRAM,
    waSettings.ibaId,
    {},
    messageId,
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
  // const reactedAt = new Date(timestamp).toISOString();
  // const reactionObj = {
  //   reaction: rest,
  //   ...restMessaging,
  //   reactedAt,
  // };
  // const message = await getWaMessageByMessageId(mid)
  // const { exchangeProcess, receive, send, ...restProps } = message.messageBody
  // if(exchangeProcess === "send"){
  //   send["reactionMessage"] = reactionObj
  // }else {
  //   receive["reactionMessage"] = reactionObj
  // }
  // const updateData = {
  //   ...restProps,
  //   exchangeProcess,
  //   send,
  //   receive
  // }
  await handleWaMessages(
    "receive",
    messaginObj,
    sender.id,
    orgId,
    PlatformType.INSTAGRAM,
    ibaId,
  );
  // await updateWaMessageByMessageId(mid, {  messageBody: updateData })
}

export async function sendInstagramMessage(
  recipientId: string,
  contactId: string,
  ibaId: string,
  message: IgSendMessageBody,
  sendBy: string,
) {
  const waSettings = await getWaSettingsByIbaId(ibaId);
  const url = `/me/messages?access_token=${waSettings.pageAccessToken}`;
  const data = {
    recipient: {
      id: recipientId,
    },
    message,
  };
  const res = await callWhatsappApi(url, "POST", null, data);
  const newMessage = await addNewWaMessage(
    {
      exchangeProcess: "receive",
      receive: null,
      send: message,
    },
    contactId,
    new Date().toISOString(),
    PlatformType.INSTAGRAM,
    ibaId,
    null,
    res.data.message_id,
    sendBy,
  );
}

export async function getFbPages(settingsId) {
  const { accessToken } = await getWaSettingsById(settingsId);
  const res = await callWhatsappApi(
    `/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${accessToken}`,
    "GET",
  );
  console.log(res);
  return res.data.data.map((i) => ({
    fbPageId: i.id,
    ibaId: i.instagram_business_account.id,
    pageAccessToken: i.access_token,
    fbPageName: i.name,
  }));
}
