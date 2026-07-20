import prisma from "../../../../utils/prisma.js";
import { WaMessageAssignStatus } from "../../../../types/enums.js";

type StatsField =
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
 *
 * Counts DISTINCT contacts, not conversation rows: this feeds the legacy
 * contact-keyed inbox tabs, and once history is re-segmented into sessions a
 * contact can own many closed conversations. The conversation-keyed inbox
 * counts rows via its own endpoint instead.
 */
export async function getInboxCountsFromConversations(orgId: string) {
  const result: {
    all_count: number;
    open_count: number;
    closed_count: number;
  }[] = await prisma.$queryRaw`
  SELECT
    COUNT(DISTINCT "contactId")::INT                                            AS all_count,
    COUNT(DISTINCT "contactId") FILTER (WHERE status IN ('UNASSIGNED','ASSIGNED'))::INT AS open_count,
    -- Tabs are exclusive: a contact with an open session is "open" no matter
    -- how many closed sessions precede it, so closed = everyone else.
    (COUNT(DISTINCT "contactId")
      - COUNT(DISTINCT "contactId") FILTER (WHERE status IN ('UNASSIGNED','ASSIGNED')))::INT AS closed_count
  FROM "Conversation"
  WHERE "orgId" = ${orgId}
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

  const updateData: any = {};
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
