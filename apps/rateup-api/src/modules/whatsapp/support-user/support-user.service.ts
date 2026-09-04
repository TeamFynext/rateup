import { log } from "../../../utils/logger.js";
import { PlatformType } from "../../../../generated/prisma/enums.js";
import { getSupportUserWebhookEvent } from "./support-user.util.js";
import { SupportUserEvent } from "../../../types/enums.js";
import { handleWaMessages } from "../inbox/message/wamessage.controller.js";
import { getContactByIdForWebhook } from "../../contact/contact.service.js";
import { WaMessageBody } from "../../../types/whatsapp.types.js";
import prisma from "../../../utils/prisma.js";
import { notificationQueue } from "../../../workers/bullmq/queues/index.js";
import { renderSupportWidgetEmail } from "../../../utils/email/react/templates.js";
import type { SupportEmailInput } from "./support-user.schema.js";

export async function handleSupportUserWebhook(data: WaMessageBody) {
  for (const entry of data.entry) {
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

/**
 * The Email tab of the embedded widget. The chat tabs post through the WhatsApp pipeline, which
 * is keyed on phone number and so has nowhere to put an email-only visitor — this delivers to
 * the org owner's inbox instead, queued the way the marketing contact form queues its own.
 *
 * Returns false when there is no address to deliver to, so the caller can say so rather than
 * reporting a send that never happened.
 */
export async function sendSupportEmail(input: SupportEmailInput, orgId: string) {
  if ((input.address?.length ?? 0) > 0) {
    return true;
  }

  const org = await prisma.org.findUnique({
    where: { id: orgId },
    select: { name: true, owner: { select: { email: true } } },
  });

  const to = org?.owner?.email;
  if (!to) {
    log.error({ orgId }, "Support widget email has no recipient: the org owner has no address");
    return false;
  }

  await notificationQueue.add("notification", {
    emailData: {
      to,
      subject: `New support message from ${input.name}`,
      text: `You have received a new support message from ${input.email}`,
      html: await renderSupportWidgetEmail({
        name: input.name,
        email: input.email,
        message: input.message,
        orgName: org?.name ?? undefined,
      }),
    },
  });

  return true;
}
