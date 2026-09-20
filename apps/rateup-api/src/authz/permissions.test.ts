import { describe, expect, test } from "vitest";

import { ALL_PERMISSIONS, isPermission, PERMISSIONS } from "./permissions.js";
import {
  DEFAULT_INVITED_ROLE,
  legacyRolesWith,
  legacyRoleToKey,
  ROLE_KEYS,
  ROLE_PERMISSIONS,
  ROLES,
  roleKeyToLegacy,
  rolesWith,
} from "./roles.js";

const sorted = (set: ReadonlySet<string>) => [...set].sort();

describe("permission catalogue", () => {
  test("every key is resource.action with no duplicates", () => {
    expect(new Set(PERMISSIONS).size).toBe(PERMISSIONS.length);
    for (const key of PERMISSIONS) expect(key).toMatch(/^[a-z_]+(\.[a-z_]+){1,2}$/);
  });

  test("isPermission recognises catalogue keys only", () => {
    expect(isPermission("inbox.read")).toBe(true);
    expect(isPermission("SUPER_ADMIN")).toBe(false);
  });
});

describe("system roles", () => {
  test("the six roles exist, each with a label, summary and scope", () => {
    expect(ROLE_KEYS).toEqual(["OWNER", "ADMIN", "MANAGER", "STAFF", "AGENT", "VIEWER"]);
    for (const key of ROLE_KEYS) {
      expect(ROLES[key].label).toBeTruthy();
      expect(ROLES[key].summary).toBeTruthy();
      expect(["ALL", "OWN_TEAMS"]).toContain(ROLES[key].teamScope);
    }
  });

  test("OWNER and ADMIN see every team; the rest see their own", () => {
    expect(ROLES.OWNER.teamScope).toBe("ALL");
    expect(ROLES.ADMIN.teamScope).toBe("ALL");
    for (const key of ["MANAGER", "STAFF", "AGENT", "VIEWER"] as const) {
      expect(ROLES[key].teamScope).toBe("OWN_TEAMS");
    }
  });

  test("OWNER holds everything; ADMIN holds everything but deleting and transferring the org", () => {
    expect(sorted(ROLE_PERMISSIONS.OWNER)).toEqual(sorted(ALL_PERMISSIONS));
    const adminMissing = [...ALL_PERMISSIONS].filter((p) => !ROLE_PERMISSIONS.ADMIN.has(p)).sort();
    expect(adminMissing).toEqual(["org.delete", "org.transfer_ownership"]);
  });

  // MANAGER and STAFF are frozen: they are the legacy ADMIN and MEMBER, and parity.test.ts
  // checks them against the old route guards. Changing a line here is a product decision.
  test("MANAGER is frozen to today's ADMIN", () => {
    expect(sorted(ROLE_PERMISSIONS.MANAGER)).toEqual([
      "analytics.read",
      "automation.manage",
      "automation.read",
      "campaigns.manage",
      "campaigns.read",
      "campaigns.send",
      "catalog.manage",
      "channels.read",
      "chatbots.manage",
      "chatbots.read",
      "contacts.export",
      "contacts.manage",
      "contacts.read",
      "flows.manage",
      "flows.read",
      "inbox.assign",
      "inbox.delete",
      "inbox.export",
      "inbox.manage",
      "inbox.read",
      "inbox.reply",
      "integrations.manage",
      "integrations.read",
      "integrations.shopify",
      "loyalty.accounts.delete",
      "loyalty.accounts.export",
      "loyalty.approve",
      "loyalty.cashier",
      "loyalty.manage",
      "loyalty.read",
      "members.invite",
      "members.read",
      "meta_agent.manage",
      "meta_agent.read",
      "meta_agent.use",
      "notify.billing",
      "notify.integrations",
      "org.settings",
      "org.webhook_secret",
      "pipelines.manage",
      "pipelines.read",
      "responses.manage",
      "surveys.manage",
      "surveys.read",
      "teams.manage_members",
      "teams.read",
      "templates.manage",
      "templates.read",
      "templates.sync",
      "webhooks.manage",
      "webhooks.read",
    ]);
  });

  test("STAFF is frozen to today's MEMBER", () => {
    expect(sorted(ROLE_PERMISSIONS.STAFF)).toEqual([
      "analytics.read",
      "automation.manage",
      "automation.read",
      "campaigns.manage",
      "campaigns.read",
      "campaigns.send",
      "catalog.manage",
      "channels.read",
      "chatbots.read",
      "contacts.manage",
      "contacts.read",
      "flows.manage",
      "flows.read",
      "inbox.assign",
      "inbox.read",
      "inbox.reply",
      "integrations.read",
      "loyalty.cashier",
      "loyalty.read",
      "members.read",
      "meta_agent.read",
      "meta_agent.use",
      "pipelines.manage",
      "pipelines.read",
      "surveys.manage",
      "surveys.read",
      "teams.read",
      "templates.manage",
      "templates.read",
    ]);
  });

  test("roles nest: VIEWER ⊂ STAFF, AGENT ⊂ STAFF ⊂ MANAGER ⊂ ADMIN ⊂ OWNER", () => {
    const subset = (a: ReadonlySet<string>, b: ReadonlySet<string>) =>
      [...a].every((p) => b.has(p));
    expect(subset(ROLE_PERMISSIONS.AGENT, ROLE_PERMISSIONS.STAFF)).toBe(true);
    expect(subset(ROLE_PERMISSIONS.STAFF, ROLE_PERMISSIONS.MANAGER)).toBe(true);
    expect(subset(ROLE_PERMISSIONS.MANAGER, ROLE_PERMISSIONS.ADMIN)).toBe(true);
    expect(subset(ROLE_PERMISSIONS.ADMIN, ROLE_PERMISSIONS.OWNER)).toBe(true);
    expect(subset(ROLE_PERMISSIONS.VIEWER, ROLE_PERMISSIONS.STAFF)).toBe(true);
  });

  test("AGENT can reply and serve the counter but not configure anything", () => {
    expect(ROLE_PERMISSIONS.AGENT.has("inbox.reply")).toBe(true);
    expect(ROLE_PERMISSIONS.AGENT.has("loyalty.cashier")).toBe(true);
    for (const p of ROLE_PERMISSIONS.AGENT) expect(p).not.toMatch(/\.(manage|delete|send|sync)$/);
  });

  test("VIEWER is the read-only half of STAFF", () => {
    expect(sorted(ROLE_PERMISSIONS.VIEWER)).toEqual(
      [...ROLE_PERMISSIONS.STAFF].filter((p) => p.endsWith(".read")).sort(),
    );
  });

  test("the invitation default is STAFF, not an administrator", () => {
    expect(DEFAULT_INVITED_ROLE).toBe("STAFF");
  });
});

