import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../utils/prisma.js", () => ({
  default: {
    org: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn(), findMany: vi.fn() },
    orgMember: { findUnique: vi.fn(), update: vi.fn(), findMany: vi.fn() },
  },
}));

vi.mock("../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock("./org.services.js", async () => {
  const actual = await vi.importActual<any>("./org.services.js").catch(() => ({}));
  return {
    ...actual,
    deleteOrg: vi.fn(),
    pauseOrg: vi.fn(),
    updateOrgUserRole: vi.fn(),
    setMemberPermissionOverrides: vi.fn(),
    getMemberActivity: vi.fn(),
    getWebhookSecret: vi.fn(),
    createOrg: vi.fn(),
    getAllOrgs: vi.fn(),
    getOrgStats: vi.fn(),
    getAllTeamsAndMembersService: vi.fn(),
    getAllMembersWithTeams: vi.fn(),
    getAllMembersWithTeamsAndInvitation: vi.fn(),
    updateLogo: vi.fn(),
    updateOrgDetails: vi.fn(),
    completeOrgDetails: vi.fn(),
    getOrgNameAndPhone: vi.fn(),
    getOnboardingChecklist: vi.fn(),
    sendDeletionWarning: vi.fn(),
  };
});

vi.mock("./businessHour.controller.js", () => ({
  createBusinessHourHandler: vi.fn(),
  deleteBusinessHourHandler: vi.fn(),
  getAllBusinessHoursHandler: vi.fn(),
  getBusinessHourHandler: vi.fn(),
  updateBusinessHourHandler: vi.fn(),
}));

vi.mock("../../utils/webhook.js", () => ({ getWebhookSecret: vi.fn() }));
vi.mock("../../utils/checkSession.js", () => ({ checkSession: vi.fn() }));
vi.mock("../../authz/ownership.js", () => ({
  assertNotOwner: vi.fn(),
  transferOwnership: vi.fn(),
}));
vi.mock("../../utils/auth.js", async () => {
  const { isRootOrg } = await vi.importActual<any>("../../utils/auth.js");
  // assertRootOrg is stubbed so route registration can be identity-compared;
  // isRootOrg is the real predicate, since pauseOrgHandler's platform-operator
  // branch is one of the things under test.
  return { assertRootOrg: vi.fn(), isRootOrg };
});

import * as orgService from "./org.services.js";
import { getWebhookSecret } from "../../utils/webhook.js";
import { assertRootOrg } from "../../utils/auth.js";
import {
  deleteOrgAdminHandler,
  deleteOrgHandler,
  getWebhookClientSecretHandler,
  pauseOrgHandler,
  updateRoleController,
  updateMemberPermissionsHandler,
  memberActivityHandler,
} from "./org.controller.js";
import { orgRoutes } from "./org.route.js";
import { ROLE_PERMISSIONS } from "../../authz/roles.js";
import { assertNotOwner } from "../../authz/ownership.js";
import { ForbiddenError } from "../../authz/errors.js";
import { pauseOrgSchema, updateRoleSchema } from "./org.schema.js";

type Mock = ReturnType<typeof vi.fn>;

const svc = orgService as unknown as Record<string, Mock>;

const OWN_ORG = "11111111-1111-1111-1111-111111111111";
const VICTIM_ORG = "22222222-2222-2222-2222-222222222222";
const MEMBER = "3f8a1e2c-5b7d-4c9e-8a1b-2d3e4f5a6b7c";

function reply() {
  const rep: any = { code: vi.fn(() => rep), send: vi.fn(() => rep) };
  return rep;
}

function answer(rep: any) {
  return { code: rep.code.mock.calls[0]?.[0], body: rep.send.mock.calls[0]?.[0] };
}

async function collectRoutes() {
  const routes: any[] = [];
  const hooks: any[] = [];
  const srv: any = {
    addHook: vi.fn((name, fn) => hooks.push({ name, fn })),
    get: vi.fn((url, opts, handler) => routes.push({ method: "GET", url, opts, handler })),
    post: vi.fn((url, opts, handler) => routes.push({ method: "POST", url, opts, handler })),
    put: vi.fn((url, opts, handler) => routes.push({ method: "PUT", url, opts, handler })),
    delete: vi.fn((url, opts, handler) => routes.push({ method: "DELETE", url, opts, handler })),
  };
  await orgRoutes(srv);
  return { srv, routes, hooks };
}

