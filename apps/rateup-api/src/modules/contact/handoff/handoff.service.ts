import { PlatformType } from "../../../../generated/prisma/enums.js";
import { log } from "../../../utils/logger.js";
import prisma from "../../../utils/prisma.js";
import redis from "../../../utils/redisConnection.js";
import { mergeContacts } from "../merge/merge.service.js";
import { newHandoffCode, refToken, textToken } from "./handoff.code.js";

/**
 * Signed handoff links (rateup/contact-identity-plan.md §4).
 *
 * Meta never tells us that an Instagram or Messenger user and a WhatsApp number are one
 * person. A Journey step proves it instead: it sends the customer a link to the other
 * channel carrying a short code bound to the contact it was sent to. When that code comes
 * back on the other channel, whoever sent it holds both accounts, so the two contacts are
 * merged — automatically (product decision 2026-11-05), the older contact kept.
 *
 * Codes live in Redis, one key per code, for 24 hours, and are consumed with GETDEL so two
 * replicas handling the same code can never both use it. The key carries the org, so a
 * code can only ever be redeemed inside the org that issued it.
 */

export const HANDOFF_TTL_SECONDS = 24 * 60 * 60;
const KEY_PREFIX = "contact:handoff";
/** How many merges to follow from a source contact that was itself merged away. */
const MAX_MERGE_HOPS = 5;

export type HandoffTargetPlatform =
  | typeof PlatformType.WHATSAPP
  | typeof PlatformType.INSTAGRAM
  | typeof PlatformType.FACEBOOK;

/** What a code is bound to. */
export interface HandoffClaim {
  orgId: string;
  /** The contact the link was sent to. */
  sourceContactId: string;
  /** The channel the link was sent on. */
  sourceChannelId: string | null;
  /** The channel the link opens, and the platform the code must come back on. */
  targetChannelId: string;
  targetPlatform: HandoffTargetPlatform;
  /** ISO time. Redis expires the key too; this is checked as well. */
  expiresAt: string;
}

function keyFor(orgId: string, code: string) {
  return `${KEY_PREFIX}:${orgId}:${code}`;
}

/**
 * Issues a fresh single-use code. Collisions are vanishingly rare (31^8 codes) but are
 * still refused by `SET NX` and retried rather than overwriting a live code.
 */
export async function issueHandoffCode(
  input: Omit<HandoffClaim, "expiresAt">,
  now: Date = new Date(),
): Promise<{ code: string; expiresAt: Date }> {
  const expiresAt = new Date(now.getTime() + HANDOFF_TTL_SECONDS * 1000);
  const claim: HandoffClaim = { ...input, expiresAt: expiresAt.toISOString() };
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = newHandoffCode();
    const stored = await redis.set(
      keyFor(input.orgId, code),
      JSON.stringify(claim),
      "EX",
      HANDOFF_TTL_SECONDS,
      "NX",
    );
    if (stored === "OK") return { code, expiresAt };
  }
  throw new Error("Could not issue a unique handoff code");
}

/**
 * Takes a code out of Redis — atomically, so it works once — and returns what it was bound
 * to. Null for an unknown, used, expired or malformed code.
 */
export async function consumeHandoffCode(
  orgId: string,
  code: string,
  now: Date = new Date(),
): Promise<HandoffClaim | null> {
  const raw = await redis.getdel(keyFor(orgId, code));
  if (!raw) return null;
  let claim: HandoffClaim;
  try {
    claim = JSON.parse(raw) as HandoffClaim;
  } catch {
    return null;
  }
  if (claim.orgId !== orgId || !claim.sourceContactId) return null;
  if (!(Date.parse(claim.expiresAt) > now.getTime())) return null;
  return claim;
}

/**
 * The link a customer taps. WhatsApp gets the code in the prefilled text; Instagram and
 * Messenger in the `ref` parameter, which Meta hands back on the referral webhook.
 */
