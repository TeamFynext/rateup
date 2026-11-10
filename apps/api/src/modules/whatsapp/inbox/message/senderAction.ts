import { PlatformType } from "../../../../generated/prisma/client.js";
import prisma from "../../../../utils/prisma.js";
import { contactFields, primaryIdentities } from "../../../contact/identity/contactFields.js";
import { callMetaApi } from "../../wa_axios.js";
import { getWaSettings, getWaSettingsByPhone } from "../../settings/wa_settings.service.js";
import { getInstagramChannel, getMessengerChannel } from "../../metaChannel/metaChannel.service.js";

/**
 * What the customer's app is told about the agent:
 * - `read`: blue ticks on WhatsApp, "Seen" on Instagram/Messenger.
 * - `typing_on`: the "typing…" bubble. WhatsApp clears it after 25 s or on our
 *   reply; Messenger/Instagram keep it until `typing_off` or a reply.
 * - `typing_off`: Messenger/Instagram only. WhatsApp has no way to hide it early.
 */
export type SenderAction = "read" | "typing_on" | "typing_off";

/** Channels whose customers see a receipt or a typing bubble. WEBCHAT and INTERNAL have no upstream. */
export const SENDER_ACTION_PLATFORMS = [
  PlatformType.WHATSAPP,
  PlatformType.INSTAGRAM,
  PlatformType.FACEBOOK,
];

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * How old the customer's last message may be. Meta refuses a read receipt after
 * 30 days. Typing only makes sense inside the 24 h customer-service window,
 * because outside it the agent cannot send a free-form reply anyway.
 */
const MAX_AGE_MS: Record<SenderAction, number> = {
  read: 30 * DAY_MS,
  typing_on: DAY_MS,
  typing_off: DAY_MS,
};

const META_SENDER_ACTION: Record<SenderAction, string> = {
  read: "mark_seen",
  typing_on: "typing_on",
  typing_off: "typing_off",
};

/**
 * Sends a sender action for the contact's newest inbound message.
 *
 * The channel comes from that message, so a multi-number org answers on the
 * number the customer wrote to. `orgId` keeps it inside the caller's org.
 *
 * Returns whether anything was sent to Meta.
 */
export async function sendSenderAction(
  contactId: string,
  action: SenderAction,
  opts: { orgId?: string } = {},
): Promise<boolean> {
  const latest = await prisma.waMessage.findFirst({
    where: {
      contactId,
      ...(opts.orgId && { contact: { orgId: opts.orgId } }),
      sourcePlatform: { in: SENDER_ACTION_PLATFORMS },
      messageBody: { path: ["exchangeProcess"], equals: "receive" },
      waCreatedAt: { gte: new Date(Date.now() - MAX_AGE_MS[action]) },
    },
    orderBy: { waCreatedAt: "desc" },
    select: {
      messageId: true,
      sourceIdentifier: true,
      sourcePlatform: true,
      contact: { select: { orgId: true, ...primaryIdentities } },
    },
  });

  const orgId = latest?.contact?.orgId;
  if (!latest || !orgId || !latest.sourceIdentifier) return false;

  if (latest.sourcePlatform === PlatformType.WHATSAPP) {
    // WhatsApp cannot hide the bubble early; our reply or the 25 s timeout does.
    if (action === "typing_off") return false;
    // Addressed by message id, and only WhatsApp needs one.
    if (!latest.messageId) return false;
    // Inbound messages carry the business number they arrived on; resolve the
    // channel from that so a multi-number org acknowledges on the right one.
    const channel = await getWaSettingsByPhone(latest.sourceIdentifier);
    const waSettings = await getWaSettings(orgId, channel?.phoneId ?? undefined);
    if (!waSettings?.phoneId) return false;

    // The typing indicator rides on a read receipt: the same call marks the
    // message read and shows the bubble.
    await callMetaApi(`/${waSettings.phoneId}/messages`, "POST", waSettings.accessToken, {
      messaging_product: "whatsapp",
      status: "read",
      message_id: latest.messageId,
      ...(action === "typing_on" && { typing_indicator: { type: "text" } }),
    });
    return true;
  }

  // Instagram and Messenger share one Send API shape: a sender action addressed
  // to the person, with no message id. Meta requires the request to carry
  // nothing but `recipient` and `sender_action`.
  const isInstagram = latest.sourcePlatform === PlatformType.INSTAGRAM;
  const settings = isInstagram
    ? await getInstagramChannel(latest.sourceIdentifier, orgId)
    : await getMessengerChannel(latest.sourceIdentifier, orgId);
  const accessToken = settings?.pageAccessToken;
  // Instagram threads key off the IGSID, Messenger off the page-scoped id.
  const ids = contactFields(latest.contact?.identities);
  const recipientId = isInstagram ? ids.igsId : ids.psid;
  if (!accessToken || !recipientId) return false;

  const body = { recipient: { id: recipientId }, sender_action: META_SENDER_ACTION[action] };
  // Instagram takes the token as a query parameter, Messenger as a bearer —
  // the same split `sendMessage` makes for outbound messages on these channels.
  await (isInstagram
    ? callMetaApi("/me/messages", "POST", undefined, body, {
        params: { access_token: accessToken },
      })
    : callMetaApi("/me/messages", "POST", accessToken, body));
  return true;
}