beforeEach(() => {
  vi.clearAllMocks();
  // clearAllMocks keeps implementations but drops queued values.
  svc.deleteOrg.mockResolvedValue("deleted");
  svc.pauseOrg.mockResolvedValue({ id: VICTIM_ORG, isPaused: true });
  svc.updateOrgUserRole.mockResolvedValue({ userId: MEMBER, role: "ADMIN" });
  (getWebhookSecret as unknown as Mock).mockResolvedValue({ secret: "whsec" });
});

// ===========================================================================
// deleteOrgHandler — the id comes from the path
// ===========================================================================

describe("deleteOrgHandler", () => {
  test("refuses to delete an org other than the session's", async () => {
    const rep = reply();

    await deleteOrgHandler(
      { params: { orgId: VICTIM_ORG }, user: { orgId: OWN_ORG, role: "SUPER_ADMIN" } } as never,
      rep,
    );

    expect(svc.deleteOrg).not.toHaveBeenCalled();
    expect(answer(rep).code).toBe(403);
  });

  test("deletes the session org", async () => {
    const rep = reply();

    await deleteOrgHandler(
      { params: { orgId: OWN_ORG }, user: { orgId: OWN_ORG, role: "SUPER_ADMIN" } } as never,
      rep,
    );

    expect(svc.deleteOrg).toHaveBeenCalledWith(OWN_ORG);
    expect(answer(rep).code).toBe(200);
  });

  test("refuses a request with no session org", async () => {
    const rep = reply();

    await deleteOrgHandler({ params: { orgId: OWN_ORG }, user: {} } as never, rep);

    expect(svc.deleteOrg).not.toHaveBeenCalled();
    expect(answer(rep).code).toBe(401);
  });

  // The platform-operator twin keeps the old behaviour, which is what it was
  // always for: it is gated on assertRootOrg rather than on a role.
  test("the admin twin deletes whatever org the path names", async () => {
    const rep = reply();

    await deleteOrgAdminHandler({ params: { orgId: VICTIM_ORG } } as never, rep);

    expect(svc.deleteOrg).toHaveBeenCalledWith(VICTIM_ORG);
    expect(answer(rep).code).toBe(200);
  });

  test("the two routes now carry different handlers", async () => {
    const { routes } = await collectRoutes();

    const byId = routes.find((r) => r.method === "DELETE" && r.url === "/:orgId");
    const admin = routes.find((r) => r.method === "DELETE" && r.url === "/admin/:orgId");

    expect(byId.handler).toBe(deleteOrgHandler);
    expect(admin.handler).toBe(deleteOrgAdminHandler);
    expect(byId.opts.config.permission).toBe("org.delete");
    expect(admin.opts.preHandler).toBe(assertRootOrg);
  });

  test("a failure answers 500 with the underlying message", async () => {
    svc.deleteOrg.mockRejectedValueOnce(new Error("Organization with ID x not found."));
    const rep = reply();

    await deleteOrgHandler({ params: { orgId: OWN_ORG }, user: { orgId: OWN_ORG } } as never, rep);

    expect(answer(rep)).toEqual({
      code: 500,
      body: { success: false, message: "Organization with ID x not found." },
    });
  });
});

// ===========================================================================
// pauseOrgHandler — the same shape
// ===========================================================================

