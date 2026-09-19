import { PlatformType } from "../../../../../../generated/prisma/client.js";
import {
  createCTAButtonMessage,
  createListMessage,
  createReplyButtonsMessage,
  createReplyImageMessage,
  createTextMessage,
} from "../../../../whatsapp/whatsappSurvey/wasurvey.utils.js";
import type { LoyaltyMessage } from "../../types.js";

/** The one WhatsApp payload a session message becomes, from its richest part down. */
export function sessionPayload(to: string, message: LoyaltyMessage): Record<string, unknown> {
  return buildPayload(to, message) as unknown as Record<string, unknown>;
}

function buildPayload(to: string, message: LoyaltyMessage): object {
  const text = message.text ?? "";
  const parts = message.parts ?? {};

  if (parts.image) {
    return createReplyImageMessage(to, parts.image.url, PlatformType.WHATSAPP, text || undefined);
  }
  if (parts.list) {
    return createListMessage(
      to,
      parts.title ?? "",
      text,
      parts.list.button,
      parts.list.rows.map((row) => ({ id: row.id, value: row.title })),
    );
  }
  if (parts.buttons) {
    const payload = createReplyButtonsMessage(
      to,
      parts.title ?? "",
      text,
      parts.buttons.map((button) => ({ id: button.id, value: button.title })),
    );
    // Meta rejects an empty text header, and the builder always writes one.
    if (!parts.title) delete (payload.interactive as { header?: unknown }).header;
    return payload;
  }
  if (parts.cta) {
    return createCTAButtonMessage({
      to,
      body: text,
      buttonText: parts.cta.label,
      url: parts.cta.url,
    });
  }
  return createTextMessage(to, null, text);
}
