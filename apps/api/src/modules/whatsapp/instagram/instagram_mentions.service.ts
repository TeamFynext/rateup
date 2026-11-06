/**
 * Loyalty points for Instagram mentions.
 *
 * A customer who tags the business earns the points set on the programme's "Mention us on
 * Instagram" earning rule (`earningRules/triggerRules.ts`). Each mention is one
 * `InstagramMention` row, unique per (org, kind, source id), so a redelivered webhook is a
 * no-op. A row starts PENDING and ends:
 *
 * - AWARDED — the author is a member, the rule covers the kind and no cooldown applies;
 * - SKIPPED — no active rule covers it, or the member earned for a mention too recently;
 * - EXPIRED — still PENDING after 7 days (author never linked to a contact or never joined).
 *
 * Expiry is lazy: every entry point first expires the org's stale rows (one indexed UPDATE),
 * so there is no scheduled job.
 *
 * Who wrote the mention: a story mention arrives as a DM, so its igsId is known. A caption
 * or comment mention only names a username, matched against `Contact.whatsappUserName`
 * (which holds the Instagram username for Instagram contacts). An unmatched username stays
 * PENDING until `linkPendingInstagramMentions` is called for a contact that DMs us later.
 *
 * Notifying: the loyalty messaging layer has no Instagram channel (only WhatsApp is an
 * adapter), so the thank-you goes through `sendLoyaltyEvent` first and, when that cannot
 * reach the member (no phone, window closed, no template), falls back to a plain Instagram
 * DM with the same words. That DM only lands inside Instagram's 24-hour window, which a
 * story mention opens; for a caption mention it is best effort.
 */

import {
  InstagramMentionKind,
  InstagramMentionStatus,
  type InstagramMention,
} from "../../../generated/prisma/client.js";
import { LoyaltyEventType } from "../../../types/enums.js";
import { log } from "../../../utils/logger.js";
import prisma from "../../../utils/prisma.js";
import {
  findInstagramMentionRule,
  toInstagramMentionConfig,
} from "../../loyalty/earningRules/triggerRules.js";
import { creditInstagramMention } from "../../loyalty/instagramMentions/mentionPoints.js";
import { eventVars, LOYALTY_EVENT_CATALOG } from "../../loyalty/messaging/catalog.js";
import { fillPlaceholders } from "../../loyalty/messaging/render.js";
import { loadProgramForSend, sendLoyaltyEvent } from "../../loyalty/messaging/send.js";
import type { LoyaltySkipReason } from "../../loyalty/messaging/types.js";
import { getInstagramChannel } from "../metaChannel/metaChannel.service.js";
import { callMetaApi, GraphApiError } from "../wa_axios.js";
import { sendInstagramTextMessage } from "./instagram_messaging.service.js";

/** The `mentions` webhook change value: a caption mention, or a comment on some media. */
export interface InstagramMentionValue {
  media_id?: string;
  comment_id?: string;
}

/** A PENDING mention older than this is EXPIRED. */
export const MENTION_PENDING_DAYS = 7;
/** A mention made before the author joined still pays if they join within this window. */
export const MENTION_JOIN_WINDOW_HOURS = 24;

const DAY_MS = 24 * 60 * 60 * 1000;

/** The router refused before sending anything: worth trying the Instagram DM instead. */
const DM_FALLBACK_REASONS = new Set<LoyaltySkipReason>([
  "no_phone",
  "no_channel",
  "no_template",
  "template_not_approved",
  "session_closed",
  "unsupported",
]);

function normaliseUsername(username: string | null | undefined): string | null {
  const trimmed = username?.trim().replace(/^@/, "").toLowerCase();
  return trimmed ? trimmed : null;
}

function isUniqueViolation(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { code?: string }).code === "P2002";
}

function joinLink(orgId: string, mentionId: string): string {
  const base = (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/+$/, "");
  return `${base}/loyalty/${encodeURIComponent(orgId)}/register?ig=${encodeURIComponent(mentionId)}`;
}

/* ── expiry ─────────────────────────────────────────────────────────────────── */

