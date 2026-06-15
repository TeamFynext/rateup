import { InstagramEvent } from "../../../types/enums.js";

export function getInstagramWebhookEvent(
  data: InstagramWebhookBody["entry"][0]["messaging"][0],
) {
  if (data.postback) {
    return InstagramEvent.POSTBACK;
  }

  if (data.message?.referral) {
    return InstagramEvent.REFERRAL;
  }

  if (data.message) {
    const storyMention = data.message.attachments?.some(
      (attachment) => attachment.type === "story_mention",
    );

    if (storyMention) {
      return InstagramEvent.STORY_MENTION;
    }

    return InstagramEvent.MESSAGE;
  } else if (data.reaction) {
    return InstagramEvent.MESSAGE_REACTION;
  } else if (data.read) {
    return InstagramEvent.MESSAGE_SEEN;
  }
  return null;
}
