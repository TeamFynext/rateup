import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock("./integrations.service.js", () => ({
  createIntegration: vi.fn(),
  createWaPaymentConfigurations: vi.fn(),
  deleteIntegrationByName: vi.fn(),
  deleteWaPaymentConfiguration: vi.fn(),
  deleteZapierTriggerHooks: vi.fn(),
  getAllIntegrations: vi.fn(),
  getAllIntegrationsByOrgId: vi.fn(),
  getGoogleAuthUrl: vi.fn(),
  getIntegrationByName: vi.fn(),
  getIntegrationByPetPoojaRestaurantId: vi.fn(),
  getRegenerateWaPaymentConfigOauth: vi.fn(),
  getWaPaymentConfigByName: vi.fn(),
  getWaPaymentConfigurations: vi.fn(),
  initializeAuthClient: vi.fn(),
  removeSurveySpreadSheetSheetId: vi.fn(),
  updateIntegrationByName: vi.fn(),
}));

vi.mock("../../utils/checkSession.js", () => ({ checkSession: vi.fn() }));
vi.mock("../../utils/checkRoleHandler.js", () => ({
  checkRoleHandler: vi.fn((roles) => Object.assign(vi.fn(), { roles })),
}));
vi.mock("./shopify/shopify.route.js", () => ({ shopifyRoutes: vi.fn() }));

import { log } from "../../utils/logger.js";
import { checkSession } from "../../utils/checkSession.js";
import * as service from "./integrations.service.js";
import {
  createGoogleSheetAuthToken,
  createIntegrationHandler,
  createWaPaymentConfigurationsHandler,
  deleteIntegrationByNameHandler,
  deleteZapierTriggerHookHandler,
  getAllIntegrationsByOrgHandler,
  getIntegrationStatusesHandler,
  petPoojaWebhookHandler,
  updateIntegrationByNameHandler,
} from "./integrations.controller.js";
import { integrationsRoutes } from "./integrations.route.js";
import { integrationPublicRoutes } from "./integration.public.route.js";

type Mock = ReturnType<typeof vi.fn>;

const svc = service as unknown as Record<string, Mock>;

const ORG = "11111111-1111-1111-1111-111111111111";
const OTHER_ORG = "22222222-2222-2222-2222-222222222222";

function reply() {
  const rep: any = { code: vi.fn(() => rep), send: vi.fn(() => rep) };
  return rep;
}

function answer(rep: any) {
  return { code: rep.code.mock.calls[0]?.[0], body: rep.send.mock.calls[0]?.[0] };
}

beforeEach(() => {
  vi.clearAllMocks();
  svc.getAllIntegrations.mockResolvedValue([]);
  svc.getAllIntegrationsByOrgId.mockResolvedValue([]);
  svc.createIntegration.mockResolvedValue({ id: "int-1" });
  svc.updateIntegrationByName.mockResolvedValue({ id: "int-1" });
  svc.deleteIntegrationByName.mockResolvedValue({ id: "int-1" });
  svc.removeSurveySpreadSheetSheetId.mockResolvedValue(undefined);
  svc.deleteZapierTriggerHooks.mockResolvedValue(undefined);
  svc.getIntegrationByPetPoojaRestaurantId.mockResolvedValue(null);
  svc.createWaPaymentConfigurations.mockResolvedValue(true);
  svc.initializeAuthClient.mockResolvedValue({
    getToken: vi.fn(async () => ({
      tokens: {
        access_token: "ya29.token",
        refresh_token: "1//refresh",
        expiry_date: 1_800_000,
        scope:
          "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email",
      },
    })),
    getTokenInfo: vi.fn(async () => ({ email: "owner@example.test" })),
  });
});

// ===========================================================================
// GET /all — the cross-org listing
// ===========================================================================

describe("the integration listings", () => {
  // getAllIntegrationsHandler used to live here, behind GET /all: it consulted no
  // org at all and answered every organisation's integration row — credential
  // column unredacted — to any authenticated user of any org. Handler, route and
  // service function are all gone. See issues.txt 26.2.
  test("the module exports no cross-org listing handler", async () => {
    const controller = await import("./integrations.controller.js");

    expect(controller).not.toHaveProperty("getAllIntegrationsHandler");
  });

  test("the org-scoped listing does use the session org", async () => {
    await getAllIntegrationsByOrgHandler({ user: { orgId: ORG } } as never, reply());

    expect(svc.getAllIntegrationsByOrgId).toHaveBeenCalledWith(ORG);
  });

  test("the statuses view only reports connectedness, not credentials", async () => {
    svc.getAllIntegrationsByOrgId.mockResolvedValueOnce([
      { name: "zapier", credential: { accessToken: "hash" } },
    ]);
    const rep = reply();

    await getIntegrationStatusesHandler({ user: { orgId: ORG } } as never, rep);

    const body = answer(rep).body;
    expect(body.every((s: any) => Object.keys(s).join() === "name,isConnected")).toBe(true);
    expect(body.find((s: any) => s.name === "zapier").isConnected).toBe(true);
  });
});

