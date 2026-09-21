import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../utils/prisma.js", () => ({
  default: {
    orgMember: { findUnique: vi.fn() },
    teamMember: { findMany: vi.fn() },
  },
}));
vi.mock("../utils/redisConnection.js", () => ({
  default: { get: vi.fn(), set: vi.fn(), del: vi.fn(), scan: vi.fn() },
}));
vi.mock("../utils/logger.js", () => ({ log: { warn: vi.fn(), error: vi.fn() } }));

import prisma from "../utils/prisma.js";
import redis from "../utils/redisConnection.js";
import { buildActor, bustActor, bustActorsForOrg, inboxScopeFor, loadActor } from "./actor.js";
import { ROLE_PERMISSIONS } from "./roles.js";
import { assertInScope, inScope, scopeWhere } from "./scope.js";

type Mock = ReturnType<typeof vi.fn>;
const db = prisma as unknown as { orgMember: { findUnique: Mock }; teamMember: { findMany: Mock } };
const cache = redis as unknown as { get: Mock; set: Mock; del: Mock; scan: Mock };

const member = (role: string, ownerId = "owner", policy = "All") => ({
  role,
  roleKey: null,
  permissionGrants: [],
  permissionDenies: [],
  org: { ownerId, waAssignedChatPermission: policy },
});

beforeEach(() => {
  vi.clearAllMocks();
  cache.get.mockResolvedValue(null);
  cache.set.mockResolvedValue("OK");
  db.teamMember.findMany.mockResolvedValue([{ teamId: "t1" }, { teamId: "t2" }]);
});

describe("loadActor", () => {
  test("returns null for someone who is not a member", async () => {
    db.orgMember.findUnique.mockResolvedValue(null);
    expect(await loadActor("u1", "o1")).toBeNull();
    expect(cache.set).not.toHaveBeenCalled();
  });

  test("the org owner becomes OWNER with every team", async () => {
    db.orgMember.findUnique.mockResolvedValue(member("SUPER_ADMIN", "u1"));
    const actor = await loadActor("u1", "o1");
    expect(actor?.roleKey).toBe("OWNER");
    expect(actor?.scope).toEqual({ all: true, teamIds: [], inbox: "all" });
    expect(db.teamMember.findMany).not.toHaveBeenCalled();
  });

  test("a written roleKey wins over the legacy column", async () => {
    db.orgMember.findUnique.mockResolvedValue({ ...member("MEMBER"), roleKey: "MANAGER" });
    expect((await loadActor("u1", "o1"))?.roleKey).toBe("MANAGER");
  });

  test("an unknown roleKey falls back to the legacy column", async () => {
    db.orgMember.findUnique.mockResolvedValue({ ...member("MEMBER"), roleKey: "WIZARD" });
    expect((await loadActor("u1", "o1"))?.roleKey).toBe("STAFF");
  });

  test("another SUPER_ADMIN becomes ADMIN", async () => {
    db.orgMember.findUnique.mockResolvedValue(member("SUPER_ADMIN"));
    expect((await loadActor("u1", "o1"))?.roleKey).toBe("ADMIN");
  });

  test("a MEMBER becomes STAFF scoped to their teams in this org only", async () => {
    db.orgMember.findUnique.mockResolvedValue(member("MEMBER"));
    const actor = await loadActor("u1", "o1");
    expect(actor?.roleKey).toBe("STAFF");
    expect(actor?.scope.all).toBe(false);
    expect(actor?.scope.teamIds).toEqual(["t1", "t2"]);
    expect(db.teamMember.findMany).toHaveBeenCalledWith({
      where: { userId: "u1", team: { orgId: "o1" } },
      select: { teamId: true },
    });
    expect(actor?.can("inbox.reply")).toBe(true);
    expect(actor?.can("billing.manage")).toBe(false);
  });

  test("hand-picked grants and denies ride on the role", async () => {
    db.orgMember.findUnique.mockResolvedValue({
      ...member("MEMBER"),
      permissionGrants: ["billing.read"],
      permissionDenies: ["campaigns.send"],
    });
    const actor = await loadActor("u1", "o1");
    expect(actor?.can("billing.read")).toBe(true);
    expect(actor?.can("campaigns.send")).toBe(false);
    expect(actor?.can("campaigns.manage")).toBe(true);
  });

  test("the owner's overrides, if any were stored, change nothing", async () => {
    db.orgMember.findUnique.mockResolvedValue({
      ...member("SUPER_ADMIN", "u1"),
      permissionDenies: ["org.delete"],
    });
    expect((await loadActor("u1", "o1"))?.can("org.delete")).toBe(true);
  });

  test("caches the membership and serves the next call from the cache", async () => {
    db.orgMember.findUnique.mockResolvedValue(member("ADMIN", "owner", "Admins"));
    await loadActor("u1", "o1");
    expect(cache.set).toHaveBeenCalledWith("authz:u1:o1", expect.any(String), "EX", 60);
    const stored = JSON.parse(cache.set.mock.calls[0][1]);
    expect(stored).toEqual({
      roleKey: "MANAGER",
      teamIds: ["t1", "t2"],
      inboxPolicy: "Admins",
      grants: [],
      denies: [],
    });

    cache.get.mockResolvedValue(JSON.stringify(stored));
    db.orgMember.findUnique.mockClear();
    const again = await loadActor("u1", "o1");
    expect(db.orgMember.findUnique).not.toHaveBeenCalled();
    expect(again?.roleKey).toBe("MANAGER");
    expect(again?.scope.teamIds).toEqual(["t1", "t2"]);
  });

  test("a Redis failure falls back to Postgres instead of refusing", async () => {
    cache.get.mockRejectedValue(new Error("ECONNREFUSED"));
    cache.set.mockRejectedValue(new Error("ECONNREFUSED"));
    db.orgMember.findUnique.mockResolvedValue(member("MEMBER"));
    expect((await loadActor("u1", "o1"))?.roleKey).toBe("STAFF");
  });
});

