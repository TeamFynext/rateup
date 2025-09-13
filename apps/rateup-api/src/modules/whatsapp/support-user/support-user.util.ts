import { SupportUserEvent } from "../../../types/enums";
import { WaMessageBody } from "../../../types/whatsapp.types";

export function getSupportUserWebhookEvent(
  data: WaMessageBody["entry"][0]["changes"][0],
) {
  if (data.field === "messages") {
    return SupportUserEvent.MESSAGE;
  }
  // TODO: Implement reaction and read events
  //  else if (data.reaction) {
  //   return SupportUserEvent.MESSAGE_REACTION;
  // } else if (data.read) {
  //   return SupportUserEvent.MESSAGE_SEEN;
  // }
  return null;
}
