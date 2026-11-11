import { ContactIdentityKind, PlatformType } from "../../../generated/prisma/enums.js";
import { log } from "../../../utils/logger.js";
import prisma from "../../../utils/prisma.js";
import { resolveChannelId } from "../../settings/channels/channel.service.js";
import { sendInstagramPrivateReply } from "../../meta/instagram/instagram_messaging.service.js";
import {
  sendSendApiGenericTemplate,
  type MetaFlowChannel,
} from "../../meta/shared/sendApiMessages.js";
import { getOrCreateContactByIgsId, getOrCreateContactByPsid } from "../contact.service.js";
import { findContactIdByIdentity } from "../identity/identity.service.js";
import { buildHandoffLink, issueHandoffCode } from "./handoff.service.js";

/**
 * The "Continue on WhatsApp" Journey step (`continueOnWhatsappNode`), for Instagram and
 * Messenger journeys: issues a handoff code for the contact and sends a card whose button
 * opens a chat with the chosen WhatsApp number, the code prefilled. When the customer sends
 * that message, the WhatsApp inbound hook links (merges) the two contacts.
 *
 * Builder data: `{ channelId, body, buttonLabel, prefill }` — `channelId` is the WhatsApp
 * number's `Channel` row. Saving one on a WhatsApp journey is refused (`chatbotBlocks.ts`).
 */

export const CONTINUE_ON_WHATSAPP_NODE = "continueOnWhatsappNode";

/** Meta's limits on a generic-template card: title 80, button title 20. */
const TITLE_MAX = 80;
const BUTTON_MAX = 20;
const DEFAULT_BODY = "Tap below to continue this chat on WhatsApp.";
const DEFAULT_BUTTON = "Open WhatsApp";
const DEFAULT_PREFILL = "Hi! I'd like to continue our chat here.";

export interface ContinueOnWhatsappData {
  channelId?: string;
  /** Plain text; the card title. */
  body?: string;
  buttonLabel?: string;
  prefill?: string;
}

function clip(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

async function sourceContactId(orgId: string, recipientId: string, channel: MetaFlowChannel) {
  const kind =
    channel.platform === PlatformType.INSTAGRAM
      ? ContactIdentityKind.IG_SCOPED
      : ContactIdentityKind.FB_PSID;
  const known = await findContactIdByIdentity(orgId, kind, recipientId);
  if (known) return known;
  const result =
    channel.platform === PlatformType.INSTAGRAM
      ? await getOrCreateContactByIgsId(recipientId, orgId)
      : await getOrCreateContactByPsid(recipientId, orgId);
  return result?.contact?.id ?? null;
}

/**
 * Runs the step. Returns whether a message went out. A step that cannot run (no number
 * picked, the number disconnected) is skipped with a warning so the journey carries on;
 * a send Meta refuses throws, stopping the journey at this step like any other send.
 */
export async function runContinueOnWhatsappStep(input: {
  data: ContinueOnWhatsappData | undefined;
  recipientId: string;
  orgId: string;
  channel: MetaFlowChannel;
  /** Instagram: the comment being answered privately. A private reply is text only. */
  commentId?: string;
}): Promise<boolean> {
  const { data, orgId, channel, commentId } = input;
  // A Messenger comment names the person only once the first reply reaches them.
  if (channel.pendingComment && !channel.pendingComment.recipientId) {
    log.warn({ orgId }, "Continue on WhatsApp step skipped: replying to a comment");
    return false;
  }
  const recipientId = channel.pendingComment?.recipientId ?? input.recipientId;

  const target = data?.channelId
    ? await prisma.channel.findFirst({
        where: { id: data.channelId, orgId, platform: PlatformType.WHATSAPP },
        select: { id: true, address: true },
      })
    : null;
  if (!target?.address) {
    log.warn({ orgId, channelId: data?.channelId }, "Continue on WhatsApp step has no number");
    return false;
  }
  const contactId = await sourceContactId(orgId, recipientId, channel);
  if (!contactId) {
    log.warn({ orgId, recipientId }, "Continue on WhatsApp step found no contact");
    return false;
  }

  const { code } = await issueHandoffCode({
    orgId,
    sourceContactId: contactId,
    sourceChannelId: await resolveChannelId(orgId, channel.platform, channel.accountId),
    targetChannelId: target.id,
    targetPlatform: PlatformType.WHATSAPP,
  });
  const url = buildHandoffLink({
    platform: PlatformType.WHATSAPP,
    address: target.address,
    code,
    prefill: data?.prefill?.trim() || DEFAULT_PREFILL,
  });
  const body = data?.body?.trim() || DEFAULT_BODY;

  if (commentId && channel.platform === PlatformType.INSTAGRAM) {
    await sendInstagramPrivateReply(
      commentId,
      `${body}\n${url}`,
      channel.accountId,
      orgId,
      recipientId,
    );
    return true;
  }
  await sendSendApiGenericTemplate(channel, recipientId, orgId, [
    {
      title: clip(body, TITLE_MAX),
      buttons: [
        {
          type: "web_url",
          title: clip(data?.buttonLabel?.trim() || DEFAULT_BUTTON, BUTTON_MAX),
          url,
        },
      ],
    },
  ]);
  return true;
}
