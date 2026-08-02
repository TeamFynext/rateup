import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../utils/prisma.js", () => ({
  default: {
    invitation: { findUnique: vi.fn(), update: vi.fn() },
    user: { findFirst: vi.fn(), update: vi.fn() },
    orgMember: { findFirst: vi.fn(), create: vi.fn() },
    teamMember: { findFirst: vi.fn(), create: vi.fn() },
  },
  excludeFields: vi.fn(),
}));

vi.mock("../user/user.service.js", () => ({
  createUser: vi.fn(),
  getUserRecipeName: vi.fn(),
}));

vi.mock("supertokens-node/recipe/emailpassword/index.js", () => ({
  default: { signUp: vi.fn(), createResetPasswordLink: vi.fn() },
}));
vi.mock("supertokens-node/recipe/emailverification/index.js", () => ({
  default: { createEmailVerificationToken: vi.fn(), verifyEmailUsingToken: vi.fn() },
}));

vi.mock("../../utils/hubspot.js", () => ({
  createHubSpotContact: vi.fn(),
  getHubSpotCompanyByOwnerEmail: vi.fn(),
}));
vi.mock("../whatsapp/settings/wa_channel_access.js", () => ({
  invalidateChannelAccessCache: vi.fn(),
}));
vi.mock("../../utils/redisConnection.js", () => ({
  notificationQueue: { add: vi.fn() },
}));
vi.mock("../../utils/email/supertoken/inviteEmail.js", () => ({ createEmailBody: vi.fn() }));
vi.mock("../email/email.util.js", () => ({ getEmailBodyTemplate: vi.fn() }));
vi.mock("../../../generated/prisma/client.js", () => ({
  Prisma: {
    PrismaClientKnownRequestError: class extends Error {
      code: string;
      constructor(message: string, code: string) {
        super(message);
        this.code = code;
      }
    },
  },
}));

import prisma from "../../utils/prisma.js";
import EmailPassword from "supertokens-node/recipe/emailpassword/index.js";
import EmailVerification from "supertokens-node/recipe/emailverification/index.js";
import { createUser, getUserRecipeName } from "../user/user.service.js";
import { createHubSpotContact, getHubSpotCompanyByOwnerEmail } from "../../utils/hubspot.js";
import { Role } from "../../utils/enums/index.js";
import { completeInvite } from "./team.service.js";

type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as {
  invitation: { findUnique: Mock; update: Mock };
  user: { findFirst: Mock; update: Mock };
  orgMember: { findFirst: Mock; create: Mock };
  teamMember: { findFirst: Mock; create: Mock };
};

const signUpMock = EmailPassword.signUp as unknown as Mock;
const createResetLinkMock = EmailPassword.createResetPasswordLink as unknown as Mock;
const createVerifyTokenMock = EmailVerification.createEmailVerificationToken as unknown as Mock;
const verifyEmailMock = EmailVerification.verifyEmailUsingToken as unknown as Mock;
const createUserMock = createUser as unknown as Mock;
const getRecipeNameMock = getUserRecipeName as unknown as Mock;
const getCompanyMock = getHubSpotCompanyByOwnerEmail as unknown as Mock;
const createContactMock = createHubSpotContact as unknown as Mock;

const TOKEN = "invite-token-1";

function invitation(overrides: Record<string, unknown> = {}) {
  return {
    id: TOKEN,
    email: "invitee@acme.com",
    name: "Invitee",
    orgId: "org-1",
    teamId: "team-1",
    type: "TEAM",
    status: "ACCEPTED",
    createdAt: new Date("2026-03-01T00:00:00Z"),
    org: { name: "Acme", owner: { email: "owner@acme.com" } },
    team: { code: "MAIN", name: "Main" },
    ...overrides,
  };
}

const SIGNUP_RESULT = {
  status: "OK",
  recipeUserId: { getAsString: () => "recipe-user-2" },
  user: { id: "user-2", loginMethods: [{ recipeId: "emailpassword" }] },
};

const originalFrontendUrl = process.env.FRONTEND_URL;

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  process.env.FRONTEND_URL = "https://app.rateup.app";

  db.invitation.findUnique.mockResolvedValue(invitation());
  db.invitation.update.mockResolvedValue(invitation());
  db.user.findFirst.mockResolvedValue(null);
  db.user.update.mockResolvedValue({ id: "user-2" });
  db.orgMember.findFirst.mockResolvedValue(null);
  db.orgMember.create.mockResolvedValue({ id: "org-member-1" });
  db.teamMember.findFirst.mockResolvedValue(null);
  db.teamMember.create.mockResolvedValue({ id: "team-member-1" });

  signUpMock.mockResolvedValue(SIGNUP_RESULT);
  createVerifyTokenMock.mockResolvedValue({ status: "OK", token: "verify-token" });
  verifyEmailMock.mockResolvedValue({ status: "OK" });
  createResetLinkMock.mockResolvedValue({
    status: "OK",
    link: "https://app.rateup.app/auth/reset-password?token=reset-1",
  });
  getRecipeNameMock.mockReturnValue("EmailPassword");
  createUserMock.mockResolvedValue({ id: "user-2" });
  getCompanyMock.mockResolvedValue("hs-company-1");
});

