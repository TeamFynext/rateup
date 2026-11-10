import type { Channel } from "../../../generated/prisma/client.js";
import { PlatformType } from "../../../generated/prisma/enums.js";
import prisma from "../../../utils/prisma.js";
import { channelIdentifierSpellings } from "../../../utils/channelIdentifier.js";
import type { Actor } from "../../../authz/actor.js";
import { getChannelScope } from "../../meta/whatsapp/settings/channelAccess.js";

/**
 * The channel registry: every connected channel of every platform — WhatsApp numbers,
 * Messenger Pages, Instagram accounts, and webchat and RCS as they arrive — one `Channel`
 * row each, any number per org.
 *
 * Code that only needs to know *which* channels exist, who may see them and what to call
 * them reads this module. Credentials and per-platform features stay in each platform's own
 * settings table (`WhatsappSettings`, `MetaChannelSettings`), reached through the row.
 */

/**
 * What the dashboard and team pickers get: never a credential, those are not on the row.
 * WhatsApp numbers also carry their Meta business, so pickers can group by it.
 */
export type PublicChannel = Channel & {
  whatsapp: { businessPortfolioId: string | null; businessPortfolioName: string | null } | null;
};

/** The channels this actor's teams reach, oldest first, optionally of one platform. */
export async function getAccessibleChannels(
  actor: Actor,
  platform?: PlatformType | PlatformType[],
): Promise<PublicChannel[]> {
  const scope = await getChannelScope(actor);
  return prisma.channel.findMany({
    where: {
      orgId: actor.orgId,
      ...(platform && { platform: Array.isArray(platform) ? { in: platform } : platform }),
      ...(!scope.all && { id: { in: Array.from(scope.ids) } }),
    },
    orderBy: [{ platform: "asc" }, { createdAt: "asc" }],
    include: { whatsapp: { select: { businessPortfolioId: true, businessPortfolioName: true } } },
  });
}

export async function getChannelById(id: string, orgId: string) {
  return prisma.channel.findFirst({ where: { id, orgId } });
}

/** The org's channels whose ids are in `ids`; anything outside the org is dropped. */
export async function getOrgChannelIds(orgId: string, ids: string[]) {
  const rows = await prisma.channel.findMany({
    where: { orgId, id: { in: ids } },
    select: { id: true },
  });
  return rows.map((row) => row.id);
}

/**
 * The channel a message's `sourceIdentifier` names, or null when it matches none.
 *
 * Instagram, Messenger and webchat record the channel's own account id. WhatsApp records
 * the number, in any of its spellings, and a few paths pass the phone number id instead,
 * so both are tried. With no platform, every platform is tried — the account ids of
 * different platforms never collide with a phone number.
 */
export async function resolveChannelId(
  orgId: string,
  platform: PlatformType | null | undefined,
  sourceIdentifier: string | null | undefined,
): Promise<string | null> {
  if (!sourceIdentifier) return null;
  if (platform !== PlatformType.WHATSAPP) {
    const byAccount = await prisma.channel.findFirst({
      where: {
        orgId,
        accountId: sourceIdentifier,
        platform: platform ?? { not: PlatformType.WHATSAPP },
      },
      select: { id: true },
    });
    if (byAccount || platform) return byAccount?.id ?? null;
  }
  const numbers = await prisma.channel.findMany({
    where: { orgId, platform: PlatformType.WHATSAPP },
    select: { id: true, address: true, accountId: true },
  });
  const match = numbers.find(
    (channel) =>
      channel.accountId === sourceIdentifier ||
      channelIdentifierSpellings(channel.address).includes(sourceIdentifier),
  );
  return match?.id ?? null;
}

/**
 * The value the inbox's channel filter uses for the website chat widget. Webchat is not a
 * connected account with a Channel row — it is the widget, keyed by an API key — so it has
 * no id of its own to filter on.
 */
export const WEBCHAT_FILTER = "webchat";

/**
 * Whether the inbox should offer Webchat as a channel: the org has had webchat visitors,
 * and the viewer reaches every channel (webchat tickets carry no channel a team could be
 * scoped to, so a scoped member never sees them).
 */
export async function isWebchatInUse(actor: Actor): Promise<boolean> {
  const scope = await getChannelScope(actor);
  if (!scope.all) return false;
  const visitor = await prisma.contact.findFirst({
    where: { orgId: actor.orgId, source: PlatformType.WEBCHAT },
    select: { id: true },
  });
  return Boolean(visitor);
}
