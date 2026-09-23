import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("supertokens-node/recipe/session/index.js", () => ({ default: { getSession: vi.fn() } }));
vi.mock("../utils/logger.js", () => ({ log: { warn: vi.fn(), error: vi.fn() } }));
vi.mock("../utils/auditLog.js", () => ({ auditLogHook: vi.fn() }));
vi.mock("../modules/user/user.service.js", () => ({ getOrgIdAndRole: vi.fn() }));
// Reads Redis and the org row on every authenticated request; the suspension rule itself
// is covered in modules/org/orgSuspension.test.ts.
vi.mock("../modules/org/orgSuspension.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../modules/org/orgSuspension.js")>();
  return { ...actual, isOrgSuspended: vi.fn() };
});
vi.mock("./actor.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./actor.js")>();
  return { ...actual, loadActor: vi.fn() };
});

import Session from "supertokens-node/recipe/session/index.js";
import { auditLogHook } from "../utils/auditLog.js";
import { log } from "../utils/logger.js";
import { getOrgIdAndRole } from "../modules/user/user.service.js";
import { isOrgSuspended } from "../modules/org/orgSuspension.js";
import { buildActor, loadActor } from "./actor.js";
import { attachSessionActor, authorize, isAuditOnly, routeModule } from "./authorize.js";
import type { RoleKey } from "./roles.js";

type Mock = ReturnType<typeof vi.fn>;
const getSession = Session.getSession as unknown as Mock;
const loadActorMock = loadActor as unknown as Mock;
const getOrgIdAndRoleMock = getOrgIdAndRole as unknown as Mock;
const isOrgSuspendedMock = isOrgSuspended as unknown as Mock;

const PAYLOAD = { role: "SUPER_ADMIN", orgId: "org-1", email: "a@b.c" };

function session(payload: Record<string, unknown> = PAYLOAD, userId = "user-1") {
  return {
    getUserId: () => userId,
    getAccessTokenPayload: () => payload,
    mergeIntoAccessTokenPayload: vi.fn(),
  };
}

function reply() {
  const r: any = {
    statusCode: undefined,
    payload: undefined,
    code: vi.fn((c: number) => ((r.statusCode = c), r)),
    send: vi.fn((p?: unknown) => ((r.payload = p), r)),
  };
  return r;
}

function request(config: Record<string, unknown> = {}, extra: Record<string, unknown> = {}) {
  return {
    method: "PUT",
    headers: {},
    routeOptions: { url: "/api/wa/settings/:id", config },
    ...extra,
  } as any;
}

const actorFor = (roleKey: RoleKey, teamIds: string[] = []) =>
  buildActor({ kind: "user", userId: "user-1", orgId: "org-1", roleKey }, { teamIds });

beforeEach(() => {
  vi.clearAllMocks();
  getSession.mockResolvedValue(session());
  loadActorMock.mockResolvedValue(actorFor("STAFF", ["t1"]));
  getOrgIdAndRoleMock.mockResolvedValue(null);
  isOrgSuspendedMock.mockResolvedValue(false);
});

describe("an org RateUp staff have suspended", () => {
  test("is refused with ORG_SUSPENDED, before the route or the audit hook runs", async () => {
    isOrgSuspendedMock.mockResolvedValue(true);
    const req = request({ access: "session" });
    const rep = reply();
    await authorize(req, rep);
    expect(rep.statusCode).toBe(403);
    expect(rep.payload).toMatchObject({ code: "ORG_SUSPENDED" });
    expect(auditLogHook).not.toHaveBeenCalled();
  });

  test("can still reach the routes that render the suspended screen", async () => {
    isOrgSuspendedMock.mockResolvedValue(true);
    const req = request(
      { access: "session" },
      { routeOptions: { url: "/api/user/info", config: { access: "session" } } },
    );
    const rep = reply();
    await authorize(req, rep);
    expect(rep.send).not.toHaveBeenCalled();
    expect(req.actor.roleKey).toBe("STAFF");
  });
});

afterEach(() => {
  delete process.env.AUTHZ_AUDIT_ONLY;
});

describe("authorize - which routes it touches", () => {
  test("does nothing for an undeclared route (its legacy guards still apply)", async () => {
    const req = request({});
    await authorize(req, reply());
    expect(getSession).not.toHaveBeenCalled();
    expect(req.actor).toBeUndefined();
  });

  test("does nothing for public and token routes", async () => {
    await authorize(request({ access: "public" }), reply());
    await authorize(request({ access: "token" }), reply());
    expect(getSession).not.toHaveBeenCalled();
  });

  test("a session route attaches the actor and the legacy user, then lets the request through", async () => {
    const req = request({ access: "session" });
    const rep = reply();
    await authorize(req, rep);
    expect(rep.send).not.toHaveBeenCalled();
    expect(req.userId).toBe("user-1");
    expect(req.actor.roleKey).toBe("STAFF");
    // The legacy shape is kept, with the role from the database rather than the token.
    expect(req.user).toEqual({ userId: "user-1", role: "MEMBER", orgId: "org-1", email: "a@b.c" });
    expect(auditLogHook).toHaveBeenCalledWith(req, rep);
  });
});

