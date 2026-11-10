import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

vi.mock("../../../authz/ownership.js", () => ({
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
  removeMemberFromOrg: vi.fn(),
  revokeUserSessions: vi.fn(),
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
vi.mock("../../../utils/supertoken/supertoken.js", () => ({
  deleteSuperTokenUserForId: vi.fn(),
  getUserInfo: vi.fn(),
}));
vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}));

import supertokens from "supertokens-node";
import Session from "supertokens-node/recipe/session/index.js";
import { Prisma } from "../../../generated/prisma/client.js";
import { checkEmailExist, createUserSignup } from "./user.service.js";
import { UserRecipes } from "../../../types/enums.js";
import { getUserInfo } from "../../../utils/supertoken/supertoken.js";
import {
  checkEmailExistHandler,
  createAppleUserHandler,
  createGoogleUserHandler,
} from "./user.controller.js";

type Mock = ReturnType<typeof vi.fn>;

const getSessionMock = Session.getSession as unknown as Mock;
const getUserMock = supertokens.getUser as unknown as Mock;
const createUserSignupMock = createUserSignup as unknown as Mock;
const checkEmailExistMock = checkEmailExist as unknown as Mock;

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
  return { body } as any;
}

/** The shape the frontend posts after a social sign-in completes. */
function googleBody(overrides: Record<string, unknown> = {}) {
  return {
    type: "google",
    name: "Owner",
    orgName: "Acme",
    phoneNumber: "+15550001",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  getSessionMock.mockResolvedValue({ getUserId: () => "user-1" });
  getUserMock.mockResolvedValue({ emails: ["owner@acme.com"], phoneNumbers: ["+15550001"] });
  createUserSignupMock.mockResolvedValue({ id: "user-1" });
});

describe("createGoogleUserHandler", () => {
  test("signs the session user up with their Google email and profile answers", async () => {
    const reply = makeReply();

    await createGoogleUserHandler(
      makeRequest(
        googleBody({
          location: "Berlin",
          industry: "Retail",
          goals: ["reviews"],
          integrationsSelected: ["shopify"],
          referralCode: "REF123",
        }),
      ),
      reply,
    );

    expect(getUserMock).toHaveBeenCalledWith("user-1");
    expect(createUserSignupMock).toHaveBeenCalledWith({
      id: "user-1",
      email: "owner@acme.com",
      name: "Owner",
      orgName: "Acme",
      phoneNumber: "+15550001",
      phone: "+15550001",
      recipeName: UserRecipes.ThirdPartyGoogle,
      location: "Berlin",
      industry: "Retail",
      website: undefined,
      goals: ["reviews"],
      integrationsSelected: ["shopify"],
      referralCode: "REF123",
    });
    expect(reply.code).toHaveBeenCalledWith(201);
    expect(reply.payload).toEqual({ id: "user-1" });
  });

  test("ignores a posted email when the sign-in has its own address", async () => {
    await createGoogleUserHandler(
      makeRequest(
        googleBody({ type: "passwordless", email: "cfo@target.com", phoneNumber: "+15559999" }),
      ),
      makeReply(),
    );

    expect(createUserSignupMock.mock.calls[0][0]).toMatchObject({
      email: "owner@acme.com",
      phone: "+15559999",
      phoneNumber: "+15559999",
    });
  });

  test("a phone-only sign-in may name an address nobody uses, normalised", async () => {
    getUserMock.mockResolvedValue({ emails: [], phoneNumbers: ["+15559999"] });
    (getUserInfo as unknown as Mock).mockResolvedValue([]);

    await createGoogleUserHandler(
      makeRequest(googleBody({ type: "passwordless", email: " New@Acme.com " })),
      makeReply(),
    );

    expect(createUserSignupMock.mock.calls[0][0].email).toBe("new@acme.com");
  });

  test("a phone-only sign-in cannot claim an address another sign-in already uses", async () => {
    getUserMock.mockResolvedValue({ emails: [], phoneNumbers: ["+15559999"] });
    (getUserInfo as unknown as Mock).mockResolvedValue([{ id: "someone-else" }]);
    const reply = makeReply();

    await createGoogleUserHandler(
      makeRequest(googleBody({ type: "passwordless", email: "cfo@target.com" })),
      reply,
    );

    expect(reply.code).toHaveBeenCalledWith(400);
    expect(createUserSignupMock).not.toHaveBeenCalled();
  });

  test("refuses a sign-in with no address of its own and none posted", async () => {
    getUserMock.mockResolvedValue({ emails: [], phoneNumbers: [] });
    const reply = makeReply();

    await createGoogleUserHandler(makeRequest({ type: "google" }), reply);

    expect(reply.code).toHaveBeenCalledWith(400);
    expect(createUserSignupMock).not.toHaveBeenCalled();
  });

  test.each([
    ["adds a scheme to a bare domain", "acme.com", "https://acme.com"],
    ["leaves an https url untouched", "https://acme.com", "https://acme.com"],
    ["leaves an http url untouched", "http://acme.com", "http://acme.com"],
    ["omits the website when it is blank", "", undefined],
  ])("%s", async (_name, website, expected) => {
    await createGoogleUserHandler(makeRequest(googleBody({ website })), makeReply());

    expect(createUserSignupMock.mock.calls[0][0].website).toBe(expected);
  });

  test("coerces non-array goals and integrations to empty lists", async () => {
    await createGoogleUserHandler(
      makeRequest(googleBody({ goals: "reviews", integrationsSelected: null })),
      makeReply(),
    );

    expect(createUserSignupMock.mock.calls[0][0]).toMatchObject({
      goals: [],
      integrationsSelected: [],
    });
  });

  test("explains a duplicate signup (P2002) instead of leaking the Prisma message", async () => {
    createUserSignupMock.mockRejectedValue(
      new (Prisma.PrismaClientKnownRequestError as any)("Unique constraint failed", "P2002"),
    );
    const reply = makeReply();

    await createGoogleUserHandler(makeRequest(googleBody()), reply);

    expect(reply.code).toHaveBeenCalledWith(500);
    expect(reply.payload).toEqual({
      success: false,
      message: "User already exists. Please logout and Login again.",
    });
  });

  test("passes through the message for a non-duplicate Prisma error", async () => {
    createUserSignupMock.mockRejectedValue(
      new (Prisma.PrismaClientKnownRequestError as any)("FK violated", "P2003"),
    );
    const reply = makeReply();

    await createGoogleUserHandler(makeRequest(googleBody()), reply);

    expect(reply.payload).toEqual({ success: false, message: "FK violated" });
  });

  test("returns 500 without a 201 when signup throws", async () => {
    createUserSignupMock.mockRejectedValue(new Error("boom"));
    const reply = makeReply();

    await createGoogleUserHandler(makeRequest(googleBody()), reply);

    expect(reply.code).toHaveBeenCalledWith(500);
    expect(reply.code).not.toHaveBeenCalledWith(201);
  });

  test("does not attempt a signup when there is no session", async () => {
    getSessionMock.mockRejectedValue(new Error("no session"));

    await expect(createGoogleUserHandler(makeRequest(googleBody()), makeReply())).rejects.toThrow(
      "no session",
    );
    expect(createUserSignupMock).not.toHaveBeenCalled();
  });
});