// ===========================================================================
// createIntegrationHandler / updateIntegrationByNameHandler
// ===========================================================================

describe("the write handlers", () => {
  test("create passes the body and the session org", async () => {
    const body = { name: "amelia", credential: { apiKey: "k" } };

    await createIntegrationHandler({ user: { orgId: ORG }, body } as never, reply());

    expect(svc.createIntegration).toHaveBeenCalledWith(body, ORG);
  });

  // NOTE: the OAuth route beside it carries checkRoleHandler(["SUPER_ADMIN",
  // "ADMIN"]). This one carries nothing, and it can write the same
  // "googlesheet" credential shape.
  test("create takes no role into account", async () => {
    const req: any = {
      user: { orgId: ORG, role: "MEMBER" },
      body: { name: "googlesheet", credential: {} },
    };

    await createIntegrationHandler(req, reply());

    expect(svc.createIntegration).toHaveBeenCalledOnce();
  });

  test("update forwards the whole body to the service", async () => {
    const body = { credential: { a: 1 }, orgId: OTHER_ORG, active: false };

    await updateIntegrationByNameHandler(
      { user: { orgId: ORG }, params: { name: "googlesheet" }, body } as never,
      reply(),
    );

    expect(svc.updateIntegrationByName).toHaveBeenCalledWith(ORG, "googlesheet", body);
  });

  test("delete clears the survey spreadsheet ids only for googlesheet", async () => {
    await deleteIntegrationByNameHandler(
      { user: { orgId: ORG }, params: { name: "googlesheet" } } as never,
      reply(),
    );
    expect(svc.removeSurveySpreadSheetSheetId).toHaveBeenCalledWith(ORG);

    vi.clearAllMocks();
    svc.deleteIntegrationByName.mockResolvedValue({ id: "int-1" });

    await deleteIntegrationByNameHandler(
      { user: { orgId: ORG }, params: { name: "zapier" } } as never,
      reply(),
    );
    expect(svc.removeSurveySpreadSheetSheetId).not.toHaveBeenCalled();
  });

  // The success body used to be `!data`, i.e. the boolean `false`, which a client
  // cannot tell from a failure flag. See issues.txt 26.16.
  test("a successful payment-config create answers 201 with a message", async () => {
    const rep = reply();

    await createWaPaymentConfigurationsHandler({ user: { orgId: ORG }, body: {} } as never, rep);

    expect(answer(rep)).toEqual({ code: 201, body: { message: "Payment configuration created" } });
  });

  test("a refused payment-config create answers 400 with a message", async () => {
    svc.createWaPaymentConfigurations.mockResolvedValueOnce(false);
    const rep = reply();

    await createWaPaymentConfigurationsHandler({ user: { orgId: ORG }, body: {} } as never, rep);

    expect(answer(rep)).toEqual({
      code: 400,
      body: { message: "Error in creating whatsapp payment" },
    });
  });
});

// ===========================================================================
// createGoogleSheetAuthToken
// ===========================================================================

describe("createGoogleSheetAuthToken", () => {
  test("stores the exchanged tokens against the caller's org", async () => {
    const rep = reply();

    await createGoogleSheetAuthToken(
      { user: { orgId: ORG }, body: { code: "auth-code" } } as never,
      rep,
    );

    const [data, orgId] = svc.createIntegration.mock.calls[0];
    expect(orgId).toBe(ORG);
    expect(data.name).toBe("googlesheet");
    expect(data.credential.refreshToken).toBe("1//refresh");
    expect(answer(rep).code).toBe(201);
  });

  // Google returns the granted scopes SPACE-delimited; splitting on a comma stored
  // one element holding the entire string, so any later scope check matched nothing.
  // See issues.txt 26.15.
  test("splits the granted scopes on a space", async () => {
    await createGoogleSheetAuthToken(
      { user: { orgId: ORG }, body: { code: "auth-code" } } as never,
      reply(),
    );

    const scopes = svc.createIntegration.mock.calls[0][0].credential.scopes;
    expect(scopes.length).toBeGreaterThan(1);
    expect(scopes.every((scope: string) => !scope.includes(" "))).toBe(true);
  });

  test("stores the refresh token in the clear", async () => {
    await createGoogleSheetAuthToken(
      { user: { orgId: ORG }, body: { code: "auth-code" } } as never,
      reply(),
    );

    expect(svc.createIntegration.mock.calls[0][0].credential).toMatchObject({
      accessToken: "ya29.token",
      refreshToken: "1//refresh",
    });
  });

  test("answers a bare 500 when the exchange fails", async () => {
    svc.initializeAuthClient.mockResolvedValueOnce({
      getToken: vi.fn(async () => {
        throw new Error("invalid_grant");
      }),
      getTokenInfo: vi.fn(),
    });
    const rep = reply();

    await createGoogleSheetAuthToken({ user: { orgId: ORG }, body: { code: "bad" } } as never, rep);

    expect(answer(rep)).toEqual({ code: 500, body: undefined });
  });
});

