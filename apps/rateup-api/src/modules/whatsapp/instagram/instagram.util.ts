import { InstagramEvent } from "../../../types/enums.js";
import { log } from "../../../utils/logger.js";

export function getInstagramWebhookEvent(
  data: InstagramWebhookBody["entry"][0]["messaging"][0],
): InstagramEvent | null {
  try {
    if (data.message?.is_echo) {
      return null;
    }

    if (data.postback) {
      return InstagramEvent.POSTBACK;
    }

    if (data.message) {
      const storyMention = data.message.attachments?.some(
        (attachment) => attachment.type === "story_mention",
      );

      if (storyMention) {
        return InstagramEvent.STORY_MENTION;
      }

      const carriesContent = Boolean(
        data.message.text || data.message.attachments?.length || data.message.quick_reply,
      );
      if (data.message.referral && !carriesContent) {
        return InstagramEvent.REFERRAL;
      }

      return InstagramEvent.MESSAGE;
    }

    if (data.reaction) {
      return InstagramEvent.MESSAGE_REACTION;
    }

    if (data.read) {
      return InstagramEvent.MESSAGE_SEEN;
    }

    return null;
  } catch (error) {
    log.error({ err: error }, "Error determining Instagram event type");
    return null;
  }
}