describe("inbox scope", () => {
  test("org-wide roles always see everything", () => {
    expect(inboxScopeFor("ALL", "Admins", ROLE_PERMISSIONS.ADMIN)).toBe("all");
  });

  test("TeamMembers limits team-scoped roles to their teams", () => {
    expect(inboxScopeFor("OWN_TEAMS", "TeamMembers", ROLE_PERMISSIONS.MANAGER)).toBe("own_teams");
    expect(inboxScopeFor("OWN_TEAMS", "TeamMembers", ROLE_PERMISSIONS.STAFF)).toBe("own_teams");
  });

  test("Admins keeps today's line: a manager sees all, staff only their own", () => {
    expect(inboxScopeFor("OWN_TEAMS", "Admins", ROLE_PERMISSIONS.MANAGER)).toBe("all");
    expect(inboxScopeFor("OWN_TEAMS", "Admins", ROLE_PERMISSIONS.STAFF)).toBe("assigned_only");
    expect(inboxScopeFor("OWN_TEAMS", "Admins", ROLE_PERMISSIONS.AGENT)).toBe("assigned_only");
  });

  test("All, or an unknown value, means no assignment filter", () => {
    expect(inboxScopeFor("OWN_TEAMS", "All", ROLE_PERMISSIONS.STAFF)).toBe("all");
    expect(inboxScopeFor("OWN_TEAMS", "garbage", ROLE_PERMISSIONS.STAFF)).toBe("all");
  });
});

describe("non-user principals", () => {
  test("an API key without scopes has every permission and every team", () => {
    const actor = buildActor({ kind: "apiKey", orgId: "o1", scopes: [] });
    expect(actor.can("org.delete")).toBe(true);
    expect(actor.scope.all).toBe(true);
    expect(actor.userId).toBeUndefined();
  });

  test("a scoped API key has only its scopes", () => {
    const actor = buildActor({ kind: "zapier", orgId: "o1", scopes: ["contacts.read"] });
    expect(actor.can("contacts.read")).toBe(true);
    expect(actor.can("contacts.manage")).toBe(false);
  });

  test("the widget and the public flow callback can do nothing", () => {
    expect(buildActor({ kind: "widget", orgId: "o1" }).permissions.size).toBe(0);
    expect(buildActor({ kind: "publicFlow", orgId: "o1" }).permissions.size).toBe(0);
  });
});

describe("scope helpers", () => {
  const staff = buildActor(
    { kind: "user", userId: "u1", orgId: "o1", roleKey: "STAFF" },
    { teamIds: ["t1"] },
  );
  const admin = buildActor({ kind: "user", userId: "u2", orgId: "o1", roleKey: "ADMIN" });

  test("scopeWhere is empty for org-wide roles and an `in` list otherwise", () => {
    expect(scopeWhere(admin)).toEqual({});
    expect(scopeWhere(staff)).toEqual({ teamId: { in: ["t1"] } });
    expect(scopeWhere(staff, "ownerTeamId")).toEqual({ ownerTeamId: { in: ["t1"] } });
  });

  test("rows with no team are org-wide and pass", () => {
    expect(inScope(staff, null)).toBe(true);
    expect(inScope(staff, "t1")).toBe(true);
    expect(inScope(staff, "t9")).toBe(false);
    expect(inScope(admin, "t9")).toBe(true);
  });

  test("assertInScope refuses with reason scope", () => {
    expect(() => assertInScope(staff, "t9")).toThrow(/outside your access/);
    expect(() => assertInScope(staff, "t1")).not.toThrow();
  });
});

describe("cache busting", () => {
  test("bustActor deletes the user's key", async () => {
    await bustActor("u1", "o1");
    expect(cache.del).toHaveBeenCalledWith("authz:u1:o1");
  });

  test("bustActorsForOrg scans every key for the org", async () => {
    cache.scan
      .mockResolvedValueOnce(["7", ["authz:a:o1", "authz:b:o1"]])
      .mockResolvedValueOnce(["0", []]);
    await bustActorsForOrg("o1");
    expect(cache.scan).toHaveBeenCalledWith("0", "MATCH", "authz:*:o1", "COUNT", 200);
    expect(cache.del).toHaveBeenCalledWith("authz:a:o1", "authz:b:o1");
  });
});
