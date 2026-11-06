import { useMemo } from "react";

import { useUserInfo } from "@/backend/user/user.query";
import { can, canAny, resolvePermissions, resolveRoleKey } from "@/utils/authz/can.ts";
import type { Permission } from "@/utils/authz/permissions.ts";
import { grantableRolesFor, isRoleKey, type RoleKey } from "@/utils/authz/roles.ts";

export interface PermissionState {
  permissions: ReadonlySet<Permission>;
  roleKey: RoleKey | undefined;
  /** Whether the signed-in user reaches every team, or only the ones they are in. */
  seesAllTeams: boolean;
  /** Roles this user may hand out; the API's answer when it sends one. */
  grantableRoles: RoleKey[];
  can: (permission: Permission) => boolean;
  canAny: (permissions: readonly Permission[]) => boolean;
  isPending: boolean;
}

/**
 * The one place a component asks what the signed-in user may do. Reads `/user/info` through
 * the same query the rest of the app shares, so a role change shows up as soon as that query
 * refetches.
 */
export function usePermissions(): PermissionState {
  const { data, isPending } = useUserInfo();
  const user = data && "data" in data ? data.data : null;

  return useMemo(() => {
    const permissions = resolvePermissions(user);
    const roleKey = resolveRoleKey(user);
    const fromApi = user?.grantableRoles?.filter(isRoleKey);
    return {
      permissions,
      roleKey,
      seesAllTeams: user?.scope?.all ?? (roleKey === "OWNER" || roleKey === "ADMIN"),
      grantableRoles: fromApi && fromApi.length > 0 ? fromApi : grantableRolesFor(permissions),
      can: (permission) => can(permissions, permission),
      canAny: (list) => canAny(permissions, list),
      isPending,
    };
  }, [user, isPending]);
}

/** Shorthand for a single check inside a component. */
export function useCan(permission: Permission): boolean {
  return usePermissions().can(permission);
}