export async function expireStaleInstagramMentions(orgId: string, now = new Date()) {
  const { count } = await prisma.instagramMention.updateMany({
    where: {
      orgId,
      status: InstagramMentionStatus.PENDING,
      createdAt: { lt: new Date(now.getTime() - MENTION_PENDING_DAYS * DAY_MS) },
    },
    data: { status: InstagramMentionStatus.EXPIRED, resolvedAt: now, reason: "expired" },
  });
  return count;
}

/* ── Graph lookups ──────────────────────────────────────────────────────────── */

interface MentionDetails {
  username: string | null;
  mediaId: string | null;
}

function logGraphFailure(e: unknown, what: string, ctx: Record<string, unknown>) {
  if (e instanceof GraphApiError) {
    // Meta documents these fields for a User token; a Page token may lack the right.
    log.warn(
      { ...ctx, graphError: e.error },
      `[Instagram mentions] Could not read the ${what} (needs instagram_basic, instagram_manage_comments, pages_read_engagement on the Page token)`,
    );
  } else {
    log.warn({ ...ctx, err: e }, `[Instagram mentions] Could not read the ${what}`);
  }
}

async function fetchMentionDetails(
  kind: InstagramMentionKind,
  value: InstagramMentionValue,
  settings: { orgId: string; ibaId: string },
): Promise<MentionDetails> {
  const empty: MentionDetails = { username: null, mediaId: value.media_id ?? null };
  const channel = await getInstagramChannel(settings.ibaId, settings.orgId);
  if (!channel?.pageAccessToken) {
    log.warn({ ...settings }, "[Instagram mentions] No Instagram channel or Page token");
    return empty;
  }
  const token = channel.pageAccessToken;
  const ctx = { orgId: settings.orgId, ibaId: settings.ibaId, ...value };

  if (kind === InstagramMentionKind.MEDIA && value.media_id) {
    try {
      const res = await callMetaApi(
        `/${settings.ibaId}`,
        "GET",
        token,
        undefined,
        {},
        {},
        {
          fields: `mentioned_media.media_id(${value.media_id}){caption,media_type,media_url,timestamp,username,comments_count,like_count}`,
        },
      );
      const media = res.data?.mentioned_media as { username?: string; id?: string } | undefined;
      return { username: media?.username ?? null, mediaId: media?.id ?? value.media_id };
    } catch (e) {
      logGraphFailure(e, "mentioned media", ctx);
      return empty;
    }
  }

  if (kind === InstagramMentionKind.COMMENT && value.comment_id) {
    let mediaId = value.media_id ?? null;
    try {
      const res = await callMetaApi(
        `/${settings.ibaId}`,
        "GET",
        token,
        undefined,
        {},
        {},
        {
          fields: `mentioned_comment.comment_id(${value.comment_id}){id,text,timestamp,like_count,media{id,media_url}}`,
        },
      );
      const comment = res.data?.mentioned_comment as { media?: { id?: string } } | undefined;
      mediaId = comment?.media?.id ?? mediaId;
    } catch (e) {
      // Also what Meta answers when comments are disabled on the media.
      logGraphFailure(e, "mentioned comment", ctx);
    }
    // `mentioned_comment` carries no author. The comment node's `username` is a separate,
    // best-effort read: it may be refused for a comment on someone else's media.
    try {
      const res = await callMetaApi(
        `/${value.comment_id}`,
        "GET",
        token,
        undefined,
        {},
        {},
        { fields: "username" },
      );
      return { username: (res.data?.username as string | undefined) ?? null, mediaId };
    } catch (e) {
      logGraphFailure(e, "comment author", ctx);
      return { username: null, mediaId };
    }
  }

  return empty;
}

async function findContactByUsername(orgId: string, username: string) {
  return await prisma.contact.findFirst({
    where: {
      orgId,
      igsId: { not: null },
      whatsappUserName: { equals: username, mode: "insensitive" },
    },
    select: { id: true, igsId: true },
    orderBy: { createdAt: "desc" },
  });
}

/* ── resolving one mention ──────────────────────────────────────────────────── */

export type MentionResolution =
  | "awarded"
  | "skipped"
  | "expired"
  | "unlinked"
  | "not_member"
  | "already_resolved";

async function markSkipped(mention: InstagramMention, reason: string) {
  await prisma.instagramMention.updateMany({
    where: { id: mention.id, status: InstagramMentionStatus.PENDING },
    data: { status: InstagramMentionStatus.SKIPPED, reason, resolvedAt: new Date() },
  });
}

