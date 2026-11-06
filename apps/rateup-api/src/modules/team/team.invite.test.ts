import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../utils/prisma.js", () => ({
  default: {
    invitation: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    user: { findFirst: vi.fn(), update: vi.fn() },
    orgMember: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn() },
    team: { findMany: vi.fn(), count: vi.fn() },
    teamMember: { findFirst: vi.fn(), create: vi.fn() },
    usageStats: { update: vi.fn() },
  },
  excludeFields: vi.fn(),
}));

vi.mock("supertokens-node", () => ({ default: { getUser: vi.fn() } }));
vi.mock("../user/user.service.js", () => ({
  createUser: vi.fn(),
  getUserRecipeName: vi.fn(),
}));
vi.mock("./team.limits.js", () => ({ assertSeatAvailable: vi.fn() }));
vi.mock("../../authz/actor.js", () => ({
  bustActor: vi.fn(),
  bustActorsForOrg: vi.fn(),
  bustActorsForUser: vi.fn(),
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
vi.mock("../../workers/bullmq/queues/index.js", () => ({
  notificationQueue: { add: vi.fn() },
  sendTransactionalEmail: vi.fn(),
}));
vi.mock("../../utils/email/supertoken/inviteEmail.js", () => ({
  createEmailBody: vi.fn(async (link: string) => `<a href="${link}">accept</a>`),
}));
vi.mock("../../utils/email/supertoken/passwordReset.js", () => ({
  sendResetPasswordMail: vi.fn(),
}));
vi.mock("../email/email.util.js", () => ({ getEmailBodyTemplate: vi.fn() }));
vi.mock("../../../generated/prisma/client.js", () => ({
  Role: { SUPER_ADMIN: "SUPER_ADMIN", ADMIN: "ADMIN", MEMBER: "MEMBER" },
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
import supertokens from "supertokens-node";
import EmailPassword from "supertokens-node/recipe/emailpassword/index.js";
import EmailVerification from "supertokens-node/recipe/emailverification/index.js";
import { createUser, getUserRecipeName } from "../user/user.service.js";
import { createHubSpotContact, getHubSpotCompanyByOwnerEmail } from "../../utils/hubspot.js";
import { sendResetPasswordMail } from "../../utils/email/supertoken/passwordReset.js";
import { createEmailBody } from "../../utils/email/supertoken/inviteEmail.js";
import { sendTransactionalEmail } from "../../workers/bullmq/queues/index.js";
import { ForbiddenError } from "../../authz/errors.js";
import {
  completeInvite,
  hashInviteToken,
  INVITE_TTL_MS,
  InvalidInviteError,
  inviteTeamMember,
  resendInviteTeamMember,
} from "./team.service.js";

type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as {
  invitation: Record<
    "findUnique" | "findFirst" | "update" | "updateMany" | "create" | "delete",
    Mock
  >;
  user: { findFirst: Mock; update: Mock };
  orgMember: { findFirst: Mock; findMany: Mock; create: Mock };
  team: { findMany: Mock; count: Mock };
  teamMember: { findFirst: Mock; create: Mock };
  usageStats: { update: Mock };
};

const getStUserMock = supertokens.getUser as unknown as Mock;
const signUpMock = EmailPassword.signUp as unknown as Mock;
const createResetLinkMock = EmailPassword.createResetPasswordLink as unknown as Mock;
const createVerifyTokenMock = EmailVerification.createEmailVerificationToken as unknown as Mock;
const verifyEmailMock = EmailVerification.verifyEmailUsingToken as unknown as Mock;
const createUserMock = createUser as unknown as Mock;
const getRecipeNameMock = getUserRecipeName as unknown as Mock;
const getCompanyMock = getHubSpotCompanyByOwnerEmail as unknown as Mock;
const createContactMock = createHubSpotContact as unknown as Mock;
const sendResetMailMock = sendResetPasswordMail as unknown as Mock;
const createEmailBodyMock = createEmailBody as unknown as Mock;
const sendMailMock = sendTransactionalEmail as unknown as Mock;

const TOKEN = "raw-invite-token";
const TOKEN_HASH = hashInviteToken(TOKEN);
const DAY = 24 * 60 * 60 * 1000;

function invitation(overrides: Record<string, unknown> = {}) {
  return {
    id: "invitation-1",
    email: "invitee@acme.com",
    name: "Invitee",
    orgId: "org-1",
    teamId: "team-1",
    teamIds: [],
    type: "TEAM",
    status: "PENDING",
    role: null,
    tokenHash: TOKEN_HASH,
    tokenExpiresAt: new Date(Date.now() + DAY),
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
  db.invitation.updateMany.mockResolvedValue({ count: 1 });
  db.user.findFirst.mockResolvedValue(null);
  db.user.update.mockResolvedValue({ id: "user-2" });
  db.orgMember.findFirst.mockResolvedValue(null);
  db.orgMember.findMany.mockResolvedValue([]);
  db.orgMember.create.mockResolvedValue({ id: "org-member-1" });
  db.team.findMany.mockResolvedValue([{ id: "team-1", name: "Main" }]);
  db.team.count.mockResolvedValue(1);
  db.teamMember.findFirst.mockResolvedValue(null);
  db.teamMember.create.mockResolvedValue({ id: "team-member-1" });

  getStUserMock.mockResolvedValue({ emails: ["invitee@acme.com"] });
  signUpMock.mockResolvedValue(SIGNUP_RESULT);
  createVerifyTokenMock.mockResolvedValue({ status: "OK", token: "verify-token" });
  verifyEmailMock.mockResolvedValue({ status: "OK" });
  createResetLinkMock.mockResolvedValue({
    status: "OK",
    link: "https://app.rateup.app/auth/reset-password?token=reset-1&tenantId=public",
  });
  getRecipeNameMock.mockReturnValue("EmailPassword");
  createUserMock.mockResolvedValue({ id: "user-2" });
  getCompanyMock.mockResolvedValue("hs-company-1");
});

afterEach(() => {
  if (originalFrontendUrl === undefined) delete process.env.FRONTEND_URL;
  else process.env.FRONTEND_URL = originalFrontendUrl;
});

describe("completeInvite - the token", () => {
  test("looks the invitation up by the token's hash, never by id", async () => {
    await completeInvite(TOKEN);

    expect(db.invitation.findUnique.mock.calls[0][0].where).toEqual({ tokenHash: TOKEN_HASH });
  });

  test("rejects a token that matches no invitation", async () => {
    db.invitation.findUnique.mockResolvedValue(null);

    await expect(completeInvite(TOKEN)).rejects.toBeInstanceOf(InvalidInviteError);
    expect(db.invitation.updateMany).not.toHaveBeenCalled();
  });

  test("rejects an invitation that is no longer pending", async () => {
    db.invitation.findUnique.mockResolvedValue(invitation({ status: "ACCEPTED" }));

    await expect(completeInvite(TOKEN)).rejects.toBeInstanceOf(InvalidInviteError);
    expect(signUpMock).not.toHaveBeenCalled();
  });

  test("rejects an expired invitation", async () => {
    db.invitation.findUnique.mockResolvedValue(
      invitation({ tokenExpiresAt: new Date(Date.now() - 1000) }),
    );

    await expect(completeInvite(TOKEN)).rejects.toBeInstanceOf(InvalidInviteError);
    expect(db.invitation.updateMany).not.toHaveBeenCalled();
  });

  test("rejects an invitation with no expiry (issued before tokens existed)", async () => {
    db.invitation.findUnique.mockResolvedValue(invitation({ tokenExpiresAt: null }));

    await expect(completeInvite(TOKEN)).rejects.toBeInstanceOf(InvalidInviteError);
  });

  test("spends the token with a conditional update before doing anything else", async () => {
    await completeInvite(TOKEN);

    expect(db.invitation.updateMany.mock.calls[0][0]).toEqual({
      where: { id: "invitation-1", status: "PENDING", tokenHash: TOKEN_HASH },
      data: { status: "ACCEPTED", tokenHash: null },
    });
  });

  test("a second, concurrent use loses the claim and creates nothing", async () => {
    db.invitation.updateMany.mockResolvedValueOnce({ count: 0 });

    await expect(completeInvite(TOKEN)).rejects.toBeInstanceOf(InvalidInviteError);
    expect(signUpMock).not.toHaveBeenCalled();
    expect(db.orgMember.create).not.toHaveBeenCalled();
  });

  test("hands the invitation back when acceptance fails part-way", async () => {
    signUpMock.mockResolvedValue({ status: "EMAIL_ALREADY_EXISTS_ERROR" });

    await expect(completeInvite(TOKEN)).rejects.toThrow("User already exists");
    expect(db.invitation.updateMany).toHaveBeenLastCalledWith({
      where: { id: "invitation-1", status: "ACCEPTED" },
      data: { status: "PENDING", tokenHash: TOKEN_HASH },
    });
  });
});

describe("completeInvite - the invitee already has an account", () => {
  const existingUser = { id: "user-9", email: "invitee@acme.com", name: "Existing" };

  beforeEach(() => {
    db.user.findFirst.mockResolvedValue(existingUser);
  });

  test("reports them as an existing user and sends them to log in", async () => {
    const result = await completeInvite(TOKEN);

    expect(result.isUser).toBe(true);
    expect(result.redirectLink).toBe("https://app.rateup.app/login");
    expect(signUpMock).not.toHaveBeenCalled();
  });

  test("refuses when the account does not sign in with the invited address", async () => {
    // A phone-only sign-up that typed someone else's address into its profile.
    getStUserMock.mockResolvedValue({ emails: [] });

    await expect(completeInvite(TOKEN)).rejects.toThrow("not a sign-in address");
    expect(db.orgMember.create).not.toHaveBeenCalled();
  });

  test("backfills the name from the invitation when the account has none", async () => {
    db.user.findFirst.mockResolvedValue({ ...existingUser, name: null });

    await completeInvite(TOKEN);

    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: "user-9" },
      data: { name: "Invitee" },
    });
  });

  test("adds them to the inviting org with the default role and to the invited team", async () => {
    await completeInvite(TOKEN);

    expect(db.orgMember.create).toHaveBeenCalledWith({
      data: { orgId: "org-1", userId: "user-9", role: "MEMBER", roleKey: "STAFF" },
    });
    expect(db.teamMember.create).toHaveBeenCalledWith({
      data: { teamId: "team-1", userId: "user-9" },
    });
  });

  test("only joins teams that belong to the inviting org", async () => {
    await completeInvite(TOKEN);

    expect(db.team.findMany.mock.calls[0][0].where).toEqual({
      id: { in: ["team-1"] },
      orgId: "org-1",
    });
  });

  test("adds them only to the team when they are already an org member", async () => {
    db.orgMember.findFirst.mockResolvedValue({ orgId: "org-1", role: "ADMIN" });

    await completeInvite(TOKEN);

    expect(db.orgMember.create).not.toHaveBeenCalled();
    expect(db.teamMember.create).toHaveBeenCalled();
  });
});

describe("completeInvite - the invitee is brand new", () => {
  test("provisions the account with a random password, never a fixed one", async () => {
    await completeInvite(TOKEN);
    await completeInvite(TOKEN);

    const first = signUpMock.mock.calls[0][2];
    const second = signUpMock.mock.calls[1][2];
    expect(signUpMock.mock.calls[0].slice(0, 2)).toEqual(["public", "invitee@acme.com"]);
    expect(first).not.toBe("qwerty123");
    expect(first.length).toBeGreaterThanOrEqual(32);
    expect(first).not.toBe(second);
  });

  test("marks the invited address as verified", async () => {
    await completeInvite(TOKEN);

    expect(createVerifyTokenMock).toHaveBeenCalledWith("public", SIGNUP_RESULT.recipeUserId);
    expect(verifyEmailMock).toHaveBeenCalledWith("public", "verify-token");
  });

  test("creates the local user and the TEAM membership", async () => {
    await completeInvite(TOKEN);

    expect(createUserMock).toHaveBeenCalledWith({
      id: "user-2",
      email: "invitee@acme.com",
      recipeName: "EmailPassword",
    });
    expect(db.orgMember.create).toHaveBeenCalledWith({
      data: { orgId: "org-1", userId: "user-2", role: "MEMBER", roleKey: "STAFF" },
    });
  });

  test("emails the password-setup link to the invited address", async () => {
    await completeInvite(TOKEN);

    expect(createResetLinkMock).toHaveBeenCalledWith("public", "user-2", "invitee@acme.com");
    expect(sendResetMailMock).toHaveBeenCalledWith(
      "https://app.rateup.app/auth/reset-password?token=reset-1&tenantId=public&type=invite",
      "invitee@acme.com",
    );
  });

  test("never returns the reset link to the caller", async () => {
    const result = await completeInvite(TOKEN);

    expect(JSON.stringify(result)).not.toContain("reset-password");
    expect(result).toMatchObject({
      isUser: false,
      passwordSetupEmailSent: true,
      redirectLink: "https://app.rateup.app/login",
    });
  });

  test("reports when the setup email could not be produced", async () => {
    createResetLinkMock.mockResolvedValue({ status: "UNKNOWN_USER_ID_ERROR" });

    const result = await completeInvite(TOKEN);

    expect(sendResetMailMock).not.toHaveBeenCalled();
    expect(result.passwordSetupEmailSent).toBe(false);
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
});

describe("inviteTeamMember", () => {
  const input = {
    email: "invitee@acme.com",
    name: "Invitee",
    orgId: "org-1",
    teamId: "team-1",
    type: "TEAM" as never,
    invitedBy: "user-1",
  };

  beforeEach(() => {
    db.invitation.findFirst.mockResolvedValue(null);
    db.invitation.create.mockImplementation(async ({ data }: { data: object }) => ({
      id: "invitation-1",
      ...data,
    }));
  });

  test("stores only a hash of the token, with a 14-day expiry", async () => {
    const before = Date.now();

    await inviteTeamMember(input);

    const data = db.invitation.create.mock.calls[0][0].data;
    expect(data.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(data.tokenExpiresAt.getTime()).toBeGreaterThanOrEqual(before + INVITE_TTL_MS);
  });

  test("emails a link carrying the raw token, not the invitation id", async () => {
    await inviteTeamMember(input);

    const link: string = createEmailBodyMock.mock.calls[0][0];
    const token = new URL(link).searchParams.get("token")!;
    expect(link.startsWith("https://app.rateup.app/invite?type=team&token=")).toBe(true);
    expect(token).not.toBe("invitation-1");
    expect(hashInviteToken(token)).toBe(db.invitation.create.mock.calls[0][0].data.tokenHash);
    expect(sendMailMock).toHaveBeenCalled();
  });

  test("never returns the token hash", async () => {
    const invite = await inviteTeamMember(input);

    expect(invite).not.toHaveProperty("tokenHash");
  });

  test("refuses a team that is not the inviting org's", async () => {
    db.team.count.mockResolvedValue(0);

    await expect(inviteTeamMember(input)).rejects.toBeInstanceOf(ForbiddenError);
    expect(db.invitation.create).not.toHaveBeenCalled();
  });
});

describe("resendInviteTeamMember", () => {
  test("only finds the caller's org's invitation", async () => {
    db.invitation.findFirst.mockResolvedValue(null);

    await expect(resendInviteTeamMember("invitation-1", "org-2")).rejects.toBeInstanceOf(
      InvalidInviteError,
    );
    expect(db.invitation.findFirst).toHaveBeenCalledWith({
      where: { id: "invitation-1", orgId: "org-2" },
    });
    expect(sendMailMock).not.toHaveBeenCalled();
  });

  test("issues a fresh token and expiry, and emails the new link", async () => {
    db.invitation.findFirst.mockResolvedValue(invitation());

    await resendInviteTeamMember("invitation-1", "org-1");

    const { data } = db.invitation.update.mock.calls[0][0];
    expect(data.tokenHash).not.toBe(TOKEN_HASH);
    const token = new URL(createEmailBodyMock.mock.calls[0][0]).searchParams.get("token")!;
    expect(hashInviteToken(token)).toBe(data.tokenHash);
    expect(sendMailMock).toHaveBeenCalled();
  });
});