describe("pauseOrgHandler", () => {
  test("refuses to pause an org other than the session's", async () => {
    const rep = reply();

    await pauseOrgHandler(
      {
        params: { id: VICTIM_ORG },
        body: { isPaused: true },
        user: { orgId: OWN_ORG, role: "SUPER_ADMIN" },
      } as never,
      rep,
    );

    expect(svc.pauseOrg).not.toHaveBeenCalled();
    expect(answer(rep).code).toBe(403);
  });

  test("pauses the session org", async () => {
    const rep = reply();

    await pauseOrgHandler(
      {
        params: { id: OWN_ORG },
        body: { isPaused: true },
        user: { orgId: OWN_ORG, role: "SUPER_ADMIN" },
      } as never,
      rep,
    );

    expect(svc.pauseOrg).toHaveBeenCalledWith(OWN_ORG, { isPaused: true });
    expect(answer(rep).code).toBe(200);
  });

  // There is no /admin twin for pause, so the platform operator keeps the
  // cross-org path through the root org rather than losing the capability.
  test("the root org may still pause any org", async () => {
    const previous = process.env.ROOT_ORG;
    process.env.ROOT_ORG = OWN_ORG;
    const rep = reply();

    await pauseOrgHandler(
      {
        params: { id: VICTIM_ORG },
        body: { isPaused: true },
        user: { orgId: OWN_ORG, role: "SUPER_ADMIN" },
      } as never,
      rep,
    );

    process.env.ROOT_ORG = previous;
    expect(svc.pauseOrg).toHaveBeenCalledWith(VICTIM_ORG, { isPaused: true });
    expect(answer(rep).code).toBe(200);
  });

  test("refuses a request with no session org", async () => {
    const rep = reply();

    await pauseOrgHandler(
      { params: { id: OWN_ORG }, body: { isPaused: true }, user: {} } as never,
      rep,
    );

    expect(svc.pauseOrg).not.toHaveBeenCalled();
    expect(answer(rep).code).toBe(401);
  });

  test("the body schema bounds what can be written", () => {
    expect(pauseOrgSchema.safeParse({ isPaused: true }).success).toBe(true);
    const parsed = pauseOrgSchema.safeParse({ isPaused: true, name: "Renamed" });
    expect(parsed.success).toBe(true);
    expect((parsed as any).data).not.toHaveProperty("name");
  });

  // The route gates are unchanged — the role check is still the right check for
  // "may this member act on their own org". What changed is that the handlers
  // now take the org from the session rather than the path.
  test("both destructive routes are gated on a permission", async () => {
    const { routes } = await collectRoutes();

    const pause = routes.find((r) => r.url === "/pause/:id");
    const del = routes.find((r) => r.method === "DELETE" && r.url === "/:orgId");

    expect(pause.opts.config.permission).toBe("members.manage");
    expect(del.opts.config.permission).toBe("org.delete");
  });
});

// ===========================================================================
// updateRoleController — the counter-example
// ===========================================================================

describe("updateRoleController", () => {
  // NOTE: the service this calls resolves the org from the session and looks
  // the member up on the (userId, orgId) compound unique, so it cannot reach
  // outside the caller's organisation.
  test("passes the request through so the service can scope on the session", async () => {
    await updateRoleController(
      {
        params: { id: MEMBER },
        body: { role: "ADMIN" },
        user: { orgId: OWN_ORG },
        actor: { permissions: ROLE_PERMISSIONS.OWNER },
      } as never,
      reply(),
    );

    expect(svc.updateOrgUserRole).toHaveBeenCalledOnce();
    expect(svc.updateOrgUserRole.mock.calls[0][0]).toEqual({ roleKey: "MANAGER" });
    expect(svc.updateOrgUserRole.mock.calls[0][1]).toEqual({ id: MEMBER });
  });

  test("accepts the new role key spelling as is", async () => {
    await updateRoleController(
      {
        params: { id: MEMBER },
        body: { roleKey: "AGENT" },
        user: { orgId: OWN_ORG },
        actor: { permissions: ROLE_PERMISSIONS.MANAGER },
      } as never,
      reply(),
    );

    expect(svc.updateOrgUserRole.mock.calls[0][0]).toEqual({ roleKey: "AGENT" });
  });

  test("refuses a role the caller does not hold themselves", async () => {
    const rep = reply();

    await updateRoleController(
      {
        params: { id: MEMBER },
        body: { role: "SUPER_ADMIN" },
        user: { orgId: OWN_ORG },
        actor: { permissions: ROLE_PERMISSIONS.MANAGER },
      } as never,
      rep,
    );

    expect(answer(rep).code).toBe(403);
    expect(svc.updateOrgUserRole).not.toHaveBeenCalled();
  });

  test("never changes the owner's role", async () => {
    (assertNotOwner as unknown as Mock).mockRejectedValueOnce(
      new ForbiddenError("The organisation owner cannot be given another role.", {
        reason: "permission",
        permission: "org.transfer_ownership",
      }),
    );
    const rep = reply();

    await updateRoleController(
      {
        params: { id: MEMBER },
        body: { role: "MEMBER" },
        user: { orgId: OWN_ORG },
        actor: { permissions: ROLE_PERMISSIONS.OWNER },
      } as never,
      rep,
    );

    expect(answer(rep).code).toBe(403);
    expect(answer(rep).body).toMatchObject({ permission: "org.transfer_ownership" });
    expect(svc.updateOrgUserRole).not.toHaveBeenCalled();
  });

  test("400s a body with no role", async () => {
    const rep = reply();

    await updateRoleController(
      {
        params: { id: MEMBER },
        body: {},
        user: { orgId: OWN_ORG },
        actor: { permissions: ROLE_PERMISSIONS.OWNER },
      } as never,
      rep,
    );

    expect(answer(rep)).toEqual({
      code: 400,
      body: { success: false, message: "Role is required" },
    });
    expect(svc.updateOrgUserRole).not.toHaveBeenCalled();
  });

  test("relays the service's refusal as a 400", async () => {
    svc.updateOrgUserRole.mockResolvedValueOnce("User is not a member of this organization");
    const rep = reply();

    await updateRoleController(
      {
        params: { id: MEMBER },
        body: { role: "ADMIN" },
        user: { orgId: OWN_ORG },
        actor: { permissions: ROLE_PERMISSIONS.OWNER },
      } as never,
      rep,
    );

    expect(answer(rep)).toEqual({
      code: 400,
      body: { success: false, message: "User is not a member of this organization" },
    });
  });

  test("the role schema accepts either spelling and nothing else", () => {
    for (const role of ["SUPER_ADMIN", "ADMIN", "MEMBER"]) {
      expect(updateRoleSchema.safeParse({ role }).success).toBe(true);
    }
    for (const roleKey of ["OWNER", "ADMIN", "MANAGER", "STAFF", "AGENT", "VIEWER"]) {
      expect(updateRoleSchema.safeParse({ roleKey }).success).toBe(true);
    }
    expect(updateRoleSchema.safeParse({}).success).toBe(false);
    expect(updateRoleSchema.safeParse({ roleKey: "WIZARD" }).success).toBe(false);
    expect(updateRoleSchema.safeParse({ role: "not-a-role" }).success).toBe(false);
    expect(updateRoleSchema.safeParse({ role: "" }).success).toBe(false);
    expect(updateRoleSchema.safeParse({ role: "super_admin" }).success).toBe(false);
  });
});

