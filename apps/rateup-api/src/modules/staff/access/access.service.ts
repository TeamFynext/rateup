import type { FastifyRequest } from "fastify";
import type { Prisma, StaffUser } from "../../../../generated/prisma/client.js";
import prisma from "../../../utils/prisma.js";
import { StaffHttpError } from "../staff.errors.js";
import { recordStaffAction } from "../staffAudit.js";
import type { StaffAddInput, StaffReasonInput, StaffUpdateInput } from "./access.schema.js";

type Db = Prisma.TransactionClient;

/** Only owners change who can sign in. There is no other staff role yet. */
export function assertOwner(request: FastifyRequest): void {
  if (!request.staff?.isOwner) {
    throw new StaffHttpError(403, "NOT_OWNER", "Only an owner can manage staff members.");
  }
}

const notFound = () => new StaffHttpError(404, "STAFF_NOT_FOUND", "Staff member not found.");

/**
 * Your own row is off limits: deactivating or demoting yourself is how a console ends up
 * with nobody who can manage it, and there is always another owner who can do it to you.
 */
function assertNotSelf(request: FastifyRequest, staffUserId: string): void {
  if (request.staff!.id === staffUserId) {
    throw new StaffHttpError(
      422,
      "CANNOT_EDIT_SELF",
      "Ask another owner to change your own access.",
    );
  }
}

/** Refuses the change that would leave the console without an active owner. */
async function assertAnotherOwner(db: Db, exceptId: string): Promise<void> {
  const others = await db.staffUser.count({
    where: { isOwner: true, active: true, id: { not: exceptId } },
  });
  if (others === 0) {
    throw new StaffHttpError(
      409,
      "LAST_OWNER",
      "This is the last owner; make someone else an owner first.",
    );
  }
}

async function loadStaff(db: Db, id: string): Promise<StaffUser> {
  const staff = await db.staffUser.findUnique({ where: { id } });
  if (!staff) throw notFound();
  return staff;
}

/** What the audit log keeps of a staff row: enough to see what changed, nothing secret. */
const snapshot = (staff: StaffUser) => ({
  email: staff.email,
  name: staff.name,
  active: staff.active,
  isOwner: staff.isOwner,
});

/**
 * Adds someone to the allowlist, or brings back someone who was deactivated. Google sign-in
 * still decides whether they get in: the address must be on the Workspace domain, which the
 * schema does not check because the domain is configuration, not data. A null domain
 * (NODE_ENV=development only; see staffSignInDomain) accepts any address.
 */
export async function addStaffMember(
  request: FastifyRequest,
  input: StaffAddInput,
  domain: string | null,
) {
  assertOwner(request);
  if (domain !== null && !input.email.endsWith(`@${domain}`)) {
    throw new StaffHttpError(
      422,
      "WRONG_DOMAIN",
      `Only @${domain} addresses can sign in to the console.`,
    );
  }

  return prisma.$transaction(async (tx) => {
    const existing = await tx.staffUser.findUnique({ where: { email: input.email } });
    if (existing?.active) {
      throw new StaffHttpError(
        409,
        "ALREADY_STAFF",
        `${existing.email} is already a staff member.`,
      );
    }

    const staff = existing
      ? await tx.staffUser.update({
          where: { id: existing.id },
          data: {
            active: true,
            deactivatedAt: null,
            isOwner: input.isOwner,
            ...(input.name ? { name: input.name } : {}),
          },
        })
      : await tx.staffUser.create({
          data: {
            email: input.email,
            name: input.name,
            isOwner: input.isOwner,
            createdById: request.staff!.id,
          },
        });

    await recordStaffAction(tx, request, {
      action: existing ? "staff.reactivate" : "staff.add",
      targetUserId: staff.id,
      reason: input.reason,
      before: existing ? snapshot(existing) : null,
      after: snapshot(staff),
    });
    return staff;
  });
}

export async function updateStaffMember(
  request: FastifyRequest,
  staffUserId: string,
  input: StaffUpdateInput,
) {
  assertOwner(request);
  if (input.isOwner !== undefined) assertNotSelf(request, staffUserId);

  return prisma.$transaction(async (tx) => {
    const existing = await loadStaff(tx, staffUserId);
    if (input.isOwner === false && existing.isOwner && existing.active) {
      await assertAnotherOwner(tx, existing.id);
    }

    const staff = await tx.staffUser.update({
      where: { id: existing.id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.isOwner !== undefined ? { isOwner: input.isOwner } : {}),
      },
    });

    await recordStaffAction(tx, request, {
      action: input.isOwner === undefined ? "staff.rename" : "staff.role_change",
      targetUserId: staff.id,
      reason: input.reason,
      before: snapshot(existing),
      after: snapshot(staff),
    });
    return staff;
  });
}

/** Ends their access now: the row is switched off and every open session dies with it. */
export async function deactivateStaffMember(
  request: FastifyRequest,
  staffUserId: string,
  input: StaffReasonInput,
  now = new Date(),
) {
  assertOwner(request);
  assertNotSelf(request, staffUserId);

  return prisma.$transaction(async (tx) => {
    const existing = await loadStaff(tx, staffUserId);
    if (!existing.active) {
      throw new StaffHttpError(
        409,
        "ALREADY_INACTIVE",
        "This staff member is already deactivated.",
      );
    }
    if (existing.isOwner) await assertAnotherOwner(tx, existing.id);

    const staff = await tx.staffUser.update({
      where: { id: existing.id },
      data: { active: false, deactivatedAt: now },
    });
    const { count: sessionsEnded } = await tx.staffSession.updateMany({
      where: { staffUserId: existing.id, revokedAt: null },
      data: { revokedAt: now },
    });

    await recordStaffAction(tx, request, {
      action: "staff.deactivate",
      targetUserId: staff.id,
      reason: input.reason,
      before: snapshot(existing),
      after: { ...snapshot(staff), sessionsEnded },
    });
    return { staff, sessionsEnded };
  });
}

/**
 * Signs them out everywhere without changing who they are. Owners may do it to anyone;
 * everyone may do it to themselves (a lost laptop is the usual reason).
 */
export async function revokeStaffSessions(
  request: FastifyRequest,
  staffUserId: string,
  input: StaffReasonInput,
  now = new Date(),
) {
  if (request.staff!.id !== staffUserId) assertOwner(request);

  return prisma.$transaction(async (tx) => {
    const existing = await loadStaff(tx, staffUserId);
    const { count: sessionsEnded } = await tx.staffSession.updateMany({
      where: { staffUserId: existing.id, revokedAt: null },
      data: { revokedAt: now },
    });
    await recordStaffAction(tx, request, {
      action: "staff.revoke_sessions",
      targetUserId: existing.id,
      reason: input.reason,
      after: { email: existing.email, sessionsEnded },
    });
    return { sessionsEnded };
  });
}
