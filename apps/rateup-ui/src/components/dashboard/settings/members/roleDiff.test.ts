import { describe, expect, test } from "vitest";

import { firstRoleWith, grantsAt, ROLE_LADDER, roleDiff } from "./roleDiff.ts";

describe("roleDiff", () => {
  test("promotion only gains, demotion only loses, on a nested ladder", () => {
    const up = roleDiff("STAFF", "MANAGER");
    expect(up.loses).toEqual([]);
    expect(up.gains).toContain("members.invite");
    const down = roleDiff("MANAGER", "AGENT");
    expect(down.gains).toEqual([]);
    expect(down.loses).toContain("campaigns.send");
  });

  test("from nothing, everything is a gain", () => {
    expect(roleDiff(undefined, "VIEWER").loses).toEqual([]);
    expect(roleDiff(undefined, "VIEWER").gains.length).toBeGreaterThan(0);
  });
});

describe("the ladder", () => {
  test("from Agent upward every step includes the one before it", () => {
    for (let i = 2; i < ROLE_LADDER.length; i += 1) {
      expect(roleDiff(ROLE_LADDER[i - 1], ROLE_LADDER[i]).loses).toEqual([]);
    }
  });

  test("Viewer is a read-only side branch: inside Staff, not inside Agent", () => {
    expect(roleDiff("VIEWER", "STAFF").loses).toEqual([]);
    expect(roleDiff("VIEWER", "AGENT").loses).not.toEqual([]);
  });

  test("grantsAt marks the step where an ability enters, and re-enters after a gap", () => {
    expect(grantsAt("inbox.reply", "AGENT")).toBe(true);
    expect(grantsAt("inbox.reply", "STAFF")).toBe(false);
    // Viewer reads campaigns, Agent does not, Staff does again.
    expect(grantsAt("campaigns.read", "VIEWER")).toBe(true);
    expect(grantsAt("campaigns.read", "STAFF")).toBe(true);
    expect(grantsAt("org.delete", "OWNER")).toBe(true);
  });

  test("firstRoleWith names the step that grants a permission", () => {
    expect(firstRoleWith("inbox.reply")).toBe("AGENT");
    expect(firstRoleWith("campaigns.manage")).toBe("STAFF");
    expect(firstRoleWith("members.invite")).toBe("MANAGER");
    expect(firstRoleWith("billing.manage")).toBe("ADMIN");
    expect(firstRoleWith("org.delete")).toBe("OWNER");
    expect(firstRoleWith("inbox.read")).toBe("VIEWER");
  });
});
