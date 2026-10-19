import type { AdReferral } from "../../../../generated/prisma/client.js";
import prisma from "../../../utils/prisma.js";
import redis from "../../../utils/redisConnection.js";
import type { WaReferral } from "../../../types/whatsapp.types.js";
import type { ShopAttribution } from "./shop.types.js";

/**
 * Click-to-WhatsApp ad attribution. A sale counts towards the last ad the contact clicked in
 * the week before it, the window Meta's Conversions API accepts a click id for. The free
 * messaging window an ad opens is shorter, 72 hours.
 */
export const AD_ATTRIBUTION_DAYS = 7;
const FREE_WINDOW_HOURS = 72;
const DAY_MS = 24 * 3_600_000;

/** Keeps a click; Meta sends its referral on the first message after the click and never again. */
export async function rememberAdReferral(
  orgId: string,
  contactId: string,
  referral: WaReferral,
  at: { conversationId?: string | null; phoneId?: string | null } = {},
) {
  if (!referral.source_id) return null;
  return prisma.adReferral.create({
    data: {
      orgId,
      contactId,
      conversationId: at.conversationId ?? null,
      phoneId: at.phoneId ?? null,
      sourceId: referral.source_id,
      sourceType: referral.source_type ?? "ad",
      sourceUrl: referral.source_url ?? null,
      headline: referral.headline ?? null,
      body: referral.body ?? null,
      mediaType: referral.media_type ?? null,
      mediaUrl: referral.image_url ?? referral.thumbnail_url ?? referral.video_url ?? null,
      ctwaClid: referral.ctwa_clid ?? null,
    },
  });
}

export function adClickAttribution(click: AdReferral): ShopAttribution {
  return {
    kind: "ctwa_ad",
    adId: click.sourceId,
    adTitle: click.headline ?? undefined,
    sourceUrl: click.sourceUrl ?? undefined,
    ctwaClid: click.ctwaClid ?? undefined,
    clickedAt: click.createdAt.toISOString(),
    freeWindowUntil: new Date(
      click.createdAt.getTime() + FREE_WINDOW_HOURS * 3_600_000,
    ).toISOString(),
  };
}

/** The ad behind a sale made at `at`: the contact's latest ad click in the window before it. */
export async function adAttribution(
  orgId: string,
  contactId: string,
  at = new Date(),
): Promise<ShopAttribution | null> {
  const click = await prisma.adReferral.findFirst({
    where: {
      orgId,
      contactId,
      sourceType: "ad",
      createdAt: { gte: new Date(at.getTime() - AD_ATTRIBUTION_DAYS * DAY_MS), lte: at },
    },
    orderBy: { createdAt: "desc" },
  });
  return click ? adClickAttribution(click) : null;
}

/**
 * A sale started from an Instagram comment or story. The commenter often buys days later from
 * a DM, so the source is kept for a week and read wherever a chat order begins.
 */
const SOCIAL_WINDOW_SECONDS = 7 * 24 * 3600;
const socialKey = (orgId: string, contactId: string) => `shop:social:${orgId}:${contactId}`;

export async function rememberSocialSource(
  orgId: string,
  contactId: string,
  source: {
    kind: "ig_comment" | "ig_story";
    mediaId?: string;
    commentId?: string;
    ruleId?: string;
  },
) {
  await redis.set(socialKey(orgId, contactId), JSON.stringify(source), "EX", SOCIAL_WINDOW_SECONDS);
}

/** What brought a contact to a chat order: an ad click wins over a comment, as the paid touch. */
export async function chatAttribution(
  orgId: string,
  contactId: string,
): Promise<ShopAttribution | null> {
  const ad = await adAttribution(orgId, contactId);
  if (ad) return ad;
  const raw = await redis.get(socialKey(orgId, contactId));
  return raw ? (JSON.parse(raw) as ShopAttribution) : null;
}
