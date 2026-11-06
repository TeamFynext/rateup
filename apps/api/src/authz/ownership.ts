import prisma from "../utils/prisma.js";
import { bustActor } from "./actor.js";
import { ForbiddenError } from "./errors.js";

export async function isOrgOwner(orgId: string, userId: string): Promise<boolean> {
  const org = await prisma.org.findUnique({ where: { id: orgId }, select: { ownerId: true } });
  return org?.ownerId === userId;
}

/** A member-management route may only act on members of the caller's own org. */
export async function assertMemberOfOrg(orgId: string, userId: string): Promise<void> {
  const member = await prisma.orgMember.findUnique({
    where: { userId_orgId: { userId, orgId } },
    select: { userId: true },
  });
  if (!member) {
    throw new ForbiddenError("That user is not a member of your organisation.", {
      reason: "scope",
    });
  }
}

/** The owner is never demoted, paused or removed; ownership moves by transfer. */
export async function assertNotOwner(orgId: string, userId: string, action: string): Promise<void> {
  if (await isOrgOwner(orgId, userId)) {
    throw new ForbiddenError(
      `The organisation owner cannot be ${action}. Transfer ownership first.`,
      {
        reason: "permission",
        permission: "org.transfer_ownership",
      },
    );
  }
}

/**
 * Hands the org to another member. The previous owner keeps org-wide access as ADMIN, so
 * there is always exactly one OWNER and nobody is locked out by the handover.
 */
export async function transferOwnership(orgId: string, fromUserId: string, toUserId: string) {
  if (fromUserId === toUserId) {
    throw new ForbiddenError("You already own this organisation.", { reason: "permission" });
  }
  const target = await prisma.orgMember.findUnique({
    where: { userId_orgId: { userId: toUserId, orgId } },
    select: { userId: true, user: { select: { active: true, isPaused: true } } },
  });
  if (!target) {
    throw new ForbiddenError("The new owner must already be a member of the organisation.", {
      reason: "permission",
    });
  }
  if (!target.user.active || target.user.isPaused) {
    throw new ForbiddenError("The new owner must be an active member.", { reason: "permission" });
  }

  await prisma.$transaction([
    prisma.org.update({ where: { id: orgId }, data: { ownerId: toUserId } }),
    prisma.orgMember.update({
      where: { userId_orgId: { userId: toUserId, orgId } },
      data: { role: "SUPER_ADMIN", roleKey: "OWNER" },
    }),
    prisma.orgMember.update({
      where: { userId_orgId: { userId: fromUserId, orgId } },
      data: { role: "SUPER_ADMIN", roleKey: "ADMIN" },
    }),
  ]);
  await Promise.all([bustActor(fromUserId, orgId), bustActor(toUserId, orgId)]);
}
