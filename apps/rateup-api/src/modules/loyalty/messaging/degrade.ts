import type { ChannelCapabilities, LoyaltyMessage } from "./types.js";

function joinText(...parts: (string | null | undefined)[]): string {
  return parts.filter((part) => part && part.trim()).join("\n\n");
}

/**
 * The message reshaped to what a channel can show, or null when it cannot carry it at all.
 *
 * Choices become numbered or named replies and links become plain URLs, so a channel with
 * only text still says everything. Reading those replies back is the channel's inbound
 * handler's job. A flow has no text form, so a channel without flows cannot send one.
 */
export function fitToChannel(
  message: LoyaltyMessage,
  caps: ChannelCapabilities,
): LoyaltyMessage | null {
  const parts = message.parts;
  if (!parts) return message;
  if (parts.flow && !caps.flow) return null;

  let text = message.text;
  const kept: NonNullable<LoyaltyMessage["parts"]> = { ...parts };

  if (parts.list) {
    const fits =
      caps.list &&
      parts.list.rows.length <= caps.list.maxRows &&
      parts.list.rows.every((row) => row.title.length <= caps.list!.titleMax);
    if (!fits) {
      const lines = parts.list.rows.map((row, index) => `${index + 1}. ${row.title}`);
      text = joinText(text, lines.join("\n"), "Reply with the number of your choice.");
      delete kept.list;
    }
  }

  if (parts.buttons) {
    const fits =
      caps.replyButtons &&
      parts.buttons.length <= caps.replyButtons.max &&
      parts.buttons.every((button) => button.title.length <= caps.replyButtons!.titleMax);
    if (!fits) {
      const titles = parts.buttons.map((button) => button.title.toUpperCase());
      text = joinText(text, `Reply ${titles.join(" or ")}.`);
      delete kept.buttons;
    }
  }

  if (parts.cta && !caps.ctaUrl) {
    text = joinText(text, `${parts.cta.label}: ${parts.cta.url}`);
    delete kept.cta;
  }

  if (parts.image && !caps.image) {
    text = joinText(text, parts.image.url);
    delete kept.image;
  }

  if (text && text.length > caps.maxTextLength) text = text.slice(0, caps.maxTextLength);

  return { ...message, text, parts: Object.keys(kept).length > 0 ? kept : undefined };
}
