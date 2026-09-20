import { describe, expect, test } from "vitest";

import { effectivePermissions, normaliseOverrides } from "./overrides.js";
import { ROLE_PERMISSIONS } from "./roles.js";

describe("effectivePermissions", () => {
  test("adds grants and removes denies on top of the role", () => {
    const perms = effectivePermissions("AGENT", ["campaigns.send"], ["inbox.assign"]);
    expect(perms.has("campaigns.send")).toBe(true);
    expect(perms.has("inbox.assign")).toBe(false);
    expect(perms.has("inbox.reply")).toBe(true);
  });

  test("ignores keys that are not in the catalogue", () => {
    const perms = effectivePermissions("STAFF", ["wizardry"], ["nothing.real"]);
    expect(perms).toEqual(ROLE_PERMISSIONS.STAFF);
  });

  test("the owner cannot be trimmed or widened", () => {
    expect(effectivePermissions("OWNER", [], ["org.delete"])).toEqual(ROLE_PERMISSIONS.OWNER);
  });

  test("no overrides means exactly the role", () => {
    expect(effectivePermissions("MANAGER")).toEqual(ROLE_PERMISSIONS.MANAGER);
  });
});

describe("normaliseOverrides", () => {
  test("drops grants the role already has and denies it never had, and sorts", () => {
    expect(
      normaliseOverrides(
        "STAFF",
        ["inbox.read", "billing.read", "analytics.read"],
        ["org.delete", "inbox.reply"],
      ),
    ).toEqual({
      grants: ["billing.read"],
      denies: ["inbox.reply"],
    });
  });

  test("dedupes and discards unknown keys", () => {
    expect(normaliseOverrides("AGENT", ["campaigns.send", "campaigns.send", "nope"], [])).toEqual({
      grants: ["campaigns.send"],
      denies: [],
    });
  });
});
