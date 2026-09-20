import type { Actor } from "./actor.js";
import { ForbiddenError } from "./errors.js";
import { isPermission } from "./permissions.js";
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