/**
 * Award one PENDING mention if it can be. Leaves it PENDING when the author is not known
 * or not a member yet; never throws for a business outcome.
 */
export async function resolveInstagramMention(
  mention: InstagramMention,
  options: { now?: Date; notify?: boolean } = {},
): Promise<MentionResolution> {
  const now = options.now ?? new Date();
  if (mention.status !== InstagramMentionStatus.PENDING) return "already_resolved";

  if (mention.createdAt.getTime() < now.getTime() - MENTION_PENDING_DAYS * DAY_MS) {
    await prisma.instagramMention.updateMany({
      where: { id: mention.id, status: InstagramMentionStatus.PENDING },
      data: { status: InstagramMentionStatus.EXPIRED, reason: "expired", resolvedAt: now },
    });
    return "expired";
  }

  const program = await prisma.loyaltyProgram.findUnique({
    where: { orgId: mention.orgId },
    select: { id: true, status: true },
  });
  if (!program || program.status !== "active") {
    await markSkipped(mention, "no_program");
    return "skipped";
  }
  const ruleRow = await findInstagramMentionRule(program.id);
  const rule = toInstagramMentionConfig(ruleRow);
  if (
    !ruleRow ||
    !rule.enabled ||
    rule.pointsPerMention <= 0 ||
    !rule.mentionKinds.includes(mention.kind)
  ) {
    await markSkipped(mention, "no_rule");
    return "skipped";
  }

  if (!mention.contactId) return "unlinked";

  const account = await prisma.customerLoyaltyAccount.findUnique({
    where: { programId_contactId: { programId: program.id, contactId: mention.contactId } },
    select: { id: true, status: true, contactId: true },
  });
  if (!account || account.status !== "active") return "not_member";

  if (rule.cooldownDays > 0) {
    const recent = await prisma.instagramMention.findFirst({
      where: {
        orgId: mention.orgId,
        contactId: account.contactId,
        status: InstagramMentionStatus.AWARDED,
        resolvedAt: { gte: new Date(now.getTime() - rule.cooldownDays * DAY_MS) },
        id: { not: mention.id },
      },
      select: { id: true },
    });
    if (recent) {
      await markSkipped(mention, `cooldown:${rule.cooldownDays}d`);
      return "skipped";
    }
  }

  // Claim the row before crediting, so two deliveries racing on it award once.
  const claimed = await prisma.instagramMention.updateMany({
    where: { id: mention.id, status: InstagramMentionStatus.PENDING },
    data: {
      status: InstagramMentionStatus.AWARDED,
      points: rule.pointsPerMention,
      resolvedAt: now,
      reason: null,
    },
  });
  if (claimed.count === 0) return "already_resolved";

  let credit;
  try {
    credit = await creditInstagramMention({
      programId: program.id,
      orgId: mention.orgId,
      accountId: account.id,
      earningRuleId: ruleRow.id,
      points: rule.pointsPerMention,
      kind: mention.kind,
      sourceId: mention.sourceId,
      mentionId: mention.id,
      permalink: mention.permalink,
    });
  } catch (e) {
    // Hand the row back so a later link or join can try again.
    await prisma.instagramMention.updateMany({
      where: { id: mention.id, status: InstagramMentionStatus.AWARDED, transactionId: null },
      data: { status: InstagramMentionStatus.PENDING, points: null, resolvedAt: null },
    });
    throw e;
  }

  await prisma.instagramMention.update({
    where: { id: mention.id },
    data: { transactionId: credit.transactionId, points: credit.points },
  });

  if (options.notify !== false && !credit.replayed) {
    await notifyMentionReward(mention, account.id, credit.points, credit.balance);
  }
  return "awarded";
}

/** The event's words for a channel the messaging layer cannot reach: null when switched off. */
async function mentionRewardText(
  orgId: string,
  data: { name: string; points: number; balance: number },
): Promise<string | null> {
  const program = await loadProgramForSend(orgId);
  if (!program || program.status !== "active" || !program.whatsappNotifications) return null;
  if (!program.pointsActivityAlerts) return null;
  const event = LoyaltyEventType.INSTAGRAM_MENTION_REWARDED;
  const definition = LOYALTY_EVENT_CATALOG[event];
  const trigger = await prisma.loyaltyEventTrigger.findUnique({
    where: { programId_eventType: { programId: program.id, eventType: event } },
    select: { enabled: true, body: true },
  });
  const on = trigger ? trigger.enabled : definition.defaultOn === true;
  if (!on) return null;
  const body = trigger?.body ?? definition.defaultBody;
  const text = fillPlaceholders(body, eventVars(event, data)).trim();
  return text.length > 0 ? text : null;
}