// ===========================================================================
// The scoped reads
// ===========================================================================

describe("the scoped handlers", () => {
  test("the webhook secret is read for the session org", async () => {
    const rep = reply();

    await getWebhookClientSecretHandler({ user: { orgId: OWN_ORG } } as never, rep);

    expect(getWebhookSecret).toHaveBeenCalledWith(OWN_ORG);
    expect(answer(rep).code).toBe(200);
  });

  test("a failure sends the raw error object", async () => {
    (getWebhookSecret as unknown as Mock).mockRejectedValueOnce(new Error("db down"));
    const rep = reply();

    await getWebhookClientSecretHandler({ user: { orgId: OWN_ORG } } as never, rep);

    expect(answer(rep).code).toBe(500);
  });
});

// ===========================================================================
// Route registration
// ===========================================================================

describe("orgRoutes", () => {
  test("requires a session for the whole tree", async () => {
    const { hooks } = await collectRoutes();

    expect(hooks).toEqual([{ name: "onRoute", fn: expect.any(Function) }]);
    const probe: any = { method: "GET", url: "/x", config: {} };
    hooks[0].fn(probe);
    expect(probe.config).toEqual({ access: "session" });
  });

  test("the platform-wide reads are gated on the root org", async () => {
    const { routes } = await collectRoutes();

    const gated = routes.filter((r) => r.opts?.preHandler === assertRootOrg);
    expect(gated.map((r) => `${r.method} ${r.url}`)).toEqual([
      "GET /",
      "GET /:orgId",
      "DELETE /admin/:orgId",
      "POST /org-deletion-warning-mail/:orgId",
    ]);
  });

  // NOTE: creating an organisation needs only a session — no role and no
  // platform check.
  test("creating an org carries no gate beyond the session", async () => {
    const { routes } = await collectRoutes();

    const create = routes.find((r) => r.method === "POST" && r.url === "/");
    expect(create.opts.preHandler).toBeUndefined();
    expect(create.opts.schema.body).toBeDefined();
  });

  test("the org detail writers carry no role requirement", async () => {
    const { routes } = await collectRoutes();

    for (const url of ["/update-logo", "/update-details", "/completeorgdetails"]) {
      const r = routes.find((x) => x.url === url);
      expect(r.opts?.preHandler).toBeUndefined();
    }
  });

  test("the business hour routes carry no role requirement either", async () => {
    const { routes } = await collectRoutes();

    const bh = routes.filter((r) => r.url.startsWith("/business-hours"));
    expect(bh).toHaveLength(5);
    for (const r of bh) {
      expect(r.opts?.preHandler).toBeUndefined();
    }
  });
});

