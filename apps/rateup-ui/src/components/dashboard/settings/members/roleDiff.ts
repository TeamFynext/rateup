import type { Permission } from "@/utils/authz/permissions.ts";
import { ROLE_PERMISSIONS, type RoleKey } from "@/utils/authz/roles.ts";

/** What changes hands when a person moves from one role to another. */
export function roleDiff(
  from: RoleKey | undefined,
  to: RoleKey,
): { gains: Permission[]; loses: Permission[] } {
  const before = from ? ROLE_PERMISSIONS[from] : new Set<Permission>();
  const after = ROLE_PERMISSIONS[to];
  return {
    gains: [...after].filter((p) => !before.has(p)),
    loses: [...before].filter((p) => !after.has(p)),
  };
}

/**
 * The roles in the order they escalate. From Agent upward each includes the one before it;
 * Viewer is the read-only slice of Staff, so it sits first but is not inside Agent.
 */
export const ROLE_LADDER: readonly RoleKey[] = [
  "VIEWER",
  "AGENT",
  "STAFF",
  "MANAGER",
  "ADMIN",
  "OWNER",
];

/** True when this step has the permission and the step before it does not: where it enters. */
export function grantsAt(permission: Permission, roleKey: RoleKey): boolean {
  const index = ROLE_LADDER.indexOf(roleKey);
  const previous = index > 0 ? ROLE_LADDER[index - 1] : undefined;
  const has = ROLE_PERMISSIONS[roleKey].has(permission);
  return has && !(previous && ROLE_PERMISSIONS[previous].has(permission));
}

/** Where a permission first appears on the ladder. */
export function firstRoleWith(permission: Permission): RoleKey | undefined {
  return ROLE_LADDER.find((key) => ROLE_PERMISSIONS[key].has(permission));
}
