import { isPermission, type Permission } from "./permissions.js";
import { ROLE_PERMISSIONS, type RoleKey } from "./roles.js";

/**
 * A member's effective permissions: the role's bundle, plus what was granted by hand, minus
 * what was taken away. The owner is exempt, so nobody can be trimmed out of running the org.
 * Unknown keys (a retired permission still stored on a row) are ignored rather than granted.
 */
export function effectivePermissions(
  roleKey: RoleKey,
  grants: readonly string[] = [],
  denies: readonly string[] = [],
): ReadonlySet<Permission> {
  const base = ROLE_PERMISSIONS[roleKey];
  if (roleKey === "OWNER") return base;
  const out = new Set<Permission>(base);
  for (const key of grants) if (isPermission(key)) out.add(key);
  for (const key of denies) if (isPermission(key)) out.delete(key);
  return out;
}

/** Overrides that change nothing against the role are dropped, so a row only stores real deltas. */
export function normaliseOverrides(
  roleKey: RoleKey,
  grants: readonly string[],
  denies: readonly string[],
): { grants: Permission[]; denies: Permission[] } {
  const base = ROLE_PERMISSIONS[roleKey];
  const grantSet = new Set(grants.filter(isPermission).filter((p) => !base.has(p)));
  const denySet = new Set(denies.filter(isPermission).filter((p) => base.has(p)));
  return { grants: [...grantSet].sort(), denies: [...denySet].sort() };
}
