import type { Channel } from "../../../generated/prisma/client.js";
import type { PlatformType } from "../../../generated/prisma/enums.js";
import prisma from "../../utils/prisma.js";
import type { Actor } from "../../authz/actor.js";
import { getChannelScope } from "../whatsapp/settings/wa_channel_access.js";

/**
 * The channel registry: every connected channel of every platform — WhatsApp numbers,
 * Messenger Pages, Instagram accounts, and webchat and RCS as they arrive — one `Channel`
 * row each, any number per org.
 *
 * Code that only needs to know *which* channels exist, who may see them and what to call
 * them reads this module. Credentials and per-platform features stay in each platform's own
 * settings table (`WhatsappSettings`, `MetaChannelSettings`), reached through the row.
 */

/** What the dashboard and team pickers get: never a credential, those are not on the row. */
export type PublicChannel = Channel;

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
