import type { FastifyRequest } from "fastify";
import { z } from "zod";
import { SubscriptionStatus } from "../../../../generated/prisma/enums.js";
import { log } from "../../../utils/logger.js";
import prisma from "../../../utils/prisma.js";
import { deleteOrg, orgMemberFate, sendDeletionMailToOrgOwner } from "../../org/org.services.js";
import { StaffHttpError } from "../staff.errors.js";
import { assertRecentAuth } from "../staff.session.js";
import { recordStaffAction } from "../staffAudit.js";
import { reasonSchema } from "./subscription.schema.js";

export const deleteOrgSchema = z.object({
  /** The org's name typed back, so the wrong org cannot be deleted by reflex. */
  confirm: z.string().trim().max(200),
  reason: reasonSchema,
});
export type DeleteOrgInput = z.infer<typeof deleteOrgSchema>;

export const deletionWarningSchema = z.object({ reason: reasonSchema });
export type DeletionWarningInput = z.infer<typeof deletionWarningSchema>;

/** A gateway still charging: deleting the org would leave it billing an org that is gone. */
const LIVE_GATEWAY: SubscriptionStatus[] = [
  SubscriptionStatus.created,
  SubscriptionStatus.authenticated,
  SubscriptionStatus.active,
  SubscriptionStatus.pending,
  SubscriptionStatus.halted,
];

const orgNotFound = () => new StaffHttpError(404, "ORG_NOT_FOUND", "Organisation not found.");

async function loadOrg(orgId: string) {
  const org = await prisma.org.findUnique({
    where: { id: orgId },
    select: {
      id: true,
      name: true,
      createdAt: true,
      owner: { select: { id: true, email: true, name: true } },
      Subscription: { select: { basePlan: { select: { name: true } }, expiresAt: true } },
      _count: { select: { members: true, teams: true } },
    },
  });
  if (!org) throw orgNotFound();
  return org;
}

/** What a delete would take with it, for the console to show before anyone types the name. */
export async function previewOrgDeletion(orgId: string) {
  const org = await loadOrg(orgId);
  const [fate, liveOrders] = await Promise.all([
    orgMemberFate(orgId),
    prisma.order.findMany({
      where: { orgId, subscriptionStatus: { in: LIVE_GATEWAY } },
      select: { id: true, subscriptionId: true, subscriptionStatus: true },
    }),
  ]);
  const accounts = await prisma.user.findMany({
    where: { id: { in: [...fate.onlyHere, ...fate.elsewhere] } },
    select: { id: true, email: true, name: true },
  });
  const byId = new Map(accounts.map((user) => [user.id, user]));
  const people = (ids: string[]) => ids.map((id) => byId.get(id)).filter((user) => !!user);
  return {
    name: org.name,
    members: org._count.members,
    teams: org._count.teams,
    usersDeleted: people(fate.onlyHere),
    usersKept: people(fate.elsewhere),
    liveSubscriptions: liveOrders,
  };
}

/**
 * Deletes an org for good. Three things stand in front of it, all checked here whatever the
 * console shows: a Google sign-in from the last 15 minutes, the org's name typed back, and
 * no gateway subscription still charging. The audit row is written first and keeps what
 * the org was, because the org itself will not exist to look up.
 */
export async function deleteOrgAsStaff(
  request: FastifyRequest,
  orgId: string,
  input: DeleteOrgInput,
) {
  assertRecentAuth(request.staffSession);
  const org = await loadOrg(orgId);
  if (input.confirm !== org.name.trim()) {
    throw new StaffHttpError(422, "CONFIRM_MISMATCH", "Type the organisation's name exactly.");
  }
  const live = await prisma.order.count({
    where: { orgId, subscriptionStatus: { in: LIVE_GATEWAY } },
  });
  if (live > 0) {
    throw new StaffHttpError(
      409,
      "LIVE_SUBSCRIPTION",
      "A payment gateway is still billing this organisation. Cancel the subscription first.",
    );
  }

  const auditId = crypto.randomUUID();
  const snapshot = {
    name: org.name,
    owner: org.owner.email,
    plan: org.Subscription?.basePlan?.name ?? null,
    expiresAt: org.Subscription?.expiresAt ?? null,
    members: org._count.members,
    teams: org._count.teams,
    createdAt: org.createdAt,
  };
  await recordStaffAction(prisma, request, {
    id: auditId,
    action: "org.delete",
    targetOrgId: org.id,
    targetOrgName: org.name,
    reason: input.reason,
    before: snapshot,
    after: { status: "started" },
  });

  try {
    const result = await deleteOrg(orgId);
    await prisma.staffAuditLog.update({
      where: { id: auditId },
      data: {
        after: {
          status: "deleted",
          usersDeleted: result.usersDeleted.length,
          usersKept: result.usersKept.length,
        },
      },
    });
    return result;
  } catch (err) {
    log.error({ err, orgId }, "staff: org delete failed");
    const message = err instanceof Error ? err.message : "The delete failed.";
    await prisma.staffAuditLog.update({
      where: { id: auditId },
      data: { after: { status: "failed", error: message } },
    });
    throw new StaffHttpError(500, "DELETE_FAILED", "The organisation could not be deleted.");
  }
}

/** Emails the owner that the account will be deleted in 7 days if nothing changes. */
export async function warnOrgDeletion(
  request: FastifyRequest,
  orgId: string,
  input: DeletionWarningInput,
) {
  const org = await loadOrg(orgId);
  await sendDeletionMailToOrgOwner({
    ownerEmail: org.owner.email,
    ownerName: org.owner.name,
    orgName: org.name,
    orgId: org.id,
    delayInDays: 7,
  });
  await recordStaffAction(prisma, request, {
    action: "org.deletion_warning",
    targetOrgId: org.id,
    targetOrgName: org.name,
    reason: input.reason,
    after: { sentTo: org.owner.email, days: 7 },
  });
  return { sentTo: org.owner.email };
}