describe("createAppleUserHandler", () => {
  test("signs the session user up under the Apple recipe", async () => {
    const reply = makeReply();

    await createAppleUserHandler(makeRequest(googleBody({ type: "apple" })), reply);

    expect(createUserSignupMock.mock.calls[0][0]).toMatchObject({
      id: "user-1",
      email: "owner@acme.com",
      recipeName: UserRecipes.ThirdPartyApple,
    });
    expect(reply.code).toHaveBeenCalledWith(201);
  });

  test("takes the email from the sign-in, never the body", async () => {
    await createAppleUserHandler(
      makeRequest(
        googleBody({ type: "google", email: "posted@acme.com", phoneNumber: "+1555888" }),
      ),
      makeReply(),
    );

    expect(createUserSignupMock.mock.calls[0][0]).toMatchObject({
      email: "owner@acme.com",
      phone: "+1555888",
    });
  });

  test("explains a duplicate signup (P2002)", async () => {
    createUserSignupMock.mockRejectedValue(
      new (Prisma.PrismaClientKnownRequestError as any)("Unique constraint failed", "P2002"),
    );
    const reply = makeReply();

    await createAppleUserHandler(makeRequest(googleBody({ type: "apple" })), reply);

    expect(reply.code).toHaveBeenCalledWith(500);
    expect(reply.payload).toEqual({
      success: false,
      message: "User already exists. Please logout and Login again.",
    });
  });
});

describe("checkEmailExistHandler", () => {
  test("reports success:true when the email is already taken", async () => {
    checkEmailExistMock.mockResolvedValue(true);
    const reply = makeReply();

    await checkEmailExistHandler(makeRequest({ email: "owner@acme.com" }), reply);

    expect(checkEmailExistMock).toHaveBeenCalledWith("owner@acme.com");
    expect(reply.code).toHaveBeenCalledWith(200);
    expect(reply.payload).toEqual({ success: true });
  });

  test("reports success:false when the email is free", async () => {
    checkEmailExistMock.mockResolvedValue(false);
    const reply = makeReply();

    await checkEmailExistHandler(makeRequest({ email: "new@acme.com" }), reply);

    expect(reply.payload).toEqual({ success: false });
  });

  test("returns 500 with the error message when the lookup throws", async () => {
    checkEmailExistMock.mockRejectedValue(new Error("db down"));
    const reply = makeReply();

    await checkEmailExistHandler(makeRequest({ email: "new@acme.com" }), reply);

    expect(reply.code).toHaveBeenCalledWith(500);
    expect(reply.payload).toEqual({ success: false, message: "db down" });
  });
});
