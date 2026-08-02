import { log } from "../../../utils/logger.js";
import { PlatformType } from "../../../../generated/prisma/enums.js";
import { getSupportUserWebhookEvent } from "./support-user.util.js";
import { SupportUserEvent } from "../../../types/enums.js";
import { handleWaMessages } from "../inbox/message/wamessage.controller.js";
import { getContactByIdForWebhook } from "../../contact/contact.service.js";
import { WaMessageBody } from "../../../types/whatsapp.types.js";

export async function handleSupportUserWebhook(data: WaMessageBody) {
  for (const entry of data.entry) {
    // NOTE: `entry.id` is the Instagram business account id on every other
    // webhook in the codebase, and the log line below says so — but it is being
    // used here as a Contact primary key. That mismatch is recorded as
    // issues.txt 18.42 rather than changed blind; what is fixed here is only that
    // the lookup no longer goes through the now-org-scoped getContactById.
    const contact = await getContactByIdForWebhook(entry.id);
    if (!contact) {
      log.trace("No contact found for instagram business account id: %s", entry.id);
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

type SupportUserChangeValue = WaMessageBody["entry"][number]["changes"][number]["value"];
type SupportUserContact = NonNullable<Awaited<ReturnType<typeof getContactByIdForWebhook>>>;

export async function handleSupportUserMessages(
  data: SupportUserChangeValue,
  contact: SupportUserContact,
) {
  const { orgId, other } = contact;
  await handleWaMessages("receive", data, other!, orgId, PlatformType.WEBCHAT, undefined);
}
