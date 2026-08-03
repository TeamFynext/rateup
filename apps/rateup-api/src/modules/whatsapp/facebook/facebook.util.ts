import { FacebookEvent } from "../../../types/enums.js";
import { log } from "../../../utils/logger.js";

export function getFacebookWebhookEvent(
  messagingObject: FacebookWebhookBody["entry"][0]["messaging"][0],
): FacebookEvent | null {
  try {
    // Check specific message types first (before general message check)
    if (messagingObject.message?.is_echo) {
      return null; // Skip echoes
    }

    if (messagingObject.message?.quick_reply) {
      return FacebookEvent.QUICK_REPLY;
    }

    // Status updates should be checked before message
    if (messagingObject.delivery) {
      return FacebookEvent.MESSAGE_DELIVERED;
    }

    if (messagingObject.read) {
      return FacebookEvent.MESSAGE_READ;
    }

    // Reactions are a distinct event, as they are on Instagram. Without this branch a
    // reaction classified as null and was dropped entirely, so a customer reacting to a
    // message left no trace in the inbox — and the same gesture behaved differently on
    // Facebook and Instagram.
    if (messagingObject.reaction) {
      return FacebookEvent.MESSAGE_REACTION;
    }

    // Postback is checked BEFORE the general message check: below it, a payload carrying
    // both classified as a plain MESSAGE and the postback payload was lost.
    if (messagingObject.postback) {
      return FacebookEvent.POSTBACK;
    }

    // General message check (catch-all for regular messages)
    if (messagingObject.message) {
      return FacebookEvent.MESSAGE;
    }

    return null;
  } catch (error) {
    log.error({ err: error }, "Error determining Facebook event type");
    return null;
  }
}
