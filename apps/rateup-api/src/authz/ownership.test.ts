import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../utils/prisma.js", () => ({
  default: {
    org: { findUnique: vi.fn(), update: vi.fn() },
    orgMember: { findUnique: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(),
  },
}));
vi.mock("./actor.js", () => ({ bustActor: vi.fn() }));

import prisma from "../utils/prisma.js";
import { bustActor } from "./actor.js";
import { ForbiddenError } from "./errors.js";
import { assertMemberOfOrg, assertNotOwner, isOrgOwner, transferOwnership } from "./ownership.js";

type Mock = ReturnType<typeof vi.fn>;
const db = prisma as unknown as {
  org: { findUnique: Mock; update: Mock };
  orgMember: { findUnique: Mock; update: Mock };
  $transaction: Mock;
};

beforeEach(() => {
  vi.clearAllMocks();
  db.org.findUnique.mockResolvedValue({ ownerId: "owner" });
  db.$transaction.mockResolvedValue([]);
});

describe("owner protection", () => {
  test("isOrgOwner reads Org.ownerId", async () => {
    expect(await isOrgOwner("o1", "owner")).toBe(true);
    expect(await isOrgOwner("o1", "other")).toBe(false);
  });

  test("assertNotOwner refuses the owner and names the way out", async () => {
    await expect(assertNotOwner("o1", "owner", "paused")).rejects.toMatchObject({
      statusCode: 403,
      permission: "org.transfer_ownership",
      message: expect.stringContaining("cannot be paused"),
    });
    await expect(assertNotOwner("o1", "other", "paused")).resolves.toBeUndefined();
  });

  test("assertMemberOfOrg refuses a user from another org", async () => {
    db.orgMember.findUnique.mockResolvedValue(null);
    await expect(assertMemberOfOrg("o1", "stranger")).rejects.toBeInstanceOf(ForbiddenError);
    db.orgMember.findUnique.mockResolvedValue({ userId: "u2" });
    await expect(assertMemberOfOrg("o1", "u2")).resolves.toBeUndefined();
  });
});

describe("transferOwnership", () => {
  test("refuses handing the org to yourself", async () => {
    await expect(transferOwnership("o1", "owner", "owner")).rejects.toBeInstanceOf(ForbiddenError);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  test("refuses a non-member and a paused member", async () => {
    db.orgMember.findUnique.mockResolvedValueOnce(null);
    await expect(transferOwnership("o1", "owner", "ghost")).rejects.toThrow(/already be a member/);
    db.orgMember.findUnique.mockResolvedValueOnce({
      userId: "u2",
      user: { active: true, isPaused: true },
    });
    await expect(transferOwnership("o1", "owner", "u2")).rejects.toThrow(/active member/);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  test("moves ownerId, makes the target OWNER, leaves the old owner as ADMIN, busts both", async () => {
    db.orgMember.findUnique.mockResolvedValue({
      userId: "u2",
      user: { active: true, isPaused: false },
    });
    await transferOwnership("o1", "owner", "u2");
    expect(db.org.update).toHaveBeenCalledWith({ where: { id: "o1" }, data: { ownerId: "u2" } });
    expect(db.orgMember.update).toHaveBeenCalledWith({
      where: { userId_orgId: { userId: "u2", orgId: "o1" } },
      data: { role: "SUPER_ADMIN", roleKey: "OWNER" },
    });
    expect(db.orgMember.update).toHaveBeenCalledWith({
      where: { userId_orgId: { userId: "owner", orgId: "o1" } },
      data: { role: "SUPER_ADMIN", roleKey: "ADMIN" },
    });
    expect(db.$transaction).toHaveBeenCalledOnce();
    expect(bustActor).toHaveBeenCalledWith("owner", "o1");
    expect(bustActor).toHaveBeenCalledWith("u2", "o1");
  });
});
