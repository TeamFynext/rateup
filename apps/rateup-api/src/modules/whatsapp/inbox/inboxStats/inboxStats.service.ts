import prisma from "../../../../utils/prisma.js";
import { WaMessageAssignStatus } from "../../../../types/enums.js";
import type { Prisma } from "../../../../../generated/prisma/client.js";

export type StatsField =
  | "unassignedCount"
  | "assignedCount"
  | "closedCount"
  | "spamCount"
  | "resolvedCount"
  | "unresolvedCount"
  | "blockedCount"
  | "totalCount";

export function mapStatusToField(status: string): StatsField | null {
  switch (status) {
    case WaMessageAssignStatus.UNASSIGNED:
      return "unassignedCount";
    case WaMessageAssignStatus.ASSIGNED:
      return "assignedCount";
    case WaMessageAssignStatus.CLOSED:
      return "closedCount";
    case WaMessageAssignStatus.SPAM:
      return "spamCount";
    case WaMessageAssignStatus.RESOLVED:
      return "resolvedCount";
    case WaMessageAssignStatus.UNRESOLVED:
      return "unresolvedCount";
    default:
      return null;
  }
}

export async function getOrCreateInboxStats(orgId: string) {
  let stats = await prisma.inboxStats.findUnique({ where: { orgId } });
  if (!stats) {
    stats = await prisma.inboxStats.create({
      data: {
        orgId,
        unassignedCount: 0,
        assignedCount: 0,
        closedCount: 0,
        spamCount: 0,
        resolvedCount: 0,
        unresolvedCount: 0,
        blockedCount: 0,
        totalCount: 0,
      },
    });
  }
  return stats;
}

export interface InboxCounts {
  unassignedCount: number;
  assignedCount: number;
  closedCount: number;
  spamCount: number;
  resolvedCount: number;
  unresolvedCount: number;
  blockedCount: number;
  totalCount: number;
  /** UNASSIGNED + ASSIGNED. */
  openCount: number;
  /** Every conversation in the org, regardless of status. */
  allCount: number;
}

/**
 * Derives the inbox counts from `Conversation` instead of the denormalized
 * `InboxStats` counters, which drift whenever an increment is missed.
 *
 * One `groupBy` gives every per-status count; `open`, `closed` and `all` are
 * summed from it rather than issued as extra queries. `blockedCount` still
 * comes from `Contact.blockedOnWhatsApp` -- it is not a conversation status.
 */
export async function getInboxCountsFromConversations(orgId: string) {
  const result: {
    all_count: number;
    open_count: number;
    closed_count: number;
  }[] = await prisma.$queryRaw`
  -- CLOSED / SPAM / RESOLVED / UNRESOLVED are all "closed", and so is anything
  -- carrying a close stamp: the list treats a stamped ticket as finished even if
  -- its status column was left behind, and the badges have to agree with it or a
  -- tab shows a count it cannot fill.
  -- Spam contacts are excluded throughout: their tickets are absent from every
  -- tab these counts label (see filterChats), so counting them would inflate
  -- badges the lists can never fill.
  SELECT
    COUNT(*)::INT                                                               AS all_count,
    COUNT(*) FILTER (WHERE conv.status IN ('UNASSIGNED','ASSIGNED') AND conv."closedAt" IS NULL)::INT AS open_count,
    COUNT(*) FILTER (WHERE conv.status IN ('CLOSED','SPAM','RESOLVED','UNRESOLVED') OR conv."closedAt" IS NOT NULL)::INT AS closed_count
  FROM "Conversation" conv
  INNER JOIN "Contact" c ON c.id = conv."contactId"
  WHERE conv."orgId" = ${orgId} AND NOT c."isSpam"
`;
  return result?.[0] || { all_count: 0, open_count: 0, closed_count: 0 };
}

export async function incrementInboxStat(orgId: string, field: StatsField, amount: number = 1) {
  if (!field || amount <= 0) return;
  await prisma.inboxStats.upsert({
    where: { orgId },
    update: { [field]: { increment: amount } },
    create: { orgId, [field]: amount },
  });
}

export async function decrementInboxStat(orgId: string, field: StatsField, amount: number = 1) {
  if (!field || amount <= 0) return;
  await prisma.inboxStats.upsert({
    where: { orgId },
    update: { [field]: { decrement: amount } },
    create: { orgId, [field]: 0 },
  });
}

export async function transitionInboxStat(
  orgId: string,
  fromField: StatsField | null,
  toField: StatsField | null,
  amount: number = 1,
) {
  if (amount <= 0 || fromField === toField) return;

  const updateData: Prisma.InboxStatsUncheckedUpdateInput = {};
  if (fromField) updateData[fromField] = { decrement: amount };
  if (toField) updateData[toField] = { increment: amount };

  if (Object.keys(updateData).length === 0) return;

  await prisma.inboxStats.upsert({
    where: { orgId },
    update: updateData,
    create: {
      orgId,
      ...(toField ? { [toField]: amount } : {}),
    },
  });
}
