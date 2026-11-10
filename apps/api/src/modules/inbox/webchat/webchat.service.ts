import { log } from "../../../utils/logger.js";
import { ContactIdentityKind, PlatformType } from "../../../generated/prisma/enums.js";
import { currentContactId } from "../../contacts/merge/currentContact.js";
import { getSupportUserWebhookEvent } from "./webchat.util.js";
import { SupportUserEvent } from "../../../types/enums.js";
import { handleWaMessages } from "../message/wamessage.controller.js";
import { WaMessageBody } from "../../../types/whatsapp.types.js";
import prisma from "../../../utils/prisma.js";
import { notificationQueue } from "../../../workers/bullmq/queues/index.js";
import { renderSupportWidgetEmail } from "../../../utils/email/react/templates.js";
import type { SupportEmailInput } from "./webchat.schema.js";

/**
 * `orgId` is the org the widget key belongs to, never anything in the body: the key is
 * public (it ships in the customer's page), so a contact id from another org must not let
 * that key write into the other org's inbox.
 */
export async function handleSupportUserWebhook(data: WaMessageBody, orgId: string) {
  for (const entry of data.entry ?? []) {
    const contact = await getWidgetContact(entry.id, orgId);
    if (!contact) {
      log.warn({ orgId }, "Support widget message for a contact outside the key's org dropped");
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

/**
 * The contact a widget message belongs to, and the visitor id its messages are keyed on.
 * The widget keeps the contact id it was given; if that contact has since been merged into
 * another, the message goes to the one it was merged into. The visitor id comes from the
 * contact's WEBCHAT identity — after a merge the kept contact's `other` column is its own
 * (often empty), while the identity moved with the visitor.
 */
async function getWidgetContact(contactId: unknown, orgId: string) {
  if (typeof contactId !== "string" || !contactId) return null;
  const id = await currentContactId(orgId, contactId);
  if (!id) return null;
  const [contact, identity] = await Promise.all([
    prisma.contact.findFirst({ where: { id, orgId }, select: { orgId: true, other: true } }),
    prisma.contactIdentity.findFirst({
      where: { orgId, contactId: id, kind: ContactIdentityKind.WEBCHAT },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
      select: { value: true },
    }),
  ]);
  const visitorId = identity?.value ?? contact?.other;
  return contact && visitorId ? { orgId: contact.orgId, other: visitorId } : null;
}

type SupportUserChangeValue = WaMessageBody["entry"][number]["changes"][number]["value"];
type SupportUserContact = NonNullable<Awaited<ReturnType<typeof getWidgetContact>>>;

export async function handleSupportUserMessages(
  data: SupportUserChangeValue,
  contact: SupportUserContact,
) {
  const { orgId, other } = contact;
  await handleWaMessages("receive", data, other, orgId, PlatformType.WEBCHAT, undefined);
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
