import prisma from "../../../utils/prisma.js";
import { parsePhoneforWa } from "../util.js";
import type { LoyaltyRecipient } from "./types.js";

export type RecipientRef =
  | { accountId: string }
  | { contactId: string; name?: string | null }
  | { phone: string; name?: string | null };

const contactSelect = { id: true, name: true, phone: true, email: true } as const;

/**
 * Who a message is for, with every address the channels might use and the member's own
 * channel choice. A phone that matches no contact still makes a recipient: a customer
 * the business has only a number for can be answered on it.
 */
export async function resolveRecipient(
  orgId: string,
  ref: RecipientRef,
): Promise<LoyaltyRecipient | null> {
  if ("accountId" in ref) {
    const account = await prisma.customerLoyaltyAccount.findUnique({
      where: { id: ref.accountId },
      select: { id: true, preferredChannel: true, contact: { select: contactSelect } },
    });
    if (!account) return null;
    return {
      orgId,
      contactId: account.contact.id,
      accountId: account.id,
      name: account.contact.name,
      phone: account.contact.phone,
      email: account.contact.email,
      preferredChannel: account.preferredChannel,
    };
  }

  const contact =
    "contactId" in ref
      ? await prisma.contact.findUnique({
          where: { id: ref.contactId },
          select: {
            ...contactSelect,
            loyaltyAccounts: { select: { id: true, preferredChannel: true }, take: 1 },
          },
        })
      : await prisma.contact.findUnique({
          where: { contact_phone_org_id_unique: { phone: parsePhoneforWa(ref.phone), orgId } },
          select: {
            ...contactSelect,
            loyaltyAccounts: { select: { id: true, preferredChannel: true }, take: 1 },
          },
        });

  const account = contact?.loyaltyAccounts[0];
  return {
    orgId,
    contactId: contact?.id ?? null,
    accountId: account?.id ?? null,
    name: ref.name ?? contact?.name ?? null,
    phone: contact?.phone ?? ("phone" in ref ? parsePhoneforWa(ref.phone) : null),
    email: contact?.email ?? null,
    preferredChannel: account?.preferredChannel ?? null,
  };
}
