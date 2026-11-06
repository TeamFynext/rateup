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
      orderBy: { createdAt: "asc" },
      select: { orgId: true, role: true },
    });
    expect(result).toEqual({ orgId: "org-1", role: "SUPER_ADMIN" });
  });

  test("returns null for a user who belongs to no org", async () => {
    db.orgMember.findFirst.mockResolvedValue(null);

    await expect(getOrgIdAndRole({ id: "user-1" })).resolves.toBeNull();
  });

  // Login has no org in context — picking one IS the job here. The ordering makes that
  // pick deterministic (oldest membership) rather than whatever the DB returns first,
  // which is what made a multi-org user's session org arbitrary.
  test("picks a multi-org user's oldest membership, deterministically", async () => {
    db.orgMember.findFirst.mockResolvedValue({ orgId: "org-oldest", role: "MEMBER" });

    const result = await getOrgIdAndRole({ id: "user-1" });

    expect(db.orgMember.findFirst.mock.calls[0][0].orderBy).toEqual({ createdAt: "asc" });
    expect(result).toEqual({ orgId: "org-oldest", role: "MEMBER" });
  });
});

describe("getUserRecipeName", () => {
  test.each([
    ["emailpassword", UserRecipes.EmailPassword],
    ["passwordless", UserRecipes.PasswordLess],
  ])("maps the %s login method to its recipe name", (recipeId, expected) => {
    expect(getUserRecipeName(recipeId)).toBe(expected);
  });

  // Apple and Google sign-in both arrive as "thirdparty"; the provider id on the login
  // method is what tells them apart. Without it every third-party user was recorded as
  // Google, contradicting createAppleUserHandler.
  test("tells Apple sign-in apart from Google by the provider id", () => {
    expect(getUserRecipeName("thirdparty", "apple")).toBe(UserRecipes.ThirdPartyApple);
    expect(getUserRecipeName("thirdparty", "google")).toBe(UserRecipes.ThirdPartyGoogle);
  });

  // Not silently called Google, which is what made an Apple user's stored recipe depend
  // on which code path created them.
  test.each([
    ["an unrecognised provider", "facebook"],
    ["no provider at all", undefined],
  ])("returns undefined for a thirdparty login with %s", (_name, thirdPartyId) => {
    expect(getUserRecipeName("thirdparty", thirdPartyId)).toBeUndefined();
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
