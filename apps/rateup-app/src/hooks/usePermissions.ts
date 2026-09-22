import { useMemo } from "react";

import { useLoggedInUser } from "@/api/api";

/**
 * What the signed-in user may do, as `GET /api/user/info` reports it. Mirrors the
 * permission keys in rateup-api/src/authz/permissions.ts; the API is the source of truth
 * and this app only hides actions the server would refuse anyway.
 */
export type Permission =
  | "inbox.read"
  | "inbox.reply"
  | "inbox.assign"
  | "inbox.manage"
  | "inbox.delete"
  | "loyalty.read"
  | "loyalty.cashier"
  | "loyalty.manage"
  | "flows.read"
  | "flows.manage"
  | "surveys.read"
  | "surveys.manage";

export type RoleKey = "OWNER" | "ADMIN" | "MANAGER" | "STAFF" | "AGENT" | "VIEWER";

/** Labels for the account screen; the API sends the key, not a display name. */
export const ROLE_LABELS: Record<RoleKey, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MANAGER: "Manager",
  STAFF: "Staff",
  AGENT: "Agent",
  VIEWER: "Viewer",
};

/** An older API sends only the legacy role string; map it to the nearest key. */
const LEGACY_ROLE_KEY: Record<string, RoleKey> = {
  SUPER_ADMIN: "ADMIN",
  ADMIN: "MANAGER",
  MEMBER: "STAFF",
};

// Until the API sends a permission list, an app in front of an older server keeps today's
// behaviour: every action visible, the server deciding.
const EVERYTHING: ReadonlySet<string> = new Set<Permission>([
  "inbox.read",
  "inbox.reply",
  "inbox.assign",
  "inbox.manage",
  "inbox.delete",
  "loyalty.read",
  "loyalty.cashier",
  "loyalty.manage",
  "flows.read",
  "flows.manage",
  "surveys.read",
  "surveys.manage",
]);

interface UserInfoLike {
  role?: string;
  roleKey?: string;
  permissions?: string[];
}

export function roleKeyOf(user: UserInfoLike | null | undefined): RoleKey | undefined {
  if (!user) return undefined;
  if (user.roleKey && user.roleKey in ROLE_LABELS) return user.roleKey as RoleKey;
  return user.role ? LEGACY_ROLE_KEY[user.role] : undefined;
}

export function roleLabelOf(user: UserInfoLike | null | undefined): string {
  const key = roleKeyOf(user);
  return key ? ROLE_LABELS[key] : (user?.role ?? "");
}

export function usePermissions() {
  const { data: user, isLoading } = useLoggedInUser();

  return useMemo(() => {
    const permissions: ReadonlySet<string> = Array.isArray(user?.permissions)
      ? new Set<string>(user.permissions)
      : EVERYTHING;
    return {
      permissions,
      roleKey: roleKeyOf(user),
      roleLabel: roleLabelOf(user),
      can: (permission: Permission) => permissions.has(permission),
      isLoading,
    };
  }, [user, isLoading]);
}
