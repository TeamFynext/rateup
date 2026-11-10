import type { FastifyRequest } from "fastify";
import type { Prisma } from "../../../generated/prisma/client.js";
import prisma from "../../../utils/prisma.js";
import { forbidden } from "./staff.errors.js";

/*
 * Guards for the staff writes that change what a customer pays for or whether they can use
 * the product at all: plan, expiry, feature overrides, add-on packs, suspension and pausing a
 * person. None may be made by a staff member to an account they belong to themselves.
 */

/** Orgs the address owns or is a member of; matched without regard to case. */
function orgsOf(email: string): Prisma.OrgWhereInput {
  const sameEmail = { equals: email, mode: "insensitive" } as const;
  return {
    OR: [{ owner: { email: sameEmail } }, { members: { some: { user: { email: sameEmail } } } }],
  };
}

const ownAccount = () =>
  forbidden(
    "OWN_ACCOUNT",
    "You belong to this account yourself; ask another staff member to make this change.",
  );

/** Refuses a write to an org whose owner or members include the staff member's own address. */
export async function assertNotOwnOrg(request: FastifyRequest, orgId: string): Promise<void> {
  const hit = await prisma.org.findFirst({
    where: { id: orgId, ...orgsOf(request.staff!.email) },
    select: { id: true },
  });
  if (hit) throw ownAccount();
}

/**
 * Refuses a write to a person who is the staff member themselves (same address) or who
 * shares an org with them.
 */
export async function assertNotOwnUser(request: FastifyRequest, userId: string): Promise<void> {
  const email = request.staff!.email;
  const mine = orgsOf(email);
  const hit = await prisma.user.findFirst({
    where: {
      id: userId,
      OR: [
        { email: { equals: email, mode: "insensitive" } },
        { org: { some: mine } },
        { orgMember: { some: { org: mine } } },
      ],
    },
    select: { id: true },
  });
  if (hit) throw ownAccount();
}

/** Subscription edits are for staff owners: there is no billing role yet. */
export function assertStaffOwner(request: FastifyRequest): void {
  if (!request.staff?.isOwner) {
    throw forbidden("NOT_OWNER", "Only a staff owner can change an account's subscription.");
  }
}

/** preHandler for `/orgs/:id/subscription/*` and `/orgs/:id/addons*`. */
export async function guardSubscriptionWrite(request: FastifyRequest<{ Params: { id: string } }>) {
  assertStaffOwner(request);
  await assertNotOwnOrg(request, request.params.id);
}

/** preHandler for suspending and unsuspending an org. */
export async function guardOrgAccessWrite(request: FastifyRequest<{ Params: { id: string } }>) {
  await assertNotOwnOrg(request, request.params.id);
}

/** preHandler for pausing or resuming one person. */
export async function guardUserAccessWrite(request: FastifyRequest<{ Params: { id: string } }>) {
  await assertNotOwnUser(request, request.params.id);
}
