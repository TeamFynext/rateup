import type { Actor } from "./actor.js";
import { ForbiddenError } from "./errors.js";
import { API_KEY_FEATURE_NAMES, permissionsForFeatures } from "./apiKeyFeatures.js";
import { isPermission, KEY_ONLY_PERMISSIONS } from "./permissions.js";
import { ROLE_KEYS, ROLE_PERMISSIONS, type RoleKey } from "./roles.js";

function isSubset<T>(inner: ReadonlySet<T>, outer: ReadonlySet<T>): boolean {
  for (const item of inner) if (!outer.has(item)) return false;
  return true;
}

/**
 * Roles the actor may hand out: any whose permissions it holds itself, never OWNER.
 * Ownership moves by transfer (`org.transfer_ownership`), so there is always exactly one.
 */
export function grantableRoles(actor: Actor): RoleKey[] {
  return ROLE_KEYS.filter(
    (key) => key !== "OWNER" && isSubset(ROLE_PERMISSIONS[key], actor.permissions),
  );
}

export function canGrant(actor: Actor, target: RoleKey): boolean {
  return grantableRoles(actor).includes(target);
}

/**
 * Hand-picked grants follow the role rule: only permissions the actor holds. Denies need no
 * check, since taking something away can never exceed the actor's own reach.
 */
export function assertCanGrantPermissions(actor: Actor, grants: readonly string[]): void {
  const beyond = grants.filter((p) => !isPermission(p) || !actor.permissions.has(p));
  if (beyond.length > 0) {
    throw new ForbiddenError(
      `You cannot grant ${beyond.join(", ")}: you do not hold it yourself.`,
      {
        reason: "permission",
        permission: "members.manage_roles",
      },
    );
  }
}

export function assertCanGrant(actor: Actor, target: RoleKey): void {
  if (target === "OWNER") {
    throw new ForbiddenError("Ownership is transferred, not granted.", {
      reason: "permission",
      permission: "org.transfer_ownership",
    });
  }
  if (!canGrant(actor, target)) {
    throw new ForbiddenError(
      `You cannot grant the ${target} role: it has permissions you do not hold.`,
      {
        reason: "permission",
        permission: "members.manage_roles",
      },
    );
  }
}

/**
 * What a member may put on an API key. A key is org-wide (principal.ts gives it team scope
 * ALL), so a team-scoped member cannot mint or widen one at all; otherwise the key may carry
 * only permissions the member holds, plus the key-only ones (`widget.connect`), which no role
 * bundles. `scopes` is the stored list: empty is a legacy full-access key, whose reach is
 * every partner API feature (keys open only token routes), so rotating one asks for those.
 */
export function assertCanGrantKeyScopes(actor: Actor, scopes: readonly string[]): void {
  if (!actor.scope.all) {
    throw new ForbiddenError(
      "API keys reach every team; you can only manage keys for the teams you belong to.",
      { reason: "scope", permission: "api_tokens.manage" },
    );
  }
  const asked = scopes.length > 0 ? scopes : permissionsForFeatures(API_KEY_FEATURE_NAMES);
  const beyond = asked.filter(
    (p) => !isPermission(p) || (!KEY_ONLY_PERMISSIONS.has(p) && !actor.permissions.has(p)),
  );
  if (beyond.length > 0) {
    throw new ForbiddenError(
      `This key would hold ${beyond.join(", ")}, which you do not hold yourself.`,
      { reason: "permission", permission: isPermission(beyond[0]) ? beyond[0] : undefined },
    );
  }
}
