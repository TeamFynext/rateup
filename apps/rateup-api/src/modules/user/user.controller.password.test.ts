import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../authz/ownership.js", () => ({
  assertMemberOfOrg: vi.fn(),
  assertNotOwner: vi.fn(),
}));
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

vi.mock("./user.service.js", () => ({
  auditLog: vi.fn(),
  checkEmailExist: vi.fn(),
  createUserSignup: vi.fn(),
  getAllUsers: vi.fn(),
  getLoggedUserInfo: vi.fn(),
  getLoggedUserProfile: vi.fn(),
  pauseUser: vi.fn(),
  updateUserActiveStatus: vi.fn(),
  updateUserAvailablityStatus: vi.fn(),
  updateUserPrefLanguage: vi.fn(),
  updateUserProfile: vi.fn(),
  updateUserProfileById: vi.fn(),
  updateUserProfilePhoto: vi.fn(),
  updateUserRecipe: vi.fn(),
}));

vi.mock("supertokens-node", () => ({ default: { getUser: vi.fn() } }));
vi.mock("supertokens-node/recipe/session/index.js", () => ({
  default: { getSession: vi.fn() },
}));
vi.mock("supertokens-node/recipe/emailpassword/index.js", () => ({
  default: { verifyCredentials: vi.fn(), updateEmailOrPassword: vi.fn() },
}));
vi.mock("../../utils/supertoken/supertoken.js", () => ({
  deleteSuperTokenUserForId: vi.fn(),
  getUserInfo: vi.fn(),
}));
vi.mock("../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}));

import supertokens from "supertokens-node";
import Session from "supertokens-node/recipe/session/index.js";
import EmailPassword from "supertokens-node/recipe/emailpassword/index.js";
import { changeUserPasswordHandler } from "./user.controller.js";

type Mock = ReturnType<typeof vi.fn>;

const getSessionMock = Session.getSession as unknown as Mock;
const getUserMock = supertokens.getUser as unknown as Mock;
const verifyCredentialsMock = EmailPassword.verifyCredentials as unknown as Mock;
const updatePasswordMock = EmailPassword.updateEmailOrPassword as unknown as Mock;

/** Stands in for the SuperTokens opaque recipe user id. */
const RECIPE_USER_ID = { getAsString: () => "recipe-user-1" };

function makeReply() {
  const reply: any = {
    statusCode: undefined,
    payload: undefined,
    code: vi.fn((c: number) => {
      reply.statusCode = c;
      return reply;
    }),
    send: vi.fn((p?: unknown) => {
      reply.payload = p;
      return reply;
    }),
  };
  return reply;
}

function makeRequest(body: Record<string, unknown> = {}) {
  return {
    body: { existingPassword: "old-pass", newPassword: "new-pass", ...body },
  } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});

  getSessionMock.mockResolvedValue({
    getUserId: () => "user-1",
    getTenantId: () => "public",
    getRecipeUserId: () => RECIPE_USER_ID,
  });
  getUserMock.mockResolvedValue({ emails: ["owner@acme.com"], phoneNumbers: [] });
  verifyCredentialsMock.mockResolvedValue({ status: "OK" });
  updatePasswordMock.mockResolvedValue({ status: "OK" });
});

describe("changeUserPasswordHandler - success", () => {
  test("checks the old password against the session's tenant and account email", async () => {
    await changeUserPasswordHandler(makeRequest(), makeReply());

    expect(getUserMock).toHaveBeenCalledWith("user-1");
    expect(verifyCredentialsMock).toHaveBeenCalledWith("public", "owner@acme.com", "old-pass");
  });

  test("updates the password for the session's recipe user under its tenant policy", async () => {
    await changeUserPasswordHandler(makeRequest(), makeReply());

    expect(updatePasswordMock).toHaveBeenCalledWith({
      recipeUserId: RECIPE_USER_ID,
      password: "new-pass",
      tenantIdForPasswordPolicy: "public",
    });
  });

  test("confirms the change with a 200", async () => {
    const reply = makeReply();

    await changeUserPasswordHandler(makeRequest(), reply);

    expect(reply.code).toHaveBeenCalledWith(200);
    expect(reply.payload).toEqual({
      success: true,
      message: "Successfully updated password",
    });
  });

  test("never sends the new password to the verification call", async () => {
    await changeUserPasswordHandler(makeRequest(), makeReply());

    expect(verifyCredentialsMock.mock.calls[0]).not.toContain("new-pass");
  });
});

