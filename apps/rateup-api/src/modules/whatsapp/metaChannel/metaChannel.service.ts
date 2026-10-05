import { Channel, MetaChannelSettings, Prisma } from "../../../../generated/prisma/client.js";
import { PlatformType } from "../../../../generated/prisma/enums.js";
import prisma from "../../../utils/prisma.js";
import { log } from "../../../utils/logger.js";
import type { Actor } from "../../../authz/actor.js";
import { callMetaApi } from "../wa_axios.js";
import { getChannelScope } from "../settings/wa_channel_access.js";
import { decryptInlineToken, encryptInlineToken } from "../settings/wa_settings.service.js";

/**
 * Messenger Pages and Instagram accounts, one row per channel and any number of each per org.
 *
 * Each is connected through its own Facebook Login for Business flow and never reads
 * anything from a WhatsApp channel or from the other platform, so an org can run Instagram
 * alone, add Messenger later, or drop WhatsApp without losing either.
 */

export type MetaChannelPlatform = typeof PlatformType.FACEBOOK | typeof PlatformType.INSTAGRAM;

export const META_CHANNEL_PLATFORMS = [PlatformType.FACEBOOK, PlatformType.INSTAGRAM] as const;

/**
 * Page webhook fields. Instagram messaging needs the linked Page subscribed too; its own
 * Messenger events are then dropped unless the Page is also a Messenger channel.
 */
export const PAGE_SUBSCRIBED_FIELDS = [
  "messages",
  "messaging_postbacks",
  "message_reads",
  "message_reactions",
];

type ChannelWithMeta = Channel & { meta: MetaChannelSettings | null };

/**
 * A Messenger or Instagram channel as callers use it: the registry row with its Meta
 * settings flattened on, tokens decrypted. `id` is the Channel id.
 */
export type DecryptedMetaChannel = Channel &
  Omit<MetaChannelSettings, "channelId" | "pageAccessToken" | "accessToken"> & {
    pageAccessToken: string;
    accessToken: string | null;
  };

/** What leaves the API: the registry row plus the Page it sends through, never a token. */
export type PublicMetaChannel = Channel & { fbPageId: string; pageName: string | null };

function flatten(row: ChannelWithMeta | null): DecryptedMetaChannel | null {
  // A Meta-platform channel always has its settings; one without is half-written.
  if (!row?.meta) return null;
  const { meta, ...channel } = row;
  const { channelId: _channelId, pageAccessToken, accessToken, ...settings } = meta;
  return {
    ...channel,
    ...settings,
    pageAccessToken: decryptInlineToken(pageAccessToken) ?? "",
    accessToken: decryptInlineToken(accessToken),
  };
}

/** For a row just written with its settings, which cannot be missing them. */
function requireFlattened(row: ChannelWithMeta): DecryptedMetaChannel {
  const channel = flatten(row);
  if (!channel) throw new Error(`Meta channel ${row.id} was written without its settings`);
  return channel;
}

export function toPublicMetaChannel(channel: DecryptedMetaChannel): PublicMetaChannel {
  const {
    pageAccessToken: _page,
    accessToken: _user,
    appId: _appId,
    instagramIceBreakers: _iceBreakers,
    instagramPersistentMenu: _menu,
    ...safe
  } = channel;
  return safe;
}

function jsonOrDbNull<T>(value: T | null | undefined): T | typeof Prisma.DbNull | undefined {
  return value === null ? Prisma.DbNull : value;
}

async function findChannel(platform: MetaChannelPlatform, accountId: string, orgId?: string) {
  const row = await prisma.channel.findFirst({
    where: { platform, accountId, ...(orgId && { orgId }) },
    include: { meta: true },
  });
  return flatten(row);
}

/**
 * The Instagram channel for an Instagram account id. `orgId`, when the caller has one,
 * keeps a send from ever going out on another org's account.
 */
export function getInstagramChannel(ibaId: string, orgId?: string) {
  return findChannel(PlatformType.INSTAGRAM, ibaId, orgId);
}

/**
 * The Messenger channel for a Page id. A Page that is only there because an Instagram
 * account is linked to it is not a Messenger channel, so it is not returned here.
 */
export function getMessengerChannel(fbPageId: string, orgId?: string) {
  return findChannel(PlatformType.FACEBOOK, fbPageId, orgId);
}

/** A Messenger or Instagram channel by its Channel id; null for any other platform. */
export async function getMetaChannelById(id: string, orgId: string) {
  const row = await prisma.channel.findFirst({
    where: { id, orgId, platform: { in: [...META_CHANNEL_PLATFORMS] } },
    include: { meta: true },
  });
  return flatten(row);
}