// ===========================================================================
// petPoojaWebhookHandler
// ===========================================================================

describe("petPoojaWebhookHandler", () => {
  const body = () => ({
    properties: {
      Restaurant: { restID: "rest-1" },
      Customer: { phone: "9876543210", name: "Ann" },
    },
  });

  const integration = {
    id: "int-1",
    orgId: ORG,
    credential: { restaurantId: "rest-1", orderEvent: { waTemplateId: "t-1", teamId: "team-1" } },
  };

  test("answers 200 for a configured restaurant", async () => {
    svc.getIntegrationByPetPoojaRestaurantId.mockResolvedValueOnce(integration);
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const rep = reply();

    await petPoojaWebhookHandler({ body: body() } as never, rep);

    expect(answer(rep).code).toBe(200);
    spy.mockRestore();
  });

  // NOTE: the send is commented out at integrations.controller.ts:276, so a
  // configured order event acknowledges the webhook and does nothing. The cron
  // that drains scheduled sends reads a history no live path ever writes.
  test("sends no message and writes no history for a configured order event", async () => {
    svc.getIntegrationByPetPoojaRestaurantId.mockResolvedValueOnce(integration);
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    await petPoojaWebhookHandler({ body: body() } as never, reply());

    expect(svc.updateIntegrationByName).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  // NOTE: no signature, no shared secret, no allowlist. The restaurant id in
  // the body is the only thing selecting which org's integration is read.
  test("takes the restaurant id from the body with nothing to authenticate it", async () => {
    svc.getIntegrationByPetPoojaRestaurantId.mockResolvedValueOnce(integration);
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const req: any = { body: body(), headers: {} };

    await petPoojaWebhookHandler(req, reply());

    expect(svc.getIntegrationByPetPoojaRestaurantId).toHaveBeenCalledWith("rest-1");
    spy.mockRestore();
  });

  test("prints the whole webhook body, customer details included, to stdout", async () => {
    svc.getIntegrationByPetPoojaRestaurantId.mockResolvedValueOnce(integration);
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const b = body();

    await petPoojaWebhookHandler({ body: b } as never, reply());

    expect(spy).toHaveBeenCalledWith("request.body petpooja", b);
    spy.mockRestore();
  });

  test("403s an unusable phone number", async () => {
    svc.getIntegrationByPetPoojaRestaurantId.mockResolvedValueOnce(integration);
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const rep = reply();

    await petPoojaWebhookHandler(
      {
        body: { properties: { Restaurant: { restID: "rest-1" }, Customer: { phone: "12" } } },
      } as never,
      rep,
    );

    expect(answer(rep).code).toBe(403);
    spy.mockRestore();
  });

  // NOTE: parsePhoneNumber throws on input it cannot parse at all, rather than
  // returning something whose isValid() is false — so the 403 branch is only
  // reached for well-formed-but-invalid numbers.
  test("500s rather than 403s on a phone it cannot parse", async () => {
    svc.getIntegrationByPetPoojaRestaurantId.mockResolvedValueOnce(integration);
    const rep = reply();

    await petPoojaWebhookHandler(
      {
        body: { properties: { Restaurant: { restID: "r" }, Customer: { phone: "not a phone" } } },
      } as never,
      rep,
    );

    expect(answer(rep).code).toBe(500);
    expect(log.error).toHaveBeenCalled();
  });

  test("500s on a payload missing the expected envelope", async () => {
    const rep = reply();

    await petPoojaWebhookHandler({ body: {} } as never, rep);

    expect(answer(rep).code).toBe(500);
  });

  test("404s a restaurant with no integration", async () => {
    svc.getIntegrationByPetPoojaRestaurantId.mockResolvedValueOnce(null);
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const rep = reply();

    await petPoojaWebhookHandler({ body: body() } as never, rep);

    expect(answer(rep)).toEqual({ code: 404, body: "No Integration found" });
    spy.mockRestore();
  });

  // NOTE: the lookup and the phone parse both run before the 404, so an
  // unknown restaurant id still costs a database read.
  test("reads the database before deciding the restaurant is unknown", async () => {
    svc.getIntegrationByPetPoojaRestaurantId.mockResolvedValueOnce(null);
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    await petPoojaWebhookHandler({ body: body() } as never, reply());

    expect(svc.getIntegrationByPetPoojaRestaurantId).toHaveBeenCalledOnce();
    spy.mockRestore();
  });
});

// ===========================================================================
// deleteZapierTriggerHookHandler
// ===========================================================================

describe("deleteZapierTriggerHookHandler", () => {
  test("hands the unvalidated body straight to the service", async () => {
    const body = { hookUrl: "http://127.0.0.1:6379/", active: true };

    await deleteZapierTriggerHookHandler({ user: { orgId: ORG }, body } as never, reply());

    expect(svc.deleteZapierTriggerHooks).toHaveBeenCalledWith(body, ORG);
  });

  test("returns the bare error on failure", async () => {
    svc.deleteZapierTriggerHooks.mockRejectedValueOnce(new Error("ECONNREFUSED 127.0.0.1:6379"));
    const rep = reply();

    await deleteZapierTriggerHookHandler({ user: { orgId: ORG }, body: {} } as never, rep);

    expect(answer(rep).code).toBe(500);
  });
});

// ===========================================================================
// Route registration
// ===========================================================================

describe("route registration", () => {
  function server() {
    const routes: any[] = [];
    const hooks: any[] = [];
    const srv: any = {
      addHook: vi.fn((name, fn) => hooks.push({ name, fn })),
      register: vi.fn(),
      get: vi.fn((url, opts, handler) => routes.push({ method: "GET", url, opts, handler })),
      post: vi.fn((url, opts, handler) => routes.push({ method: "POST", url, opts, handler })),
      put: vi.fn((url, opts, handler) => routes.push({ method: "PUT", url, opts, handler })),
      delete: vi.fn((url, opts, handler) => routes.push({ method: "DELETE", url, opts, handler })),
    };
    return { srv, routes, hooks };
  }

  test("the authenticated tree adds checkSession once, for everything", async () => {
    const { srv, hooks } = server();

    await integrationsRoutes(srv);

    expect(hooks).toHaveLength(1);
    expect(hooks[0].name).toBe("preHandler");
    expect(hooks[0].fn).toBe(checkSession);
  });

  // The cross-org listing this tree used to expose. See issues.txt 26.2.
  test("no longer registers a cross-org listing route", async () => {
    const { srv, routes } = server();

    await integrationsRoutes(srv);

    expect(routes.find((r) => r.url === "/all")).toBeUndefined();
  });

  // The role check on the Google OAuth route was bypassable by construction: any
  // member could POST the same credential-bearing row through the generic create
  // route beside it. Every credential-writing route carries the gate now.
  // See issues.txt 26.17.
  test("role-gates every credential-writing route, not just the OAuth one", async () => {
    const { srv, routes } = server();

    await integrationsRoutes(srv);

    const gated = routes.filter((r) => r.opts?.preHandler);
    expect(gated.map((r) => r.url).sort()).toEqual(["/", "/:name", "/google/auth-token"]);
    for (const route of gated) {
      expect((route.opts.preHandler[0] as any).roles).toEqual(["SUPER_ADMIN", "ADMIN"]);
    }
  });

  // The body used to be cast `as any` by the handler and its hookUrl chose the
  // address the server called out to; every other route in the file declares a
  // schema. See issues.txt 26.6.
  test("the zapier-hook route declares a body schema", async () => {
    const { srv, routes } = server();

    await integrationsRoutes(srv);

    const hook = routes.find((r) => r.url === "/zapier-hook");
    expect(hook.method).toBe("DELETE");
    expect(hook.opts.schema.body).toBeDefined();
    expect(hook.handler).toBe(deleteZapierTriggerHookHandler);
  });

  test("the public tree registers the petpooja webhook with no hook or schema", async () => {
    const { srv, routes, hooks } = server();

    await integrationPublicRoutes(srv);

    expect(hooks).toHaveLength(0);
    const petpooja = routes.find((r) => r.url === "/petpooja");
    expect(petpooja.method).toBe("POST");
    // registered as post(url, handler) — the second argument is the handler.
    expect(petpooja.opts).toBe(petPoojaWebhookHandler);
  });
});
