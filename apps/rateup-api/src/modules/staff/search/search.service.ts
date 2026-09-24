import prisma from "../../../utils/prisma.js";
import { channelsMatchingDigits, usersMatchingDigits } from "../staff.lookup.js";
import { asPhoneDigits, asUuid } from "../staff.schema.js";

/** The header palette shows this many per group; the list pages are for more. */
export const SEARCH_GROUP_SIZE = 5;

/**
 * One query from the ⌘K palette, answered in three groups. A pasted id is matched exactly
 * (an org or a user), digits look up WhatsApp numbers, WABA ids and users' phones, and
 * anything else is a case-insensitive substring of names and emails.
 */
export async function globalSearch(q: string) {
  const id = asUuid(q);
  const digits = asPhoneDigits(q);
  const text = { contains: q, mode: "insensitive" as const };
  const take = SEARCH_GROUP_SIZE;

  const [channelHits, phoneUserIds] = digits
    ? await Promise.all([channelsMatchingDigits(digits, take), usersMatchingDigits(digits, take)])
    : [[], []];

  const [orgs, users, phones] = await Promise.all([
    prisma.org.findMany({
      where: id
        ? { id }
        : {
            OR: [
              { name: text },
              { owner: { OR: [{ email: text }, { name: text }] } },
              ...(channelHits.length ? [{ id: { in: channelHits.map((c) => c.orgId) } }] : []),
            ],
          },
      take,
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        logo: true,
        owner: { select: { email: true } },
        Subscription: {
          select: { basePlan: { select: { name: true, displayName: true } } },
        },
      },
    }),
    prisma.user.findMany({
      where: id
        ? { id }
        : {
            OR: [
              { email: text },
              { name: text },
              ...(phoneUserIds.length ? [{ id: { in: phoneUserIds } }] : []),
            ],
          },
      take,
      orderBy: { email: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        profilePhoto: true,
        orgMember: {
          take: 3,
          orderBy: { createdAt: "asc" },
          select: { org: { select: { id: true, name: true } } },
        },
      },
    }),
    channelHits.length
      ? prisma.whatsappSettings.findMany({
          where: { id: { in: channelHits.map((c) => c.id) } },
          select: {
            id: true,
            phone: true,
            phoneDisplayName: true,
            wabaId: true,
            type: true,
            org: { select: { id: true, name: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  return {
    orgs: orgs.map((org) => ({
      id: org.id,
      name: org.name,
      logo: org.logo,
      ownerEmail: org.owner.email,
      plan: org.Subscription?.basePlan
        ? (org.Subscription.basePlan.displayName ?? org.Subscription.basePlan.name)
        : null,
    })),
    users: users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.profilePhoto,
      orgs: user.orgMember.map((member) => member.org),
    })),
    phones: phones.map((channel) => ({
      id: channel.id,
      phone: channel.phone,
      displayName: channel.phoneDisplayName,
      wabaId: channel.wabaId,
      type: channel.type,
      org: channel.org,
    })),
  };
}
