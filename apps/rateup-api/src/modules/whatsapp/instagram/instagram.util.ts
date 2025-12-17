import { InstagramEvent } from "../../../types/enums.js";

export function getInstagramWebhookEvent(
  data: InstagramWebhookBody["entry"][0]["messaging"][0],
) {
  if (data.message) {
    return InstagramEvent.MESSAGE;
  } else if (data.reaction) {
    return InstagramEvent.MESSAGE_REACTION;
  } else if (data.read) {
    return InstagramEvent.MESSAGE_SEEN;
  }
  return null;
}