async function notifyMentionReward(
  mention: InstagramMention,
  accountId: string,
  points: number,
  balance: number,
) {
  try {
    const contact = mention.contactId
      ? await prisma.contact.findUnique({
          where: { id: mention.contactId },
          select: { name: true, igsId: true },
        })
      : null;
    const name = contact?.name?.trim() || mention.username || "there";
    const outcome = await sendLoyaltyEvent(
      mention.orgId,
      LoyaltyEventType.INSTAGRAM_MENTION_REWARDED,
      { accountId },
      { name, points, balance },
    );
    if (outcome.sent || !outcome.skippedReason) return;
    if (!DM_FALLBACK_REASONS.has(outcome.skippedReason)) return;

    const igsId = mention.igsId ?? contact?.igsId;
    if (!igsId) return;
    const text = await mentionRewardText(mention.orgId, { name, points, balance });
    if (!text) return;
    await sendInstagramTextMessage(igsId, text, mention.orgId, mention.ibaId);
  } catch (e) {
    log.warn({ err: e, mentionId: mention.id }, "[Instagram mentions] Reward message failed");
  }
}

/** A story mention from someone who is not a member: invite them, the mention waits 24 h. */
async function sendJoinInvite(mention: InstagramMention) {
  if (!mention.igsId) return;
  try {
    const program = await prisma.loyaltyProgram.findUnique({
      where: { orgId: mention.orgId },
      select: { id: true, status: true, name: true },
    });
    if (!program || program.status !== "active") return;
    const rule = toInstagramMentionConfig(await findInstagramMentionRule(program.id));
    if (!rule.enabled || !rule.mentionKinds.includes(mention.kind)) return;

    const text =
      `Thanks for mentioning us in your story! 🎉 Join ${program.name || "our loyalty program"} ` +
      `in the next ${MENTION_JOIN_WINDOW_HOURS} hours and we'll add ${rule.pointsPerMention} points for it: ` +
      joinLink(mention.orgId, mention.id);
    await sendInstagramTextMessage(mention.igsId, text, mention.orgId, mention.ibaId);
  } catch (e) {
    log.warn({ err: e, mentionId: mention.id }, "[Instagram mentions] Join invite failed");
  }
}

/* ── entry points ───────────────────────────────────────────────────────────── */

/**
 * The `mentions` webhook field: a caption mention (`{ media_id }`) or a comment mention
 * (`{ comment_id, media_id }`). Called from instagram.service.ts for each such change.
 */
export async function handleInstagramMentionChange(
  value: InstagramMentionValue,
  settings: { orgId: string; ibaId: string },
): Promise<void> {
  try {
    const kind = value.comment_id ? InstagramMentionKind.COMMENT : InstagramMentionKind.MEDIA;
    const sourceId = value.comment_id ?? value.media_id;
    if (!sourceId) return;
    const { orgId, ibaId } = settings;

    await expireStaleInstagramMentions(orgId);

    // A redelivery: already recorded, so no Graph call and nothing more to do.
    const existing = await prisma.instagramMention.findUnique({
      where: { orgId_kind_sourceId: { orgId, kind, sourceId } },
      select: { id: true },
    });
    if (existing) return;

    const details = await fetchMentionDetails(kind, value, settings);
    const username = normaliseUsername(details.username);
    const contact = username ? await findContactByUsername(orgId, username) : null;

    let mention: InstagramMention;
    try {
      mention = await prisma.instagramMention.create({
        data: {
          orgId,
          ibaId,
          kind,
          sourceId,
          mediaId: details.mediaId,
          // Not a documented field on mentioned media; left empty rather than guessed.
          permalink: null,
          username,
          igsId: contact?.igsId ?? null,
          contactId: contact?.id ?? null,
        },
      });
    } catch (e) {
      if (isUniqueViolation(e)) return;
      throw e;
    }

    await resolveInstagramMention(mention);
  } catch (e) {
    log.error({ err: e, ...settings, ...value }, "[Instagram mentions] Could not handle a mention");
  }
}

