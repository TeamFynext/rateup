import { PlatformType } from "../../../generated/prisma/client.js";
import { WaTemplateStatus } from "../../../types/enums.js";
import { log } from "../../../utils/logger.js";
import prisma from "../../../utils/prisma.js";
import { findOpenSession } from "../../loyalty/messaging/channels/whatsapp/session.js";
import { parsePhoneforWa } from "../../loyalty/util.js";
import { sendTemplateToUserCore } from "../../whatsapp/messageTemplates/wa_templates.controller.js";
import { sendMetaMessage } from "../../whatsapp/meta/metaMessage.service.js";
import {
  createCTAButtonMessage,
  createDocumentMessage,
  createListMessage,
  createReplyButtonsMessage,
  createTextMessage,
} from "../../whatsapp/whatsappSurvey/wasurvey.utils.js";
import type { ShopNotificationEvent, ShopNotificationSettings } from "./shop.types.js";

/**
 * How a shop talks to a customer on the channel the order runs on. One message shape —
 * words plus at most one of: reply buttons, a link button, a list — rendered per channel.
 *
 * WhatsApp only takes free-form messages inside the 24-hour window the customer opened;
 * outside it the store's mapped template for that event is used, and without one the message
 * is not sent (and the caller logs that on the order, so staff can see why).
 */
export interface ShopMessage {
  text: string;
  buttons?: { id: string; title: string }[];
  cta?: { label: string; url: string };
  list?: { button: string; rows: { id: string; title: string; description?: string }[] };
  /** A file. WhatsApp sends it as a document with the text as caption; Instagram and
   *  Messenger get the text with a link button to it, since Instagram takes no files. */
  document?: { url: string; filename: string; label: string; linkUrl?: string };
  /** Body parameters for the event's WhatsApp template, in order. */
  templateParams?: string[];
}

export type SendOutcome =
  | { sent: true; channel: string; messageId?: string }
  | {
      sent: false;
      reason: "no_recipient" | "window_closed" | "disabled" | "failed";
      detail?: string;
    };

export interface ShopRecipient {
  orgId: string;
  channel: "WHATSAPP" | "INSTAGRAM" | "MESSENGER" | "STOREFRONT" | "MANUAL";
  /** The business account: WhatsApp phoneId, Instagram account id or Facebook page id. */
  channelAccountId?: string | null;
  contactId?: string | null;
  phone?: string | null;
}

async function resolveRecipient(r: ShopRecipient) {
  const contact = r.contactId
    ? await prisma.contact.findUnique({
        where: { id: r.contactId },
        select: { phone: true, igsId: true, psid: true, lastMessageSourceIdentifier: true },
      })
    : null;
  // The contact's own number wins: an order's phone can be typed by whoever holds its link.
  return {
    phone: contact?.phone ?? r.phone ?? null,
    igsId: contact?.igsId ?? null,
    psid: contact?.psid ?? null,
    lastSource: contact?.lastMessageSourceIdentifier ?? null,
  };
}

function whatsappPayload(to: string, m: ShopMessage): Record<string, unknown> {
  if (m.document) {
    return createDocumentMessage(
      to,
      m.document.url,
      m.document.filename,
      m.text,
      PlatformType.WHATSAPP,
    ) as unknown as Record<string, unknown>;
  }
  if (m.list) {
    return createListMessage(
      to,
      "",
      m.text,
      m.list.button,
      m.list.rows.map((row) => ({ id: row.id, value: row.title, description: row.description })),
    ) as unknown as Record<string, unknown>;
  }
  if (m.buttons?.length) {
    const payload = createReplyButtonsMessage(
      to,
      "",
      m.text,
      m.buttons.slice(0, 3).map((b) => ({ id: b.id, value: b.title.slice(0, 20) })),
    );
    // Meta rejects an empty text header, and the builder always writes one.
    delete (payload.interactive as { header?: unknown }).header;
    return payload as unknown as Record<string, unknown>;
  }
  if (m.cta) {
    return createCTAButtonMessage({
      to,
      body: m.text,
      buttonText: m.cta.label.slice(0, 20),
      url: m.cta.url,
    }) as unknown as Record<string, unknown>;
  }
  return createTextMessage(to, null, m.text) as unknown as Record<string, unknown>;
}