/** The Messenger/Instagram channels this actor's teams reach, with the Page they send through. */
export async function getAccessibleMetaChannels(actor: Actor, platform?: MetaChannelPlatform) {
  const scope = await getChannelScope(actor);
  const rows = await prisma.channel.findMany({
    where: {
      orgId: actor.orgId,
      platform: platform ?? { in: [...META_CHANNEL_PLATFORMS] },
      ...(!scope.all && { id: { in: Array.from(scope.ids) } }),
    },
    include: { meta: true },
    orderBy: [{ platform: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(flatten).filter((channel): channel is DecryptedMetaChannel => channel !== null);
}

/** Updates the registry row and the Meta settings in one go; returns the flattened channel. */
export async function updateMetaChannelById(
  id: string,
  orgId: string,
  data: Partial<
    Pick<Channel, "name" | "username" | "status"> &
      Pick<MetaChannelSettings, "instagramIceBreakers" | "instagramPersistentMenu">
  >,
) {
  const { instagramIceBreakers, instagramPersistentMenu, ...channelData } = data;
  // Only a Messenger or Instagram channel has Meta settings to update.
  const row = await prisma.channel.update({
    where: { id, orgId, platform: { in: [...META_CHANNEL_PLATFORMS] } },
    data: {
      ...channelData,
      meta: {
        update: {
          instagramIceBreakers: jsonOrDbNull(instagramIceBreakers),
          instagramPersistentMenu: jsonOrDbNull(instagramPersistentMenu),
        },
      },
    },
    include: { meta: true },
  });
  return flatten(row);
}

/** Deletes a Messenger or Instagram channel; its settings and team grants go with it. */
export async function deleteMetaChannel(id: string, orgId: string) {
  // The Page is deliberately left subscribed to the app: the other platform or lead ads
  // may still use that subscription, and an unknown account's webhooks are dropped anyway.
  return prisma.channel.deleteMany({
    where: { id, orgId, platform: { in: [...META_CHANNEL_PLATFORMS] } },
  });
}

export async function subscribePageToApp(pageId: string, pageAccessToken: string) {
  await callMetaApi(
    `/${pageId}/subscribed_apps?subscribed_fields=${PAGE_SUBSCRIBED_FIELDS.join(",")}`,
    "POST",
    pageAccessToken,
  );
}

export interface InstagramAccountProfile {
  id: string;
  username?: string;
  name?: string;
  profile_picture_url?: string;
}

/**
 * Best effort: a token without instagram_basic cannot read the profile, which costs the
 * name and picture but must not fail the connection.
 */
export async function getInstagramAccountProfile(
  ibaId: string,
  accessToken: string,
): Promise<InstagramAccountProfile> {
  try {
    const res = await callMetaApi(
      `/${ibaId}?fields=username,name,profile_picture_url`,
      "GET",
      accessToken,
    );
    return {
      id: ibaId,
      username: res.data?.username,
      name: res.data?.name,
      profile_picture_url: res.data?.profile_picture_url,
    };
  } catch (err) {
    log.warn({ err, ibaId }, "Could not read Instagram profile");
    return { id: ibaId };
  }
}

export class MetaChannelConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MetaChannelConflictError";
  }
}

export interface ConnectMetaChannelInput {
  platform: MetaChannelPlatform;
  /** Page id for Messenger, Instagram account id for Instagram. */
  accountId: string;
  fbPageId: string;
  name?: string | null;
  username?: string | null;
  pageName?: string | null;
  pageAccessToken: string;
  /** Token of the login that granted the channel. */
  accessToken?: string | null;
  appId?: string | null;
}

/**
 * Connects (or reconnects) one Messenger Page or one Instagram account. Reconnecting the
 * same account updates its row in place, so its ice breakers, menu and team grants survive.
 */
export async function connectMetaChannel(
  orgId: string,
  input: ConnectMetaChannelInput,
): Promise<DecryptedMetaChannel> {
  const { platform, accountId } = input;
  const conflict = new MetaChannelConflictError(
    platform === PlatformType.INSTAGRAM
      ? "This Instagram account is already connected to another organization"
      : "This Facebook Page is already connected to another organization",
  );

  const existing = await prisma.channel.findUnique({
    where: { platform_accountId: { platform, accountId } },
    select: { id: true, orgId: true },
  });
  if (existing && existing.orgId !== orgId) throw conflict;

  await subscribePageToApp(input.fbPageId, input.pageAccessToken);

  const channelData = {
    name: input.name ?? null,
    username: input.username ?? null,
    status: "ACTIVE",
  };
  const settings = {
    fbPageId: input.fbPageId,
    pageName: input.pageName ?? null,
    pageAccessToken: encryptInlineToken(input.pageAccessToken),
    // Keep the stored login token when this connection did not come with a new one.
    ...(input.accessToken && { accessToken: encryptInlineToken(input.accessToken) }),
    appId: input.appId ?? process.env.wa_app_id ?? null,
  };

  // A reconnect writes only this org's own row (by id and org), so ice breakers, menu and
  // team grants survive and no other org's channel can ever be written.
  if (existing) {
    const row = await prisma.channel.update({
      where: { id: existing.id, orgId },
      data: {
        ...channelData,
        meta: { upsert: { create: settings, update: settings } },
      },
      include: { meta: true },
    });
    return requireFlattened(row);
  }

  // A new channel. If another org connects the same account between the check above and
  // here, the unique (platform, accountId) index refuses this create.
  try {
    const row = await prisma.channel.create({
      data: { orgId, platform, accountId, ...channelData, meta: { create: settings } },
      include: { meta: true },
    });
    return requireFlattened(row);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw conflict;
    }
    throw error;
  }
}