// ===========================================================================
// updateMemberPermissionsHandler — fine-tuning on top of the role
// ===========================================================================

describe("updateMemberPermissionsHandler", () => {
  const req = (over: Record<string, unknown> = {}) =>
    ({
      params: { id: MEMBER },
      body: { grants: ["billing.read"], denies: ["campaigns.send"] },
      user: { orgId: OWN_ORG, userId: "caller" },
      actor: { permissions: ROLE_PERMISSIONS.ADMIN },
      ...over,
    }) as never;

  test("the route needs members.manage_roles and validates its body", async () => {
    const { routes } = await collectRoutes();
    const route = routes.find((r) => r.method === "PUT" && r.url === "/members/:id/permissions");
    expect(route.handler).toBe(updateMemberPermissionsHandler);
    expect(route.opts.config.permission).toBe("members.manage_roles");
    expect(route.opts.schema.body).toBeDefined();
  });

  test("hands the deltas to the service for the caller's org", async () => {
    svc.setMemberPermissionOverrides.mockResolvedValueOnce({
      grants: ["billing.read"],
      denies: ["campaigns.send"],
    });
    const rep = reply();

    await updateMemberPermissionsHandler(req(), rep);

    expect(svc.setMemberPermissionOverrides).toHaveBeenCalledWith(
      OWN_ORG,
      MEMBER,
      ["billing.read"],
      ["campaigns.send"],
    );
    expect(answer(rep).code).toBe(200);
  });

  test("refuses to change the caller's own permissions", async () => {
    const rep = reply();

    await updateMemberPermissionsHandler(req({ params: { id: "caller" } }), rep);

    expect(answer(rep).code).toBe(403);
    expect(svc.setMemberPermissionOverrides).not.toHaveBeenCalled();
  });

  test("refuses a grant the caller does not hold", async () => {
    const rep = reply();

    await updateMemberPermissionsHandler(
      req({
        actor: { permissions: ROLE_PERMISSIONS.MANAGER },
        body: { grants: ["billing.manage"], denies: [] },
      }),
      rep,
    );

    expect(answer(rep).code).toBe(403);
    expect(answer(rep).body).toMatchObject({ permission: "members.manage_roles" });
    expect(svc.setMemberPermissionOverrides).not.toHaveBeenCalled();
  });

  test("relays the service's owner protection as a 403", async () => {
    svc.setMemberPermissionOverrides.mockRejectedValueOnce(
      new ForbiddenError("The organisation owner cannot be given custom permissions.", {
        reason: "permission",
        permission: "org.transfer_ownership",
      }),
    );
    const rep = reply();

    await updateMemberPermissionsHandler(req(), rep);

    expect(answer(rep).code).toBe(403);
  });
});

describe("memberActivityHandler", () => {
  test("the route needs org.audit.read and validates its query", async () => {
    const { routes } = await collectRoutes();
    const route = routes.find((r) => r.method === "GET" && r.url === "/members/:id/activity");
    expect(route.handler).toBe(memberActivityHandler);
    expect(route.opts.config.permission).toBe("org.audit.read");
    expect(route.opts.schema.querystring).toBeDefined();
  });

  test("reads the member's trail inside the caller's org", async () => {
    svc.getMemberActivity.mockResolvedValueOnce({ items: [], total: 0, page: 2, limit: 25 });
    const rep = reply();

    await memberActivityHandler(
      { params: { id: MEMBER }, query: { page: 2, limit: 25 }, user: { orgId: OWN_ORG } } as never,
      rep,
    );

    expect(svc.getMemberActivity).toHaveBeenCalledWith(OWN_ORG, MEMBER, 2, 25);
    expect(answer(rep)).toEqual({ code: 200, body: { items: [], total: 0, page: 2, limit: 25 } });
  });

  test("a member of another org answers 403, not 500", async () => {
    svc.getMemberActivity.mockRejectedValueOnce(
      new ForbiddenError("That user is not a member of your organisation.", { reason: "scope" }),
    );
    const rep = reply();

    await memberActivityHandler(
      {
        params: { id: "stranger" },
        query: { page: 1, limit: 25 },
        user: { orgId: OWN_ORG },
      } as never,
      rep,
    );

    expect(answer(rep).code).toBe(403);
  });
});
