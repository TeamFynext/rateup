import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../utils/prisma.js", () => ({
  default: {
    user: { findUnique: vi.fn(), update: vi.fn() },
    orgMember: { findFirst: vi.fn() },
  },
  excludeFields: vi.fn(),
}));

vi.mock("../subscription/subscription.service.js", () => ({
  createFreePlanSubscription: vi.fn(),
}));
vi.mock("../survey/survey.service.js", () => ({ cloneSurvey: vi.fn() }));
vi.mock("../referrals/referrals.service.js", () => ({ updateReferral: vi.fn() }));
vi.mock("../../utils/hubspot.js", () => ({
  createHubSpotCompany: vi.fn(),
  createHubSpotContact: vi.fn(),
}));
vi.mock("../../utils/supertoken/supertoken.js", () => ({
  deleteSuperTokenUserForId: vi.fn(),
  getUserInfo: vi.fn(),
  getAsRecipeUserIdType: vi.fn(),
}));
vi.mock("supertokens-node", () => ({ default: { getUser: vi.fn() } }));
vi.mock("supertokens-node/recipe/session/index.js", () => ({
  default: { getSession: vi.fn() },
}));
vi.mock("../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}));

import prisma from "../../utils/prisma.js";
import { UserRecipes } from "../../types/enums.js";
import {
  getOrgIdAndRole,
  getUserByEmail,
  getUserRecipeName,
  updateLastLoggedInTime,
} from "./user.service.js";

type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as {
  user: { findUnique: Mock; update: Mock };
  orgMember: { findFirst: Mock };
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("updateLastLoggedInTime", () => {
  test("stamps the given moment on the user who just signed in", async () => {
    const loggedInAt = new Date("2026-07-27T09:30:00Z");

    await updateLastLoggedInTime("user-1", loggedInAt);

    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { lastLoggedInAt: loggedInAt },
    });
  });

  test("lets a write failure reach the caller", async () => {
    db.user.update.mockRejectedValue(new Error("db down"));

    await expect(updateLastLoggedInTime("user-1", new Date())).rejects.toThrow("db down");
  });
});

describe("getOrgIdAndRole", () => {
  test("returns the org and role that get stamped into the access token", async () => {
    db.orgMember.findFirst.mockResolvedValue({ orgId: "org-1", role: "SUPER_ADMIN" });

    const result = await getOrgIdAndRole({ id: "user-1" });

    expect(db.orgMember.findFirst).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      select: { orgId: true, role: true },
    });
    expect(result).toEqual({ orgId: "org-1", role: "SUPER_ADMIN" });
  });

  test("returns null for a user who belongs to no org", async () => {
    db.orgMember.findFirst.mockResolvedValue(null);

    await expect(getOrgIdAndRole({ id: "user-1" })).resolves.toBeNull();
  });

  // NOTE: the lookup is not scoped to an org, so a user in several orgs is pinned to
  // whichever membership the database returns first.
  test("picks a single membership for a user who belongs to more than one org", async () => {
    db.orgMember.findFirst.mockResolvedValue({ orgId: "org-first", role: "MEMBER" });

    const result = await getOrgIdAndRole({ id: "user-1" });

    expect(result).toEqual({ orgId: "org-first", role: "MEMBER" });
  });
});

describe("getUserRecipeName", () => {
  test.each([
    ["thirdparty", UserRecipes.ThirdPartyGoogle],
    ["emailpassword", UserRecipes.EmailPassword],
    ["passwordless", UserRecipes.PasswordLess],
  ])("maps the %s login method to its recipe name", (recipeId, expected) => {
    expect(getUserRecipeName(recipeId)).toBe(expected);
  });

  // NOTE: Apple sign-in also arrives as "thirdparty", so it is recorded as Google.
  test("cannot tell Apple sign-in apart from Google", () => {
    expect(getUserRecipeName("thirdparty")).toBe(UserRecipes.ThirdPartyGoogle);
    expect(getUserRecipeName("thirdparty")).not.toBe(UserRecipes.ThirdPartyApple);
  });

  test("returns undefined for a login method it does not know", () => {
    expect(getUserRecipeName("webauthn")).toBeUndefined();
  });
});

describe("getUserByEmail", () => {
  test("looks the account up by its unique email", async () => {
    db.user.findUnique.mockResolvedValue({ id: "user-1", email: "owner@acme.com" });

    const result = await getUserByEmail("owner@acme.com");

    expect(db.user.findUnique).toHaveBeenCalledWith({ where: { email: "owner@acme.com" } });
    expect(result).toMatchObject({ id: "user-1" });
  });

  test("returns null when no account carries that email", async () => {
    db.user.findUnique.mockResolvedValue(null);

    await expect(getUserByEmail("nobody@acme.com")).resolves.toBeNull();
  });
});
