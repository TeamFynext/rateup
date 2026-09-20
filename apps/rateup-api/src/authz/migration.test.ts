import { describe, expect, test } from "vitest";

import { planOrgRoles, tallyRoles } from "./migration.js";

const at = (n: number) => new Date(2026, 0, n);
const member = (
  userId: string,
  role: "SUPER_ADMIN" | "ADMIN" | "MEMBER",
  day = 1,
  roleKey: string | null = null,
) => ({ userId, role, roleKey, createdAt: at(day) }) as const;

describe("planOrgRoles", () => {
  test("renames every legacy role, with the owner the only OWNER", () => {
    const plan = planOrgRoles({
      id: "o1",
      ownerId: "u1",
      members: [
        member("u1", "SUPER_ADMIN"),
        member("u2", "SUPER_ADMIN"),
        member("u3", "ADMIN"),
        member("u4", "MEMBER"),
      ],
    });
    expect(plan.updates).toEqual([
      { userId: "u1", roleKey: "OWNER" },
      { userId: "u2", roleKey: "ADMIN" },
      { userId: "u3", roleKey: "MANAGER" },
      { userId: "u4", roleKey: "STAFF" },
    ]);
    expect(plan.newOwnerId).toBeUndefined();
    expect(plan.warnings).toEqual([]);
  });

  test("skips members already carrying a role key, so a rerun changes nothing", () => {
    const plan = planOrgRoles({
      id: "o1",
      ownerId: "u1",
      members: [
        member("u1", "SUPER_ADMIN", 1, "OWNER"),
        member("u2", "MEMBER", 2, "STAFF"),
        member("u3", "MEMBER", 3),
      ],
    });
    expect(plan.updates).toEqual([{ userId: "u3", roleKey: "STAFF" }]);
    expect(plan.warnings).toEqual([]);
  });

  test("promotes the oldest SUPER_ADMIN when the recorded owner is not a member", () => {
    const plan = planOrgRoles({
      id: "o1",
      ownerId: "gone",
      members: [
        member("u2", "SUPER_ADMIN", 5),
        member("u1", "SUPER_ADMIN", 2),
        member("u3", "MEMBER", 1),
      ],
    });
    expect(plan.newOwnerId).toBe("u1");
    expect(plan.updates).toEqual([
      { userId: "u2", roleKey: "ADMIN" },
      { userId: "u1", roleKey: "OWNER" },
      { userId: "u3", roleKey: "STAFF" },
    ]);
    expect(plan.warnings[0]).toMatch(/promoting u1/);
  });

  test("warns, and changes no owner, when nobody can be promoted", () => {
    const plan = planOrgRoles({ id: "o1", ownerId: "gone", members: [member("u3", "MEMBER")] });
    expect(plan.newOwnerId).toBeUndefined();
    expect(plan.warnings).toEqual([
      "ownerId gone is not a member and no SUPER_ADMIN exists to promote",
      "org ends with 0 owner(s)",
    ]);
  });

  test("tallyRoles counts the landings", () => {
    const plans = [
      planOrgRoles({
        id: "a",
        ownerId: "u1",
        members: [member("u1", "SUPER_ADMIN"), member("u2", "MEMBER")],
      }),
      planOrgRoles({
        id: "b",
        ownerId: "u3",
        members: [member("u3", "SUPER_ADMIN"), member("u4", "ADMIN")],
      }),
    ];
    expect(tallyRoles(plans)).toEqual({
      OWNER: 2,
      ADMIN: 0,
      MANAGER: 1,
      STAFF: 1,
      AGENT: 0,
      VIEWER: 0,
    });
  });
});
