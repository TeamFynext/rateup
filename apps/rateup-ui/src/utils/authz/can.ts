import { isPermission, type Permission } from "./permissions.ts";
import { isRoleKey, legacyRoleToKey, ROLE_PERMISSIONS, type RoleKey } from "./roles.ts";

/** The slice of `/user/info` the permission layer reads. */
export interface PermissionSource {
  permissions?: readonly string[] | null;
  roleKey?: string | null;
  role?: string | null;
}

/**
 * The permissions to act on. The API's list wins; while an older API still answers without
 * one, the role key (or the legacy role string) picks the mirrored bundle, so a fresh UI in
 * front of a stale API degrades to today's behaviour rather than to nothing.
 */
export function resolvePermissions(
  user: PermissionSource | null | undefined,
): ReadonlySet<Permission> {
  if (!user) return new Set();
  if (Array.isArray(user.permissions)) {
    return new Set(user.permissions.filter(isPermission));
  }
  const key = resolveRoleKey(user);
  return key ? ROLE_PERMISSIONS[key] : new Set();
}

export function resolveRoleKey(user: PermissionSource | null | undefined): RoleKey | undefined {
  if (!user) return undefined;
  if (isRoleKey(user.roleKey)) return user.roleKey;
  return legacyRoleToKey(user.role);
}

export function can(permissions: ReadonlySet<Permission>, permission: Permission): boolean {
  return permissions.has(permission);
}

/** Any one of the list suffices, matching the API's route declarations. */
export function canAny(permissions: ReadonlySet<Permission>, list: readonly Permission[]): boolean {
  return list.some((p) => permissions.has(p));
}
