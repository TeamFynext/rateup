import { legacyRoleToKey, type LegacyRole, type RoleKey } from "./roles.js";

/**
 * The role rewrite for one org, as pure data so it can be tested without a database and
 * printed as a report before it is applied. `scripts/migrate-authz-roles.ts` runs it.
 */
export interface MemberRow {
  userId: string;
  role: LegacyRole;
  roleKey: string | null;
  createdAt: Date;
}

export interface OrgRolePlan {
  orgId: string;
  /** Set when `Org.ownerId` named nobody who is a member; the oldest SUPER_ADMIN takes over. */
  newOwnerId?: string;
  updates: { userId: string; roleKey: RoleKey }[];
  warnings: string[];
}

export function planOrgRoles(org: {
  id: string;
  ownerId: string;
  members: MemberRow[];
}): OrgRolePlan {
  const warnings: string[] = [];
  let ownerId = org.ownerId;

  const ownerIsMember = org.members.some((m) => m.userId === ownerId);
  if (!ownerIsMember) {
    const oldestSuperAdmin = [...org.members]
      .filter((m) => m.role === "SUPER_ADMIN")
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];
    if (oldestSuperAdmin) {
      warnings.push(`ownerId ${ownerId} is not a member; promoting ${oldestSuperAdmin.userId}`);
      ownerId = oldestSuperAdmin.userId;
    } else {
      warnings.push(`ownerId ${ownerId} is not a member and no SUPER_ADMIN exists to promote`);
    }
  }

  const updates = org.members
    .filter((m) => m.roleKey === null)
    .map((m) => ({ userId: m.userId, roleKey: legacyRoleToKey(m.role, m.userId === ownerId) }));

  const owners = org.members.filter(
    (m) => (m.roleKey ?? legacyRoleToKey(m.role, m.userId === ownerId)) === "OWNER",
  );
  if (owners.length !== 1) warnings.push(`org ends with ${owners.length} owner(s)`);

  return {
    orgId: org.id,
    newOwnerId: ownerId !== org.ownerId ? ownerId : undefined,
    updates,
    warnings,
  };
}

/** The tally the report prints: how many members land in each role. */
export function tallyRoles(plans: OrgRolePlan[]): Record<RoleKey, number> {
  const tally = { OWNER: 0, ADMIN: 0, MANAGER: 0, STAFF: 0, AGENT: 0, VIEWER: 0 };
  for (const plan of plans) for (const u of plan.updates) tally[u.roleKey] += 1;
  return tally;
}
