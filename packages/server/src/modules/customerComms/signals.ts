import prisma from "../../utils/prisma.js";
import { WhatsappSettingsStatus } from "../../types/enums.js";

/** What an org has set up so far: the facts drip steps and broadcast segments test. */
export interface ActivationSignals {
  createdAt: Date;
  whatsappConnected: boolean;
  campaignSent: boolean;
  loyaltyActive: boolean;
  automationsSet: boolean;
  teammateInvited: boolean;
  /** Any inbox message, either direction, in the last 7 days. */
  activeLast7Days: boolean;
}

const DAY_MS = 86_400_000;

/** One query per signal family, however many orgs are asked about. */
export async function getActivationSignals(
  orgIds: string[],
  now = new Date(),
): Promise<Map<string, ActivationSignals>> {
  const result = new Map<string, ActivationSignals>();
  if (!orgIds.length) return result;

  const [orgs, channels, campaigns, loyalty, members, recent] = await Promise.all([
    prisma.org.findMany({
      where: { id: { in: orgIds } },
      select: { id: true, createdAt: true, onboardingChecklist: true },
    }),
    prisma.channel.findMany({
      where: { orgId: { in: orgIds }, platform: "WHATSAPP", status: WhatsappSettingsStatus.ACTIVE },
      select: { orgId: true },
      distinct: ["orgId"],
    }),
    prisma.campaign.findMany({
      where: { team: { orgId: { in: orgIds } }, startedAt: { not: null } },
      select: { team: { select: { orgId: true } } },
      distinct: ["teamId"],
    }),
    prisma.loyaltyProgram.findMany({
      where: { orgId: { in: orgIds }, status: "active" },
      select: { orgId: true },
    }),
    prisma.orgMember.groupBy({
      by: ["orgId"],
      where: { orgId: { in: orgIds } },
      _count: { _all: true },
    }),
    prisma.waMessageOrgTeamMap.findMany({
      where: { orgId: { in: orgIds }, createdAt: { gte: new Date(now.getTime() - 7 * DAY_MS) } },
      select: { orgId: true },
      distinct: ["orgId"],
    }),
  ]);

  const connected = new Set(channels.map((c) => c.orgId));
  const campaigned = new Set(campaigns.map((c) => c.team.orgId));
  const loyal = new Set(loyalty.map((l) => l.orgId));
  const memberCount = new Map(members.map((m) => [m.orgId, m._count._all]));
  const active = new Set(recent.map((r) => r.orgId));

  for (const org of orgs) {
    const checklist = (org.onboardingChecklist ?? {}) as { auto?: boolean; invite?: boolean };
    result.set(org.id, {
      createdAt: org.createdAt,
      whatsappConnected: connected.has(org.id),
      campaignSent: campaigned.has(org.id),
      loyaltyActive: loyal.has(org.id),
      automationsSet: Boolean(checklist.auto),
      teammateInvited: Boolean(checklist.invite) || (memberCount.get(org.id) ?? 0) > 1,
      activeLast7Days: active.has(org.id),
    });
  }
  return result;
}