export function buildHandoffLink(input: {
  platform: HandoffTargetPlatform;
  /** WhatsApp: the number (any spelling); Instagram: the handle; Messenger: the Page id. */
  address: string;
  code: string;
  /** WhatsApp only: the words the customer's message starts with. */
  prefill?: string;
}): string {
  switch (input.platform) {
    case PlatformType.WHATSAPP: {
      const digits = input.address.replace(/\D/g, "");
      const text = [input.prefill?.trim(), textToken(input.code)].filter(Boolean).join(" ");
      return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
    }
    case PlatformType.INSTAGRAM:
      return `https://ig.me/m/${encodeURIComponent(input.address.replace(/^@/, ""))}?ref=${refToken(input.code)}`;
    case PlatformType.FACEBOOK:
      return `https://m.me/${encodeURIComponent(input.address)}?ref=${refToken(input.code)}`;
  }
}

/**
 * The contact a code's source is now: itself, or — if it was merged away after the link
 * went out — the contact it was merged into.
 */
export async function resolveLiveContactId(orgId: string, contactId: string) {
  let current = contactId;
  for (let hop = 0; hop <= MAX_MERGE_HOPS; hop++) {
    const exists = await prisma.contact.findFirst({
      where: { id: current, orgId },
      select: { id: true },
    });
    if (exists) return current;
    const merge = await prisma.contactMerge.findFirst({
      where: { orgId, sourceContactId: current },
      orderBy: { createdAt: "desc" },
      select: { targetContactId: true },
    });
    if (!merge) return null;
    current = merge.targetContactId;
  }
  return null;
}

/**
 * Which way two contacts merge: the older one is kept. Identical timestamps fall back to
 * the id, so the decision is the same on every replica.
 */
export function pickMergeDirection(
  a: { id: string; createdAt: Date },
  b: { id: string; createdAt: Date },
): { sourceId: string; targetId: string } {
  const aFirst =
    a.createdAt.getTime() !== b.createdAt.getTime()
      ? a.createdAt.getTime() < b.createdAt.getTime()
      : a.id < b.id;
  return aFirst ? { sourceId: b.id, targetId: a.id } : { sourceId: a.id, targetId: b.id };
}

export type HandoffOutcome =
  /** No live code, or it was issued for another platform. Nothing changed. */
  | { status: "invalid_code" }
  /** The contact the link was sent to no longer exists. */
  | { status: "source_gone" }
  /** The code came back from the contact it was sent to (already linked). */
  | { status: "same_contact"; contactId: string }
  /** The two were merged; `contactId` is the one kept. */
  | { status: "merged"; contactId: string; mergedAwayId: string; mergeId: string };

/**
 * Redeems a code that arrived on `platform` from `contactId`, merging that contact with the
 * one the link was sent to. A brand-new contact (the usual case: their first WhatsApp
 * message) is always the newer one, so it is merged into the source contact and its phone /
 * BSUID, message and ticket move there. An existing different contact is merged the same
 * way, the older contact kept. The merge emits `contact_merged` to every open inbox.
 */
export async function redeemHandoffCode(input: {
  orgId: string;
  code: string;
  platform: PlatformType;
  contactId: string;
  /** Runs once the code is known good, before any merge (the inbound hook strips the token). */
  onRedeemed?: () => Promise<void>;
}): Promise<HandoffOutcome> {
  const { orgId, code, platform, contactId } = input;
  const claim = await consumeHandoffCode(orgId, code);
  if (!claim || claim.targetPlatform !== platform) return { status: "invalid_code" };

  const sourceId = await resolveLiveContactId(orgId, claim.sourceContactId);
  if (!sourceId) return { status: "source_gone" };
  await input.onRedeemed?.();
  if (sourceId === contactId) return { status: "same_contact", contactId };

  const pair = await prisma.contact.findMany({
    where: { orgId, id: { in: [sourceId, contactId] } },
    select: { id: true, createdAt: true },
  });
  if (pair.length !== 2) return { status: "source_gone" };
  const { sourceId: mergeSource, targetId } = pickMergeDirection(pair[0], pair[1]);
  const { mergeId } = await mergeContacts(orgId, mergeSource, targetId, {
    userId: null,
    reason: "HANDOFF",
  });
  log.info(
    { orgId, mergeId, kept: targetId, mergedAway: mergeSource, platform },
    "Handoff link merged two contacts",
  );
  return { status: "merged", contactId: targetId, mergedAwayId: mergeSource, mergeId };
}
