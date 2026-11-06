import { z } from "zod";
import type { Prisma } from "../../../generated/prisma/client.js";
import { resolveRoleKey } from "../../authz/actor.js";
import prisma from "../../utils/prisma.js";
import { getActivationSignals, type ActivationSignals } from "./signals.js";

const DAY_MS = 86_400_000;

export const AUDIENCE_SEGMENTS = [
  "whatsapp_not_connected",
  "no_loyalty",
  "no_campaign",
  "inactive_7d",
] as const;
export type AudienceSegment = (typeof AUDIENCE_SEGMENTS)[number];

export const broadcastAudienceSchema = z.object({
  plan: z.enum(["any", "paid", "active", "expired", "no_plan"]).default("any"),
  planId: z.uuid().optional(),
  createdWithinDays: z.number().int().min(1).max(3650).optional(),
  /** Every listed segment must match. */
  segments: z.array(z.enum(AUDIENCE_SEGMENTS)).default([]),
});
export type BroadcastAudience = z.infer<typeof broadcastAudienceSchema>;

const SEGMENT_TEST: Record<AudienceSegment, (s: ActivationSignals) => boolean> = {
  whatsapp_not_connected: (s) => !s.whatsappConnected,
  no_loyalty: (s) => !s.loyaltyActive,
  no_campaign: (s) => !s.campaignSent,
  inactive_7d: (s) => !s.activeLast7Days,
};

/** Orgs we may message at all: not suspended, not paused by their owner. */
// `isPaused` is nullable, and `{ not: true }` compiles to `<> true`, which drops NULL rows.
const notPaused = { OR: [{ isPaused: false }, { isPaused: null }] };

export const messageableOrgWhere: Prisma.OrgWhereInput = { suspendedAt: null, ...notPaused };

function audienceOrgWhere(audience: BroadcastAudience, now: Date): Prisma.OrgWhereInput {
  const and: Prisma.OrgWhereInput[] = [messageableOrgWhere];
  switch (audience.plan) {
    case "active":
      and.push({ Subscription: { is: { expiresAt: { gt: now } } } });
      break;
    case "expired":
      and.push({ Subscription: { is: { expiresAt: { lte: now } } } });
      break;
    case "no_plan":
      and.push({ Subscription: { is: null } });
      break;
    case "paid":
      and.push({
        Subscription: { is: { expiresAt: { gt: now }, basePlan: { is: { price: { gt: 0 } } } } },
      });
      break;
  }
  if (audience.planId) and.push({ Subscription: { is: { basePlanId: audience.planId } } });
  if (audience.createdWithinDays) {
    and.push({ createdAt: { gte: new Date(now.getTime() - audience.createdWithinDays * DAY_MS) } });
  }
  return { AND: and };
}

/** Org ids a broadcast's filter selects, segments applied. */
export async function resolveAudienceOrgIds(
  audience: BroadcastAudience,
  now = new Date(),
): Promise<string[]> {
  const orgs = await prisma.org.findMany({
    where: audienceOrgWhere(audience, now),
    select: { id: true },
  });
  const ids = orgs.map((o) => o.id);
  if (!audience.segments.length) return ids;
  const signals = await getActivationSignals(ids, now);
  return ids.filter((id) => {
    const s = signals.get(id);
    return s && audience.segments.every((seg) => SEGMENT_TEST[seg](s));
  });
}

export interface Recipient {
  userId: string;
  orgId: string;
  orgName: string;
  name: string;
  email: string;
  phone: string | null;
  emailOptedOut: boolean;
  whatsappOptedIn: boolean;
}

/**
 * Owners and admins of the given orgs. A person in two orgs appears once per org, which is
 * what the per-org drip wants; the broadcast fan-out keeps only their first.
 */
export async function recipientsForOrgs(orgIds: string[]): Promise<Recipient[]> {
  if (!orgIds.length) return [];
  const members = await prisma.orgMember.findMany({
    where: {
      orgId: { in: orgIds },
      user: { active: true, deletedAt: null, ...notPaused },
    },
    select: {
      role: true,
      roleKey: true,
      org: { select: { id: true, name: true, ownerId: true, phone: true } },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          marketingEmailOptOutAt: true,
          marketingWhatsappOptInAt: true,
          marketingWhatsappOptOutAt: true,
        },
      },
    },
  });

  const suppressed = new Set(
    (
      await prisma.emailSuppression.findMany({
        where: { email: { in: members.map((m) => m.user.email.toLowerCase()) } },
        select: { email: true },
      })
    ).map((s) => s.email),
  );

  return members
    .filter((m) => {
      const isOwner = m.org.ownerId === m.user.id;
      const key = resolveRoleKey(m, isOwner);
      return key === "OWNER" || key === "ADMIN";
    })
    .map((m) => {
      const u = m.user;
      const optedIn =
        u.marketingWhatsappOptInAt !== null &&
        (u.marketingWhatsappOptOutAt === null ||
          u.marketingWhatsappOptOutAt < u.marketingWhatsappOptInAt);
      return {
        userId: u.id,
        orgId: m.org.id,
        orgName: m.org.name,
        name: firstName(u.name, u.email),
        email: u.email,
        // The owner's own number when they never gave one on their profile.
        phone: u.phone || (m.org.ownerId === u.id ? m.org.phone : null),
        emailOptedOut: u.marketingEmailOptOutAt !== null || suppressed.has(u.email.toLowerCase()),
        whatsappOptedIn: optedIn,
      };
    });
}

export function firstName(name: string | null, email: string): string {
  const first = name?.trim().split(/\s+/)[0];
  return first || email.split("@")[0];
}

/** Drip pacing: at most one message a day and three a week, broadcasts included. */
export const FREQUENCY_CAP = { perDay: 1, perWeek: 3 };

/** Users who have reached the cap, from what CustomerMessage says was queued or sent. */
export async function usersAtCap(userIds: string[], now = new Date()): Promise<Set<string>> {
  if (!userIds.length) return new Set();
  const since = new Date(now.getTime() - 7 * DAY_MS);
  const dayAgo = new Date(now.getTime() - DAY_MS);
  const rows = await prisma.customerMessage.findMany({
    where: {
      userId: { in: userIds },
      createdAt: { gte: since },
      status: { in: ["QUEUED", "SENT"] },
    },
    select: { userId: true, createdAt: true, key: true },
  });
  // Email and WhatsApp for one step are one touch, not two.
  const touches = new Map<string, Map<string, Date>>();
  for (const r of rows) {
    const byKey = touches.get(r.userId) ?? new Map<string, Date>();
    byKey.set(r.key, r.createdAt);
    touches.set(r.userId, byKey);
  }
  const capped = new Set<string>();
  for (const [userId, byKey] of touches) {
    const dates = [...byKey.values()];
    const today = dates.filter((d) => d >= dayAgo).length;
    if (today >= FREQUENCY_CAP.perDay || dates.length >= FREQUENCY_CAP.perWeek) capped.add(userId);
  }
  return capped;
}

/** Drips go out 10:00–19:00 in this zone. India first; it is still daytime in the Gulf. */
export function inSendWindow(now = new Date()): boolean {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      hour12: false,
      timeZone: "Asia/Kolkata",
    }).format(now),
  );
  return hour >= 10 && hour < 19;
}
