import { InstagramEvent } from "../../../types/enums.js";
import { log } from "../../../utils/logger.js";

export function getInstagramWebhookEvent(
  data: InstagramWebhookBody["entry"][0]["messaging"][0],
): InstagramEvent | null {
  try {
    // Echoes are the business's own outbound messages coming back through the
    // webhook. Dropped here rather than in each handler: only two of the five
    // message handlers repeated the check, so a reaction or a postback the
    // business itself produced was stored as inbound customer activity.
    // getFacebookWebhookEvent does the same. See issues.txt 12.6.
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

      // A referral is only its OWN event when it arrived with nothing else. The
      // referral check used to come first unconditionally, so a customer who
      // tapped a click-to-message ad and typed in the same event was routed to
      // handleInstagramReferral — which stores no text — and the first message
      // of a paid-acquisition conversation reached the inbox as a bare referral
      // marker. Classified as a MESSAGE, the whole messaging object is stored,
      // so message.referral survives alongside the text. See issues.txt 12.5.
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
