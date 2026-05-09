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

    // General message check (catch-all for regular messages)
    if (messagingObject.message) {
      return FacebookEvent.MESSAGE;
    }

    // Other event types
    if (messagingObject.postback) {
      return FacebookEvent.POSTBACK;
    }

    return null;
  } catch (error) {
    log.error("Error determining Facebook event type: %o", error);
    return null;
  }
}
