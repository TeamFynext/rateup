import { ALL_PERMISSIONS, type Permission } from "./permissions.js";
import { ROLE_PERMISSIONS, ROLES, type RoleKey, type TeamScope } from "./roles.js";

/**
 * Who is making the request. Only a `user` has a role; the others used to be given
 * `role: SUPER_ADMIN` so that role checks would pass, which hid what each one may do.
 */
export type Principal =
  | { kind: "user"; userId: string; orgId: string; roleKey: RoleKey }
  | { kind: "apiKey"; orgId: string; scopes: readonly Permission[] }
  | { kind: "zapier"; orgId: string; scopes: readonly Permission[] }
  | { kind: "widget"; orgId: string }
  | { kind: "publicFlow"; orgId: string };

const NO_PERMISSIONS: ReadonlySet<Permission> = new Set();

export function permissionsFor(principal: Principal): ReadonlySet<Permission> {
  switch (principal.kind) {
    case "user":
      return ROLE_PERMISSIONS[principal.roleKey];
    case "apiKey":
    case "zapier":
      // An empty scope list is a token issued before scopes existed: full access, as before.
      return principal.scopes.length > 0 ? new Set(principal.scopes) : ALL_PERMISSIONS;
    case "widget":
    case "publicFlow":
      return NO_PERMISSIONS;
  }
}

export function teamScopeFor(principal: Principal): TeamScope {
  return principal.kind === "user" ? ROLES[principal.roleKey].teamScope : "ALL";
}
