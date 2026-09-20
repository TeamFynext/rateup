import { describe, expect, test } from "vitest";

import { buildActor } from "./actor.js";
import { ForbiddenError } from "./errors.js";
import { assertCanGrant, assertCanGrantPermissions, canGrant, grantableRoles } from "./grant.js";
import type { RoleKey } from "./roles.js";

const actorWith = (roleKey: RoleKey) =>
  buildActor({ kind: "user", userId: "u1", orgId: "o1", roleKey });

describe("grantableRoles", () => {
  test("an owner can grant every role but owner", () => {
    expect(grantableRoles(actorWith("OWNER"))).toEqual([
      "ADMIN",
      "MANAGER",
      "STAFF",
      "AGENT",
      "VIEWER",
    ]);
  });

  test("an admin can grant every role but owner", () => {
    expect(grantableRoles(actorWith("ADMIN"))).toEqual([
      "ADMIN",
      "MANAGER",
      "STAFF",
      "AGENT",
      "VIEWER",
    ]);
  });

  test("a manager can grant manager and below", () => {
    expect(grantableRoles(actorWith("MANAGER"))).toEqual(["MANAGER", "STAFF", "AGENT", "VIEWER"]);
  });

  test("staff can grant nothing above themselves", () => {
    expect(grantableRoles(actorWith("STAFF"))).toEqual(["STAFF", "AGENT", "VIEWER"]);
  });

  test("an API key with full scope can grant anything but owner", () => {
    const actor = buildActor({ kind: "apiKey", orgId: "o1", scopes: [] });
    expect(canGrant(actor, "ADMIN")).toBe(true);
    expect(canGrant(actor, "OWNER")).toBe(false);
  });
});

describe("assertCanGrant", () => {
  test("nobody grants OWNER", () => {
    expect(() => assertCanGrant(actorWith("OWNER"), "OWNER")).toThrow(ForbiddenError);
  });

  test("a manager granting ADMIN is refused with the permission named", () => {
    try {
      assertCanGrant(actorWith("MANAGER"), "ADMIN");
      throw new Error("expected a refusal");
    } catch (err) {
      expect(err).toBeInstanceOf(ForbiddenError);
      const e = err as ForbiddenError;
      expect(e.statusCode).toBe(403);
      expect(e.toBody()).toMatchObject({
        reason: "permission",
        permission: "members.manage_roles",
      });
    }
  });

  test("a manager granting STAFF passes", () => {
    expect(() => assertCanGrant(actorWith("MANAGER"), "STAFF")).not.toThrow();
  });
});

describe("assertCanGrantPermissions", () => {
  test("a manager may hand out what a manager holds", () => {
    expect(() =>
      assertCanGrantPermissions(actorWith("MANAGER"), ["inbox.delete", "loyalty.manage"]),
    ).not.toThrow();
  });

  test("but nothing beyond it, and nothing unknown", () => {
    expect(() => assertCanGrantPermissions(actorWith("MANAGER"), ["billing.manage"])).toThrow(
      ForbiddenError,
    );
    expect(() => assertCanGrantPermissions(actorWith("OWNER"), ["wizardry"])).toThrow(
      ForbiddenError,
    );
  });
});
