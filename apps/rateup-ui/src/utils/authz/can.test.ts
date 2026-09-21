import { describe, expect, test } from "vitest";

import { can, canAny, resolvePermissions, resolveRoleKey } from "./can.ts";
import { PERMISSIONS } from "./permissions.ts";
import { grantableRolesFor, ROLE_PERMISSIONS } from "./roles.ts";

describe("resolvePermissions", () => {
  test("uses the API's list when present, dropping keys it does not know", () => {
    const perms = resolvePermissions({ permissions: ["inbox.read", "not.real"], roleKey: "OWNER" });
    expect([...perms]).toEqual(["inbox.read"]);
  });

  test("falls back to the role key's bundle while the API is older", () => {
    expect(resolvePermissions({ roleKey: "AGENT" })).toEqual(ROLE_PERMISSIONS.AGENT);
  });

  test("falls back to the legacy role string when even the key is missing", () => {
    expect(resolvePermissions({ role: "MEMBER" })).toEqual(ROLE_PERMISSIONS.STAFF);
    expect(resolvePermissions({ role: "ADMIN" })).toEqual(ROLE_PERMISSIONS.MANAGER);
    expect(resolvePermissions({ role: "SUPER_ADMIN" })).toEqual(ROLE_PERMISSIONS.ADMIN);
  });

  test("nobody signed in means nothing", () => {
    expect(resolvePermissions(null).size).toBe(0);
    expect(resolvePermissions({ role: "WIZARD" }).size).toBe(0);
  });
});

describe("resolveRoleKey", () => {
  test("prefers roleKey, then the legacy role", () => {
    expect(resolveRoleKey({ roleKey: "MANAGER", role: "MEMBER" })).toBe("MANAGER");
    expect(resolveRoleKey({ role: "MEMBER" })).toBe("STAFF");
    expect(resolveRoleKey({ roleKey: "WIZARD" })).toBeUndefined();
  });
});

describe("can / canAny", () => {
  const staff = ROLE_PERMISSIONS.STAFF;
  test("answers membership", () => {
    expect(can(staff, "inbox.reply")).toBe(true);
    expect(can(staff, "billing.manage")).toBe(false);
    expect(canAny(staff, ["billing.manage", "inbox.reply"])).toBe(true);
  });
});

describe("the mirror", () => {
  test("roles nest the way the API's do", () => {
    const subset = (a: ReadonlySet<string>, b: ReadonlySet<string>) =>
      [...a].every((p) => b.has(p));
    expect(subset(ROLE_PERMISSIONS.VIEWER, ROLE_PERMISSIONS.STAFF)).toBe(true);
    expect(subset(ROLE_PERMISSIONS.AGENT, ROLE_PERMISSIONS.STAFF)).toBe(true);
    expect(subset(ROLE_PERMISSIONS.STAFF, ROLE_PERMISSIONS.MANAGER)).toBe(true);
    expect(subset(ROLE_PERMISSIONS.MANAGER, ROLE_PERMISSIONS.ADMIN)).toBe(true);
    expect(subset(ROLE_PERMISSIONS.ADMIN, ROLE_PERMISSIONS.OWNER)).toBe(true);
    expect(ROLE_PERMISSIONS.OWNER.size).toBe(PERMISSIONS.length);
  });

  test("grantable roles are those inside the actor's own bundle, never owner", () => {
    expect(grantableRolesFor(ROLE_PERMISSIONS.OWNER)).toEqual([
      "ADMIN",
      "MANAGER",
      "STAFF",
      "AGENT",
      "VIEWER",
    ]);
    expect(grantableRolesFor(ROLE_PERMISSIONS.MANAGER)).toEqual([
      "MANAGER",
      "STAFF",
      "AGENT",
      "VIEWER",
    ]);
    expect(grantableRolesFor(ROLE_PERMISSIONS.AGENT)).toEqual(["AGENT"]);
  });
});
