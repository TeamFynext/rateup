import { log } from "../../../utils/logger";
import { PlatformType } from "../../../../generated/prisma/enums";
import { getSupportUserWebhookEvent } from "./support-user.util";
import { SupportUserEvent } from "../../../types/enums";
import { handleWaMessages } from "../inbox/message/wamessage.controller";
import { getContactById } from "../../contact/contact.service";
import { WaMessageBody } from "../../../types/whatsapp.types";

export async function handleSupportUserWebhook(data: WaMessageBody) {
  for (const entry of data.entry) {
    const contact = await getContactById(entry.id);
    if (!contact) {
      log.trace(
        "No contact found for instagram business account id: %s",
        entry.id,
      );
      continue;
    }
    for (const messages of entry.changes) {
      const event = getSupportUserWebhookEvent(messages);
      if (!event) {
        continue;
      }
      // TODO: Convert to switch and implement other features as required
      if (event === SupportUserEvent.MESSAGE) {
        await handleSupportUserMessages(messages.value, contact);
      } else {
        log.warn("Unhandled event: %s ", event);
      }
    }
  }
}

export async function handleSupportUserMessages(data, contact) {
  const { orgId, other } = contact;
  await handleWaMessages(
    "receive",
    data,
    other,
    orgId,
    PlatformType.WEBCHAT,
    undefined,
  );
}