afterEach(() => {
  if (originalFrontendUrl === undefined) delete process.env.FRONTEND_URL;
  else process.env.FRONTEND_URL = originalFrontendUrl;
});

describe("completeInvite - the token itself", () => {
  test("rejects a token that matches no invitation", async () => {
    db.invitation.findUnique.mockResolvedValue(null);

    await expect(completeInvite(TOKEN)).rejects.toThrow("Invitation not found");
    expect(db.invitation.update).not.toHaveBeenCalled();
  });

  test("marks the invitation ACCEPTED", async () => {
    await completeInvite(TOKEN);

    expect(db.invitation.update.mock.calls[0][0]).toMatchObject({
      where: { id: TOKEN },
      data: { status: "ACCEPTED" },
    });
  });
});

describe("completeInvite - the invitee already has an account", () => {
  const existingUser = { id: "user-9", email: "invitee@acme.com", name: "Existing" };

  beforeEach(() => {
    db.user.findFirst.mockResolvedValue(existingUser);
  });

  test("looks the user up by the invited email", async () => {
    await completeInvite(TOKEN);

    expect(db.user.findFirst).toHaveBeenCalledWith({ where: { email: "invitee@acme.com" } });
  });

  test("reports them as an existing user and sends them to log in", async () => {
    const result = await completeInvite(TOKEN);

    expect(result.isUser).toBe(true);
    expect(result.redirectLink).toBe("https://app.rateup.app/login");
  });

  test("never provisions a second SuperTokens account for them", async () => {
    await completeInvite(TOKEN);

    expect(signUpMock).not.toHaveBeenCalled();
    expect(createUserMock).not.toHaveBeenCalled();
  });

  test("backfills the name from the invitation when the account has none", async () => {
    db.user.findFirst.mockResolvedValue({ ...existingUser, name: null });

    await completeInvite(TOKEN);

    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: "user-9" },
      data: { name: "Invitee" },
    });
  });

  test("leaves an already-set name alone", async () => {
    await completeInvite(TOKEN);

    expect(db.user.update).not.toHaveBeenCalled();
  });

  test("adds them to the org as ADMIN and to the invited team", async () => {
    await completeInvite(TOKEN);

    expect(db.orgMember.create).toHaveBeenCalledWith({
      data: { orgId: "org-1", userId: "user-9", role: Role.ADMIN },
    });
    expect(db.teamMember.create).toHaveBeenCalledWith({
      data: { teamId: "team-1", userId: "user-9" },
    });
  });

  test("adds them only to the team when they are already an org member", async () => {
    db.orgMember.findFirst.mockResolvedValue({ orgId: "org-1", role: Role.ADMIN });

    await completeInvite(TOKEN);

    expect(db.orgMember.create).not.toHaveBeenCalled();
    expect(db.teamMember.create).toHaveBeenCalledWith({
      data: { teamId: "team-1", userId: "user-9" },
    });
  });

  test("fails when they are already a member of the invited team", async () => {
    db.orgMember.findFirst.mockResolvedValue({ orgId: "org-1", role: Role.ADMIN });
    db.teamMember.findFirst.mockResolvedValue({ id: "team-member-existing" });

    await expect(completeInvite(TOKEN)).rejects.toThrow("Team member Record already exists");
  });

  test("skips team membership for an invitation with no team", async () => {
    db.invitation.update.mockResolvedValue(invitation({ teamId: null }));

    await completeInvite(TOKEN);

    expect(db.teamMember.create).not.toHaveBeenCalled();
  });

  // NOTE: the org-membership lookup is not scoped to the inviting org, so a user who
  // already belongs to any other org is never added to this one.
  test("does not add them to the inviting org when they belong to a different org", async () => {
    db.orgMember.findFirst.mockResolvedValue({ orgId: "other-org", role: Role.ADMIN });

    await completeInvite(TOKEN);

    expect(db.orgMember.create).not.toHaveBeenCalled();
  });
});