/** Instagram and Messenger share the Send API's shapes. */
function metaDmPayload(recipientId: string, m: ShopMessage): Record<string, unknown> {
  if (m.document) {
    return metaDmPayload(recipientId, {
      text: m.text,
      cta: { label: m.document.label, url: m.document.linkUrl ?? m.document.url },
    });
  }
  if (m.cta) {
    return {
      recipient: { id: recipientId },
      message: {
        attachment: {
          type: "template",
          payload: {
            template_type: "button",
            text: m.text.slice(0, 640),
            buttons: [{ type: "web_url", url: m.cta.url, title: m.cta.label.slice(0, 20) }],
          },
        },
      },
    };
  }
  const options = m.buttons ?? m.list?.rows.map((r) => ({ id: r.id, title: r.title })) ?? [];
  return {
    recipient: { id: recipientId },
    message: {
      text: m.text,
      ...(options.length
        ? {
            quick_replies: options.slice(0, 13).map((o) => ({
              content_type: "text",
              title: o.title.slice(0, 20),
              payload: o.id,
            })),
          }
        : {}),
    },
  };
}

async function sendWhatsapp(
  r: ShopRecipient,
  phone: string,
  m: ShopMessage,
  templateId: string | null | undefined,
): Promise<SendOutcome> {
  const to = parsePhoneforWa(phone);
  const session = await findOpenSession({ orgId: r.orgId, phone: to, phoneId: r.channelAccountId });
  if (session) {
    const result = await sendMetaMessage({
      platform: PlatformType.WHATSAPP,
      orgId: r.orgId,
      to,
      sourceIdentifier: session.phoneId ?? r.channelAccountId ?? undefined,
      payload: whatsappPayload(to, m),
      messageType: "AUTOMATED",
      isAutomated: true,
    });
    return result.ok
      ? { sent: true, channel: "WHATSAPP", messageId: result.messageId }
      : { sent: false, reason: "failed", detail: result.error };
  }
  if (!templateId) return { sent: false, reason: "window_closed" };
  const template = await prisma.waTemplate.findUnique({
    where: { id: templateId },
    select: { data: true },
  });
  const status = (template?.data as { status?: string } | null)?.status;
  if (status !== WaTemplateStatus.APPROVED)
    return { sent: false, reason: "window_closed", detail: "template not approved" };
  try {
    const result = await sendTemplateToUserCore(r.orgId, templateId, to, [
      {
        type: "body",
        parameters: (m.templateParams ?? []).map((text) => ({ type: "text", text: String(text) })),
      },
    ] as Parameters<typeof sendTemplateToUserCore>[3]);
    const refused =
      result &&
      typeof result === "object" &&
      "status" in result &&
      (result as { status?: unknown }).status === false;
    return refused
      ? { sent: false, reason: "failed", detail: "template send refused" }
      : { sent: true, channel: "WHATSAPP" };
  } catch (err) {
    return {
      sent: false,
      reason: "failed",
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function sendShopMessage(
  r: ShopRecipient,
  m: ShopMessage,
  templateId?: string | null,
): Promise<SendOutcome> {
  try {
    const who = await resolveRecipient(r);
    if (r.channel === "INSTAGRAM" && who.igsId) {
      const result = await sendMetaMessage({
        platform: PlatformType.INSTAGRAM,
        orgId: r.orgId,
        to: who.igsId,
        sourceIdentifier: r.channelAccountId ?? who.lastSource ?? undefined,
        payload: metaDmPayload(who.igsId, m),
        messageType: "AUTOMATED",
        isAutomated: true,
      });
      return result.ok
        ? { sent: true, channel: "INSTAGRAM", messageId: result.messageId }
        : { sent: false, reason: "failed", detail: result.error };
    }
    if (r.channel === "MESSENGER" && who.psid) {
      const result = await sendMetaMessage({
        platform: PlatformType.FACEBOOK,
        orgId: r.orgId,
        to: who.psid,
        sourceIdentifier: r.channelAccountId ?? who.lastSource ?? undefined,
        payload: metaDmPayload(who.psid, m),
        messageType: "AUTOMATED",
        isAutomated: true,
      });
      return result.ok
        ? { sent: true, channel: "MESSENGER", messageId: result.messageId }
        : { sent: false, reason: "failed", detail: result.error };
    }
    // WhatsApp orders, and storefront orders from a customer we can reach on WhatsApp.
    if (who.phone) return await sendWhatsapp(r, who.phone, m, templateId);
    return { sent: false, reason: "no_recipient" };
  } catch (err) {
    log.warn({ err, orgId: r.orgId }, "Shop message failed");
    return {
      sent: false,
      reason: "failed",
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}

export function notificationSetting(settings: unknown, event: ShopNotificationEvent) {
  const all = (settings ?? {}) as ShopNotificationSettings;
  const one = all[event] ?? {};
  return { enabled: one.enabled ?? true, waTemplateId: one.waTemplateId ?? null };
}