describe("legacy role mapping", () => {
  test("SUPER_ADMIN splits by ownership; ADMIN and MEMBER rename", () => {
    expect(legacyRoleToKey("SUPER_ADMIN", true)).toBe("OWNER");
    expect(legacyRoleToKey("SUPER_ADMIN", false)).toBe("ADMIN");
    expect(legacyRoleToKey("ADMIN", false)).toBe("MANAGER");
    expect(legacyRoleToKey("MEMBER", false)).toBe("STAFF");
  });

  test("the legacy column keeps a value for every new role", () => {
    expect(roleKeyToLegacy("OWNER")).toBe("SUPER_ADMIN");
    expect(roleKeyToLegacy("ADMIN")).toBe("SUPER_ADMIN");
    expect(roleKeyToLegacy("MANAGER")).toBe("ADMIN");
    expect(roleKeyToLegacy("STAFF")).toBe("MEMBER");
    expect(roleKeyToLegacy("AGENT")).toBe("MEMBER");
    expect(roleKeyToLegacy("VIEWER")).toBe("MEMBER");
  });

  test("rolesWith / legacyRolesWith answer recipient queries", () => {
    expect(rolesWith("billing.manage")).toEqual(["OWNER", "ADMIN"]);
    expect(rolesWith("notify.billing")).toEqual(["OWNER", "ADMIN", "MANAGER"]);
    expect(legacyRolesWith("notify.billing")).toEqual(["SUPER_ADMIN", "ADMIN"]);
    expect(legacyRolesWith("inbox.reply")).toEqual(["SUPER_ADMIN", "ADMIN", "MEMBER"]);
    expect(legacyRolesWith("org.delete")).toEqual([]);
  });
});
