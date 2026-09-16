import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("supertokens-node/recipe/session/index.js", () => ({
  default: { getSession: vi.fn() },
}));
vi.mock("./logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}));
vi.mock("./auditLog.js", () => ({ auditLogHook: vi.fn() }));
vi.mock("../modules/user/user.service.js", () => ({ getOrgIdAndRole: vi.fn() }));

import Session from "supertokens-node/recipe/session/index.js";
import { log } from "./logger.js";
import { auditLogHook } from "./auditLog.js";
import { getOrgIdAndRole } from "../modules/user/user.service.js";
import { checkSession } from "./checkSession.js";
import { checkRoleHandler } from "./checkRoleHandler.js";

type Mock = ReturnType<typeof vi.fn>;

const getSessionMock = Session.getSession as unknown as Mock;
const auditLogHookMock = auditLogHook as unknown as Mock;
const getOrgIdAndRoleMock = getOrgIdAndRole as unknown as Mock;

const TOKEN_PAYLOAD = { role: "SUPER_ADMIN", orgId: "org-1", email: "owner@acme.com" };

function makeSession(overrides: Record<string, unknown> = {}) {
  return {
    getUserId: () => "user-1",
    getAccessTokenPayload: () => TOKEN_PAYLOAD,
    mergeIntoAccessTokenPayload: vi.fn(),
    ...overrides,
  };
}

function makeReply() {
  const reply: any = {
    statusCode: undefined,
    payload: undefined,
    code: vi.fn((c: number) => {
      reply.statusCode = c;
      return reply;
    }),
    status: vi.fn((c: number) => {
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

function makeRequest(overrides: Record<string, unknown> = {}) {
  return { headers: {}, method: "GET", url: "/api/user/info", ...overrides } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  getSessionMock.mockResolvedValue(makeSession());
  getOrgIdAndRoleMock.mockResolvedValue(null);
});

describe("checkSession - a valid session", () => {
  test("puts the logged-in user id on the request", async () => {
    const request = makeRequest();

    await checkSession(request, makeReply());

    expect(request.userId).toBe("user-1");
  });

  test("unpacks the identity the login stamped into the access token", async () => {
    const request = makeRequest();

    await checkSession(request, makeReply());

    expect(request.user).toEqual({
      userId: "user-1",
      role: "SUPER_ADMIN",
      orgId: "org-1",
      email: "owner@acme.com",
    });
  });

  test("lets the request through without a reply of its own", async () => {
    const reply = makeReply();

    await checkSession(makeRequest(), reply);

    expect(reply.code).not.toHaveBeenCalled();
    expect(reply.send).not.toHaveBeenCalled();
  });

  test("records the request in the audit log once the caller is known", async () => {
    const request = makeRequest({ method: "POST" });
    const reply = makeReply();

    await checkSession(request, reply);

    expect(auditLogHookMock).toHaveBeenCalledWith(request, reply);
  });

  test("leaves the identity fields undefined when the user belongs to no org", async () => {
    getSessionMock.mockResolvedValue(
      makeSession({ getAccessTokenPayload: () => ({ email: "owner@acme.com" }) }),
    );
    const request = makeRequest();

    await checkSession(request, makeReply());

    expect(request.user).toEqual({
      userId: "user-1",
      role: undefined,
      orgId: undefined,
      email: "owner@acme.com",
    });
  });

  test("does not go looking for an org when the token already names one", async () => {
    await checkSession(makeRequest(), makeReply());

    expect(getOrgIdAndRoleMock).not.toHaveBeenCalled();
  });
});

// A first sign-up creates the session before it creates the org, so the token it
// issues names no org. Every request after that has to be able to recover it.
describe("checkSession - a session issued before the org existed", () => {
  const noOrgSession = () =>
    makeSession({ getAccessTokenPayload: () => ({ email: "owner@acme.com" }) });

  test("recovers the org from the user's membership", async () => {
    getSessionMock.mockResolvedValue(noOrgSession());
    getOrgIdAndRoleMock.mockResolvedValue({ orgId: "org-9", role: "SUPER_ADMIN" });
    const request = makeRequest();

    await checkSession(request, makeReply());

    expect(request.user).toEqual({
      userId: "user-1",
      role: "SUPER_ADMIN",
      orgId: "org-9",
      email: "owner@acme.com",
    });
  });

  test("writes it back to the token so the next request needs no lookup", async () => {
    const session = noOrgSession();
    getSessionMock.mockResolvedValue(session);
    getOrgIdAndRoleMock.mockResolvedValue({ orgId: "org-9", role: "SUPER_ADMIN" });

    await checkSession(makeRequest(), makeReply());

    expect(session.mergeIntoAccessTokenPayload).toHaveBeenCalledWith({
      orgId: "org-9",
      role: "SUPER_ADMIN",
    });
  });

  test("looks the membership up for the session's own user", async () => {
    getSessionMock.mockResolvedValue(noOrgSession());
    getOrgIdAndRoleMock.mockResolvedValue({ orgId: "org-9", role: "SUPER_ADMIN" });

    await checkSession(makeRequest(), makeReply());

    expect(getOrgIdAndRoleMock).toHaveBeenCalledWith({ id: "user-1" });
  });

  test("leaves the token alone when there is no membership to recover", async () => {
    const session = noOrgSession();
    getSessionMock.mockResolvedValue(session);
    const reply = makeReply();

    await checkSession(makeRequest(), reply);

    expect(session.mergeIntoAccessTokenPayload).not.toHaveBeenCalled();
    // Still a valid session - the feature gate, not this hook, decides what an
    // org-less caller may reach.
    expect(reply.code).not.toHaveBeenCalled();
  });
});

describe("checkSession - no usable session", () => {
  test("answers 401 when there is no session at all", async () => {
    getSessionMock.mockRejectedValue(new Error("unauthorised"));
    const reply = makeReply();

    await checkSession(makeRequest(), reply);

    expect(reply.code).toHaveBeenCalledWith(401);
    expect(reply.payload).toEqual({ message: "Not authorized" });
  });

  test("does not record an audit entry for a rejected request", async () => {
    getSessionMock.mockRejectedValue(new Error("unauthorised"));

    await checkSession(makeRequest(), makeReply());

    expect(auditLogHookMock).not.toHaveBeenCalled();
  });

  test("answers 401 when the session carries no user id", async () => {
    getSessionMock.mockResolvedValue(makeSession({ getUserId: () => "" }));
    const reply = makeReply();

    await checkSession(makeRequest(), reply);

    expect(reply.code).toHaveBeenCalledWith(401);
    expect(log.error).toHaveBeenCalled();
  });

  test("answers 401 when the audit log write throws", async () => {
    auditLogHookMock.mockRejectedValue(new Error("db down"));
    const reply = makeReply();

    await checkSession(makeRequest({ method: "POST" }), reply);

    expect(reply.code).toHaveBeenCalledWith(401);
  });

  // The guard returns after replying 401, so nothing downstream runs on a request that
  // was just rejected for having no user id.
  test("stops after replying 401 for a missing user id", async () => {
    getSessionMock.mockResolvedValue(makeSession({ getUserId: () => "" }));
    const request = makeRequest();
    const reply = makeReply();

    await checkSession(request, reply);

    expect(reply.code).toHaveBeenCalledWith(401);
    expect(request.user).toBeUndefined();
    expect(auditLogHookMock).not.toHaveBeenCalled();
  });
});

describe("checkRoleHandler", () => {
  test("lets a caller holding the required role through", async () => {
    const reply = makeReply();

    await checkRoleHandler(["SUPER_ADMIN"])(makeRequest(), reply);

    expect(reply.status).not.toHaveBeenCalled();
  });

  test("accepts any one of several allowed roles", async () => {
    const reply = makeReply();

    await checkRoleHandler(["ADMIN", "SUPER_ADMIN"])(makeRequest(), reply);

    expect(reply.status).not.toHaveBeenCalled();
  });

  test("blocks a caller whose role is not allowed", async () => {
    getSessionMock.mockResolvedValue(
      makeSession({ getAccessTokenPayload: () => ({ ...TOKEN_PAYLOAD, role: "MEMBER" }) }),
    );
    const reply = makeReply();

    await checkRoleHandler(["SUPER_ADMIN"])(makeRequest(), reply);

    expect(reply.status).toHaveBeenCalledWith(403);
    expect(reply.payload).toEqual({
      error: "Permissions failed.",
      message: "Action is only allowed for SUPER_ADMIN.",
    });
  });

  test("blocks a session whose token carries no role", async () => {
    getSessionMock.mockResolvedValue(makeSession({ getAccessTokenPayload: () => ({}) }));
    const reply = makeReply();

    await checkRoleHandler(["ADMIN"])(makeRequest(), reply);

    expect(reply.status).toHaveBeenCalledWith(403);
  });

  test("lists every allowed role in the refusal", async () => {
    getSessionMock.mockResolvedValue(
      makeSession({ getAccessTokenPayload: () => ({ role: "MEMBER" }) }),
    );
    const reply = makeReply();

    await checkRoleHandler(["ADMIN", "SUPER_ADMIN"])(makeRequest(), reply);

    expect(reply.payload.message).toBe("Action is only allowed for ADMIN, SUPER_ADMIN.");
  });

  test("propagates a missing session rather than answering 403", async () => {
    getSessionMock.mockRejectedValue(new Error("unauthorised"));

    await expect(checkRoleHandler(["ADMIN"])(makeRequest(), makeReply())).rejects.toThrow(
      "unauthorised",
    );
  });
});
