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