describe("completeInvite - the invitee is brand new", () => {
  test("provisions a SuperTokens account for the invited email", async () => {
    await completeInvite(TOKEN);

    expect(signUpMock).toHaveBeenCalledWith("public", "invitee@acme.com", expect.any(String));
  });

  test("stops when SuperTokens already knows the email", async () => {
    signUpMock.mockResolvedValue({ status: "EMAIL_ALREADY_EXISTS_ERROR" });

    await expect(completeInvite(TOKEN)).rejects.toThrow("User already exists");
    expect(createUserMock).not.toHaveBeenCalled();
    expect(db.orgMember.create).not.toHaveBeenCalled();
  });

  test("marks the invited address as verified without emailing them", async () => {
    await completeInvite(TOKEN);

    expect(createVerifyTokenMock).toHaveBeenCalledWith("public", SIGNUP_RESULT.recipeUserId);
    expect(verifyEmailMock).toHaveBeenCalledWith("public", "verify-token");
  });

  test("creates the local user with the recipe name from their login method", async () => {
    await completeInvite(TOKEN);

    // The provider id is passed through so an Apple sign-in is not recorded as Google;
    // an emailpassword login method carries none.
    expect(getRecipeNameMock).toHaveBeenCalledWith("emailpassword", undefined);
    expect(createUserMock).toHaveBeenCalledWith({
      id: "user-2",
      email: "invitee@acme.com",
      recipeName: "EmailPassword",
    });
    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: "user-2" },
      data: { name: "Invitee" },
    });
  });

  test("aborts when the local user record cannot be created", async () => {
    createUserMock.mockResolvedValue(null);

    await expect(completeInvite(TOKEN)).rejects.toThrow("failed user adding");
  });

  test("skips the local user entirely when the verification token fails", async () => {
    createVerifyTokenMock.mockResolvedValue({ status: "UNKNOWN_USER_ID_ERROR" });

    await completeInvite(TOKEN);

    expect(verifyEmailMock).not.toHaveBeenCalled();
    expect(createUserMock).not.toHaveBeenCalled();
  });

  test("adds a TEAM invitee to the org as ADMIN", async () => {
    await completeInvite(TOKEN);

    expect(db.orgMember.create).toHaveBeenCalledWith({
      data: { orgId: "org-1", userId: "user-2", role: Role.ADMIN },
    });
  });

  // The team-membership call is awaited here, matching the existing-user path, so
  // acceptance does not finish until the membership exists.
  test("does not finish until the team membership has been created", async () => {
    await completeInvite(TOKEN);

    expect(db.teamMember.create).toHaveBeenCalledWith({
      data: { teamId: "team-1", userId: "user-2" },
    });
  });

  // Same await, seen from the caller: a duplicate membership now fails acceptance
  // instead of becoming an unhandled rejection while the caller is told it worked.
  test("fails acceptance when the invitee is already on the team", async () => {
    db.teamMember.findFirst.mockResolvedValue({ id: "team-member-existing" });

    await expect(completeInvite(TOKEN)).rejects.toThrow("Team member Record already exists");
    expect(db.teamMember.create).not.toHaveBeenCalled();
  });

  test("hands back a password-reset link so they can set a real password", async () => {
    const result = await completeInvite(TOKEN);

    expect(createResetLinkMock).toHaveBeenCalledWith("public", "user-2", "invitee@acme.com");
    expect(result.redirectLink).toBe("https://app.rateup.app/auth/reset-password?token=reset-1");
  });

  test("leaves the redirect empty when the reset link cannot be made", async () => {
    createResetLinkMock.mockResolvedValue({ status: "UNKNOWN_USER_ID_ERROR" });

    const result = await completeInvite(TOKEN);

    expect(result.redirectLink).toBe("");
  });

  test("does not create org membership or a reset link for a non-TEAM invitation", async () => {
    db.invitation.update.mockResolvedValue(invitation({ type: "ORG" }));

    const result = await completeInvite(TOKEN);

    expect(db.orgMember.create).not.toHaveBeenCalled();
    expect(createResetLinkMock).not.toHaveBeenCalled();
    expect(result.redirectLink).toBe("");
  });

  test("syncs them to HubSpot under the inviting org's company", async () => {
    await completeInvite(TOKEN);

    expect(getCompanyMock).toHaveBeenCalledWith("owner@acme.com");
    expect(createContactMock).toHaveBeenCalledWith(
      {
        email: "invitee@acme.com",
        firstname: "Invitee",
        company: "Acme",
        joined_date: invitation().createdAt,
      },
      "hs-company-1",
    );
  });

  test("reports them as a new user alongside the accepted invitation", async () => {
    const result = await completeInvite(TOKEN);

    expect(result).toMatchObject({ id: TOKEN, email: "invitee@acme.com", isUser: false });
  });
});
