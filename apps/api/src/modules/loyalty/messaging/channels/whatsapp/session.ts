import dayjs from "dayjs";

import { channelDigits } from "../../../../../utils/channelIdentifier.js";
import prisma from "../../../../../utils/prisma.js";
import { parsePhoneforWa } from "../../../util.js";

/** Meta's window is 24 h from the customer's last message; keep a margin for clock skew. */
export const SESSION_WINDOW_MINUTES = 24 * 60 - 10;

const withinWindow = (at: Date) => dayjs().diff(at, "minute") < SESSION_WINDOW_MINUTES;

/** Both spellings a business number may be stored under on a message. */
function spellings(phone: string): string[] {
  return [...new Set([phone, channelDigits(phone)].filter(Boolean))];
}

/**
 * The customer's open 24-hour window, and the number it is open on — or null.
 *
 * With `phoneId` the window must be on that number: a message to another of the org's
 * numbers opens nothing here. Without one, any number counts, and the answer names the
 * number they last wrote to so a reply can leave from it. "Never heard from them" is
 * closed: a customer registered at the till has no window.
 */
export async function findOpenSession(input: {
  orgId: string;
  phone: string;
  phoneId?: string | null;
}): Promise<{ phoneId: string | null } | null> {
  const phone = parsePhoneforWa(input.phone);
  if (!phone) return null;

  const contact = await prisma.contact.findUnique({
    where: { contact_phone_org_id_unique: { phone, orgId: input.orgId } },
    select: { id: true, lastReceivedMessageTimeStamp: true },
  });
  if (!contact?.lastReceivedMessageTimeStamp) return null;

  if (input.phoneId) {
    const channel = await prisma.whatsappSettings.findFirst({
      where: { phoneId: input.phoneId },
      select: { phone: true },
    });
    if (channel?.phone) {
      const latest = await prisma.waMessage.findFirst({
        where: {
          contactId: contact.id,
          sourceIdentifier: { in: spellings(channel.phone) },
          messageBody: { path: ["exchangeProcess"], equals: "receive" },
        },
        orderBy: { waCreatedAt: "desc" },
        select: { waCreatedAt: true, createdAt: true },
      });
      if (!latest) return null;
      return withinWindow(latest.waCreatedAt ?? latest.createdAt)
        ? { phoneId: input.phoneId }
        : null;
    }
    return withinWindow(contact.lastReceivedMessageTimeStamp) ? { phoneId: input.phoneId } : null;
  }

  if (!withinWindow(contact.lastReceivedMessageTimeStamp)) return null;

  const latest = await prisma.waMessage.findFirst({
    where: {
      contactId: contact.id,
      messageBody: { path: ["exchangeProcess"], equals: "receive" },
    },
    orderBy: { waCreatedAt: "desc" },
    select: { sourceIdentifier: true },
  });
  const wroteTo = channelDigits(latest?.sourceIdentifier);
  if (!wroteTo) return { phoneId: null };

  const numbers = await prisma.whatsappSettings.findMany({
    where: { orgId: input.orgId, phoneId: { not: null } },
    select: { phone: true, phoneId: true },
  });
  const match = numbers.find((number) => channelDigits(number.phone) === wroteTo);
  return { phoneId: match?.phoneId ?? null };
}

/** Whether the customer has an open window — on `whatsappSettingsPhoneId` when given. */
export async function isCustomerSessionOpen(input: {
  orgId: string;
  phone: string;
  whatsappSettingsPhoneId?: string | null;
}): Promise<boolean> {
  return (
    (await findOpenSession({
      orgId: input.orgId,
      phone: input.phone,
      phoneId: input.whatsappSettingsPhoneId,
    })) !== null
  );
}