describe("authorize - permission routes", () => {
  test("allows when the actor holds the permission", async () => {
    const rep = reply();
    await authorize(request({ permission: "inbox.reply" }), rep);
    expect(rep.send).not.toHaveBeenCalled();
  });

  test("any one of a list suffices", async () => {
    const rep = reply();
    await authorize(request({ permission: ["billing.manage", "inbox.reply"] }), rep);
    expect(rep.send).not.toHaveBeenCalled();
  });

  test("refuses with 403, reason permission and the permission named", async () => {
    const rep = reply();
    await authorize(request({ permission: "channels.manage" }), rep);
    expect(rep.statusCode).toBe(403);
    expect(rep.payload).toEqual({
      error: "Permissions failed.",
      message: "Action requires channels.manage.",
      reason: "permission",
      permission: "channels.manage",
    });
  });

  test("a signed-in user with no membership is refused a permission route", async () => {
    loadActorMock.mockResolvedValue(null);
    const rep = reply();
    await authorize(request({ permission: "inbox.read" }), rep);
    expect(rep.statusCode).toBe(403);
  });

  test("but is let through a plain session route, with the token's identity", async () => {
    loadActorMock.mockResolvedValue(null);
    const req = request({ access: "session" });
    const rep = reply();
    await authorize(req, rep);
    expect(rep.send).not.toHaveBeenCalled();
    expect(req.actor).toBeUndefined();
    expect(req.user.role).toBe("SUPER_ADMIN");
  });

  test("audit-only for the route's module logs the refusal and lets it through", async () => {
    process.env.AUTHZ_AUDIT_ONLY = "loyalty, wa";
    const rep = reply();
    await authorize(request({ permission: "channels.manage" }), rep);
    expect(rep.send).not.toHaveBeenCalled();
    expect(log.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        permission: ["channels.manage"],
        roleKey: "STAFF",
        route: "PUT /api/wa/settings/:id",
      }),
      expect.stringContaining("would be refused"),
    );
  });

  test("audit-only for another module still refuses", async () => {
    process.env.AUTHZ_AUDIT_ONLY = "loyalty";
    const rep = reply();
    await authorize(request({ permission: "channels.manage" }), rep);
    expect(rep.statusCode).toBe(403);
  });
});

describe("attachSessionActor", () => {
  test("answers 401 when there is no usable session", async () => {
    getSession.mockRejectedValue(new Error("no session"));
    const rep = reply();
    expect(await attachSessionActor(request({ access: "session" }), rep)).toBe(false);
    expect(rep.statusCode).toBe(401);
    expect(auditLogHook).not.toHaveBeenCalled();
  });

  test("recovers a missing org from the membership and writes it back to the token", async () => {
    const s = session({ email: "a@b.c" });
    getSession.mockResolvedValue(s);
    getOrgIdAndRoleMock.mockResolvedValue({ orgId: "org-9", role: "MEMBER" });
    loadActorMock.mockResolvedValue(
      buildActor({ kind: "user", userId: "user-1", orgId: "org-9", roleKey: "STAFF" }),
    );
    const req = request({ access: "session" });
    await attachSessionActor(req, reply());
    expect(s.mergeIntoAccessTokenPayload).toHaveBeenCalledWith({ orgId: "org-9", role: "MEMBER" });
    expect(loadActorMock).toHaveBeenCalledWith("user-1", "org-9");
    expect(req.user.orgId).toBe("org-9");
  });

  test("is idempotent: an actor already on the request is kept", async () => {
    const existing = actorFor("ADMIN");
    const req = request({ access: "session" }, { actor: existing });
    expect(await attachSessionActor(req, reply())).toBe(true);
    expect(getSession).not.toHaveBeenCalled();
    expect(req.actor).toBe(existing);
  });
});

describe("audit-only helpers", () => {
  test("routeModule is the segment after /api", () => {
    expect(routeModule("/api/loyalty/programs/:id")).toBe("loyalty");
    expect(routeModule(undefined)).toBeUndefined();
  });

  test("isAuditOnly matches the comma list, trimming spaces", () => {
    process.env.AUTHZ_AUDIT_ONLY = "loyalty , org";
    expect(isAuditOnly("/api/org/pause/:id")).toBe(true);
    expect(isAuditOnly("/api/team")).toBe(false);
    delete process.env.AUTHZ_AUDIT_ONLY;
    expect(isAuditOnly("/api/org/pause/:id")).toBe(false);
  });
});
