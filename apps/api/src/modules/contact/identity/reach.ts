import { ContactIdentityKind, PlatformType } from "../../../generated/prisma/enums.js";
import prisma from "../../../utils/prisma.js";
import { isBsuid } from "../../whatsapp/bsuid.js";
import { legacyPhone } from "./identity.service.js";

/**
 * Which WhatsApp numbers can message a contact, and with which address.
 *
 * - A known phone number reaches the customer from any number, of any business.
 * - A business-scoped user ID (BSUID) reaches them only from numbers of the business
 *   portfolio that issued it. A merged contact can hold one BSUID per business, so the
 *   address depends on the sending number.
 * - A number whose portfolio is not known yet (not backfilled) is not refused — that is how
 *   sends behaved before portfolios were stored; Meta still has the last word.
 */
export type WaReach =
  | { reachable: true; address: string; via: "phone" | "bsuid" | "unknown_business" }
  | { reachable: false; reason: "NO_WHATSAPP" | "OTHER_BUSINESS" };

interface ContactAddresses {
  phone: string | null;
  /** BSUID → the portfolio it belongs to (null when unknown). */
  bsuids: { value: string; portfolioId: string | null }[];
}

async function contactAddresses(
  orgId: string,
  contactId: string,
): Promise<ContactAddresses | null> {
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, orgId },
    select: {
      phone: true,
      bsuid: true,
      igsId: true,
      psid: true,
      identities: {
        where: { kind: { in: [ContactIdentityKind.PHONE, ContactIdentityKind.WA_BSUID] } },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        select: {
          kind: true,
          value: true,
          channel: { select: { whatsapp: { select: { businessPortfolioId: true } } } },
        },
      },
    },
  });
  if (!contact) return null;
  const phoneIdentity = contact.identities.find((row) => row.kind === ContactIdentityKind.PHONE);
  // Not the column as is: Instagram/Messenger contacts can hold their platform id there.
  const phone = legacyPhone(contact) ?? phoneIdentity?.value ?? null;
  const bsuids = contact.identities
    .filter((row) => row.kind === ContactIdentityKind.WA_BSUID)
    .map((row) => ({
      value: row.value,
      portfolioId: row.channel?.whatsapp?.businessPortfolioId ?? null,
    }));
  const legacyBsuid =
    contact.bsuid ?? (contact.phone && isBsuid(contact.phone) ? contact.phone : null);
  if (legacyBsuid && !bsuids.some((row) => row.value === legacyBsuid)) {
    bsuids.push({ value: legacyBsuid, portfolioId: null });
  }
  return { phone, bsuids };
}

export function reachFor(addresses: ContactAddresses, channelPortfolioId: string | null): WaReach {
  if (addresses.phone) return { reachable: true, address: addresses.phone, via: "phone" };
  if (!addresses.bsuids.length) return { reachable: false, reason: "NO_WHATSAPP" };
  const same = channelPortfolioId
    ? addresses.bsuids.find((row) => row.portfolioId === channelPortfolioId)
    : undefined;
  if (same) return { reachable: true, address: same.value, via: "bsuid" };
  // Either side unknown: send as before and let Meta decide.
  const unknown =
    addresses.bsuids.find((row) => !row.portfolioId) ??
    (channelPortfolioId ? undefined : addresses.bsuids[0]);
  if (unknown) return { reachable: true, address: unknown.value, via: "unknown_business" };
  return { reachable: false, reason: "OTHER_BUSINESS" };
}

/** Reach for every WhatsApp number of the org — what the composer's number picker shows. */
export async function whatsappReachForContact(orgId: string, contactId: string) {
  const [addresses, channels] = await Promise.all([
    contactAddresses(orgId, contactId),
    prisma.channel.findMany({
      where: { orgId, platform: PlatformType.WHATSAPP },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        address: true,
        whatsapp: {
          select: {
            id: true,
            phoneId: true,
            businessPortfolioId: true,
            businessPortfolioName: true,
          },
        },
      },
    }),
  ]);
  if (!addresses) return null;
  return channels.map((channel) => ({
    channelId: channel.id,
    whatsappSettingsId: channel.whatsapp?.id ?? null,
    phoneId: channel.whatsapp?.phoneId ?? null,
    name: channel.name,
    channelAddress: channel.address,
    businessPortfolioId: channel.whatsapp?.businessPortfolioId ?? null,
    businessName: channel.whatsapp?.businessPortfolioName ?? null,
    ...reachFor(addresses, channel.whatsapp?.businessPortfolioId ?? null),
  }));
}

/**
 * The address to message a contact at from one WhatsApp number, or why it cannot be.
 * `phoneId` is the sending number's Meta phone number id — what send paths carry.
 */
export async function whatsappAddressFromNumber(
  orgId: string,
  contactId: string,
  phoneId: string,
): Promise<WaReach | null> {
  const [addresses, settings] = await Promise.all([
    contactAddresses(orgId, contactId),
    prisma.whatsappSettings.findFirst({
      where: { orgId, phoneId },
      select: { businessPortfolioId: true },
    }),
  ]);
  if (!addresses) return null;
  return reachFor(addresses, settings?.businessPortfolioId ?? null);
}

const SCOPED_KIND: Partial<Record<PlatformType, ContactIdentityKind>> = {
  [PlatformType.INSTAGRAM]: ContactIdentityKind.IG_SCOPED,
  [PlatformType.FACEBOOK]: ContactIdentityKind.FB_PSID,
};

/**
 * Instagram and Messenger ids are scoped to one account / Page, and a merged contact can
 * hold one per account. The id for the account `channelId` sends from, else the contact's
 * column (single-account contacts, and identities not recorded yet).
 */
export async function scopedAddressForChannel(
  orgId: string,
  contactId: string,
  platform: PlatformType,
  channelId: string | null,
  fallback: string | null,
): Promise<string | null> {
  const kind = SCOPED_KIND[platform];
  if (!kind || !channelId) return fallback;
  const row = await prisma.contactIdentity.findFirst({
    where: { orgId, contactId, kind, scope: channelId },
    select: { value: true },
  });
  return row?.value ?? fallback;
}