describe("changeUserPasswordHandler - rejected attempts", () => {
  test("refuses the change when the old password is wrong", async () => {
    verifyCredentialsMock.mockResolvedValue({ status: "WRONG_CREDENTIALS_ERROR" });
    const reply = makeReply();

    await changeUserPasswordHandler(makeRequest(), reply);

    expect(reply.code).toHaveBeenCalledWith(500);
    expect(reply.payload).toEqual({ success: false, message: "Incorrect old password" });
  });

  test("leaves the stored password untouched when the old password is wrong", async () => {
    verifyCredentialsMock.mockResolvedValue({ status: "WRONG_CREDENTIALS_ERROR" });

    await changeUserPasswordHandler(makeRequest(), makeReply());

    expect(updatePasswordMock).not.toHaveBeenCalled();
  });

  test("reports a 500 when the update hits an unknown user id", async () => {
    updatePasswordMock.mockResolvedValue({ status: "UNKNOWN_USER_ID_ERROR" });
    const reply = makeReply();

    await changeUserPasswordHandler(makeRequest(), reply);

    expect(reply.code).toHaveBeenCalledWith(500);
    expect(reply.payload).toEqual({ success: false, message: "Unknown user id error" });
    expect(reply.code).not.toHaveBeenCalledWith(200);
  });

  test("fails loudly when the session user no longer exists in SuperTokens", async () => {
    getUserMock.mockResolvedValue(undefined);
    const reply = makeReply();

    await expect(changeUserPasswordHandler(makeRequest(), reply)).rejects.toThrow(
      "Should never come here",
    );

    expect(reply.code).toHaveBeenCalledWith(500);
    expect(reply.payload).toEqual({ success: false, message: "Access failed" });
    expect(verifyCredentialsMock).not.toHaveBeenCalled();
  });

  test("does not touch the password when there is no session", async () => {
    getSessionMock.mockRejectedValue(new Error("no session"));

    await expect(changeUserPasswordHandler(makeRequest(), makeReply())).rejects.toThrow(
      "no session",
    );

    expect(verifyCredentialsMock).not.toHaveBeenCalled();
    expect(updatePasswordMock).not.toHaveBeenCalled();
  });
});

describe("changeUserPasswordHandler - a password the policy rejects", () => {
  // The PASSWORD_POLICY_VIOLATED_ERROR branch used to be commented out, so SuperTokens
  // rejected the weak password and the caller was still told it worked.
  test("answers 400 when SuperTokens rejects the new password as too weak", async () => {
    updatePasswordMock.mockResolvedValue({
      status: "PASSWORD_POLICY_VIOLATED_ERROR",
      failureReason: "Password must contain at least 8 characters",
    });
    const reply = makeReply();

    await changeUserPasswordHandler(makeRequest({ newPassword: "123" }), reply);

    expect(reply.code).toHaveBeenCalledWith(400);
    expect(reply.payload).toEqual({
      success: false,
      message: "Password must contain at least 8 characters",
    });
  });

  test("falls back to a generic message when the rejection carries no reason", async () => {
    updatePasswordMock.mockResolvedValue({ status: "PASSWORD_POLICY_VIOLATED_ERROR" });
    const reply = makeReply();

    await changeUserPasswordHandler(makeRequest({ newPassword: "123" }), reply);

    expect(reply.code).toHaveBeenCalledWith(400);
    expect(reply.payload).toMatchObject({
      message: "Password does not meet the required format",
    });
  });
});