/**
 * A story mention DM was stored. `storyId` is the message mid (the CDN URL expires, so it
 * is never what we key on). Awards a member straight away; invites a non-member to join.
 */
export async function recordInstagramStoryMention(input: {
  orgId: string;
  ibaId: string;
  igsId: string;
  storyId: string;
}): Promise<void> {
  try {
    const { orgId, ibaId, igsId, storyId } = input;
    await expireStaleInstagramMentions(orgId);

    const contact = await prisma.contact.findUnique({
      where: { contact_igsid_org_id_unique: { igsId, orgId } },
      select: { id: true, whatsappUserName: true },
    });

    let mention: InstagramMention;
    try {
      mention = await prisma.instagramMention.create({
        data: {
          orgId,
          ibaId,
          kind: InstagramMentionKind.STORY,
          sourceId: storyId,
          igsId,
          username: normaliseUsername(contact?.whatsappUserName),
          contactId: contact?.id ?? null,
        },
      });
    } catch (e) {
      if (isUniqueViolation(e)) return;
      throw e;
    }

    const outcome = await resolveInstagramMention(mention);
    if (outcome === "not_member" || outcome === "unlinked") {
      await sendJoinInvite(mention);
    }
  } catch (e) {
    log.error({ err: e, ...input }, "[Instagram mentions] Could not record a story mention");
  }
}

/**
 * A contact now has an Instagram username (they DMed us): claim the caption/comment
 * mentions waiting under that username and award them if the contact is a member.
 * Returns how many rows were linked.
 */
export async function linkPendingInstagramMentions(
  orgId: string,
  contactId: string,
  username: string,
): Promise<number> {
  const handle = normaliseUsername(username);
  if (!handle) return 0;
  try {
    await expireStaleInstagramMentions(orgId);
    const contact = await prisma.contact.findFirst({
      where: { id: contactId, orgId },
      select: { igsId: true },
    });
    if (!contact) return 0;
    const { count } = await prisma.instagramMention.updateMany({
      where: {
        orgId,
        status: InstagramMentionStatus.PENDING,
        contactId: null,
        username: handle,
      },
      data: { contactId, ...(contact.igsId ? { igsId: contact.igsId } : {}) },
    });
    if (count > 0) await resolvePendingForContact(orgId, contactId);
    return count;
  } catch (e) {
    log.error({ err: e, orgId, contactId }, "[Instagram mentions] Could not link mentions");
    return 0;
  }
}

async function resolvePendingForContact(orgId: string, contactId: string, since?: Date) {
  const pending = await prisma.instagramMention.findMany({
    where: {
      orgId,
      contactId,
      status: InstagramMentionStatus.PENDING,
      ...(since ? { createdAt: { gte: since } } : {}),
    },
    orderBy: { createdAt: "asc" },
  });
  let awarded = 0;
  for (const mention of pending) {
    if ((await resolveInstagramMention(mention)) === "awarded") awarded++;
  }
  return awarded;
}

/**
 * A loyalty account was just created for `contactId`. Pays the PENDING mentions that
 * contact made in the last 24 hours. `mentionId` comes from the join link a story mention
 * was answered with (`?ig=`): the web form creates or finds a contact by phone, which is
 * not the Instagram contact, so the link is what ties that mention to the new member.
 */
export async function awardInstagramMentionsOnJoin(input: {
  orgId: string;
  contactId: string;
  mentionId?: string | null;
}): Promise<number> {
  const { orgId, contactId, mentionId } = input;
  try {
    await expireStaleInstagramMentions(orgId);
    const since = new Date(Date.now() - MENTION_JOIN_WINDOW_HOURS * 60 * 60 * 1000);
    if (mentionId) {
      await prisma.instagramMention.updateMany({
        where: {
          id: mentionId,
          orgId,
          status: InstagramMentionStatus.PENDING,
          createdAt: { gte: since },
        },
        data: { contactId },
      });
    }
    return await resolvePendingForContact(orgId, contactId, since);
  } catch (e) {
    log.error({ err: e, orgId, contactId }, "[Instagram mentions] Could not award on join");
    return 0;
  }
}
