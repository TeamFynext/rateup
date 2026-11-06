import type { Prisma } from "../../../../generated/prisma/client.js";
import { PlatformType } from "../../../../generated/prisma/enums.js";
import { log } from "../../../utils/logger.js";
import { findHandoffCode, stripTextToken, textToken, whatsappText } from "./handoff.code.js";

/**
 * The inbound half of handoff links, called once by `handleWaMessages` for every stored
 * inbound message on every platform. Almost every message carries no token, and that case
 * is a regex over data already in memory: the service (Redis, Prisma, merge) is only loaded
 * once a token is found.
 *
 * Never throws: a broken handoff must not cost the customer's message, which is already
 * stored by the time this runs.
 */

interface StoredMessage {
  id: string;
  contactId: string | null;
  conversationId: string | null;
  messageBody: unknown;
}

/** `{ exchangeProcess, receive }` → the platform payload. */
function receivePart(body: unknown) {
  return body && typeof body === "object" ? (body as { receive?: unknown }).receive : undefined;
}

/** The stored body with the WhatsApp text replaced, or null when there is nothing to strip. */
function withStrippedText(body: unknown, code: string) {
  const text = whatsappText(receivePart(body));
  if (!text) return null;
  const stripped = stripTextToken(text, code);
  // A message that was only the token keeps it: an empty bubble says less than the code.
  if (!stripped || stripped === text) return null;
  const copy = structuredClone(body) as {
    receive: { messages: Array<{ text: { body: string } }> };
  };
  copy.receive.messages[0].text.body = stripped;
  return { body: copy, text: stripped };
}

/**
 * Takes the token out of what the inbox shows: the stored message, the contact's
 * last-message preview and a ticket subject the message gave. Runs before the merge, which
 * carries the last-message fields over.
 */
async function stripStoredToken(
  message: StoredMessage,
  contactId: string,
  code: string,
): Promise<unknown> {
  const next = withStrippedText(message.messageBody, code);
  if (!next) return message.messageBody;
  const { default: prisma } = await import("../../../utils/prisma.js");
  // Stored as it was read back: the same envelope, one string changed.
  const json = next.body as unknown as Prisma.InputJsonValue;
  const stored = next.body as unknown as WaInboxMessageBody;
  await prisma.waMessage.update({ where: { id: message.id }, data: { messageBody: stored } });
  await prisma.contact.updateMany({
    where: { id: contactId },
    data: { lastMessageBody: json },
  });
  if (message.conversationId) {
    const conversation = await prisma.conversation.findUnique({
      where: { id: message.conversationId },
      select: { subject: true },
    });
    if (conversation?.subject?.includes(textToken(code))) {
      await prisma.conversation.update({
        where: { id: message.conversationId },
        data: { subject: stripTextToken(conversation.subject, code) || null },
      });
    }
  }
  return next.body;
}

/**
 * Redeems a handoff code carried by an inbound message. Returns the message as it now
 * stands — token stripped, and filed under the contact that was kept when the sender's
 * contact was merged away — or null when the message carried no live code (the caller
 * then keeps its own copy).
 */
export async function linkHandoffFromMessage<M extends StoredMessage>(input: {
  orgId: string;
  platform: PlatformType;
  contactId: string;
  message: M;
}): Promise<M | null> {
  const { orgId, platform, contactId, message } = input;
  const code = findHandoffCode(platform, receivePart(message.messageBody));
  if (!code) return null;
  try {
    const { redeemHandoffCode } = await import("./handoff.service.js");
    let messageBody = message.messageBody;
    const outcome = await redeemHandoffCode({
      orgId,
      code,
      platform,
      contactId,
      onRedeemed:
        platform === PlatformType.WHATSAPP
          ? async () => {
              messageBody = await stripStoredToken(message, contactId, code);
            }
          : undefined,
    });
    if (outcome.status === "invalid_code" || outcome.status === "source_gone") {
      log.info({ orgId, platform, status: outcome.status }, "Handoff code not redeemed");
      return null;
    }
    return { ...message, messageBody, contactId: outcome.contactId };
  } catch (err) {
    log.error({ err, orgId, platform, messageId: message.id }, "Handoff link failed");
    return null;
  }
}
