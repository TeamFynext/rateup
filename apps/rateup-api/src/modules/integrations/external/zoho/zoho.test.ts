import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock("../../integrations.service.js", () => ({
  createIntegration: vi.fn(),
  getIntegrationByName: vi.fn(),
  updateIntegrationByName: vi.fn(),
}));

vi.mock("./zoho.service.js", async () => {
  const actual = await vi.importActual<any>("./zoho.service.js").catch(() => ({}));
  return {
    ZohoTriggers: (actual as any).ZohoTriggers ?? {},
    fetchZohoContacts: vi.fn(),
    fetchZohoLeads: vi.fn(),
    fetchZohoPipelineMeta: vi.fn(),
    fetchZohoUsers: vi.fn(),
    getIntegrationByZohoChannelId: vi.fn(),
    getValidZohoAccessToken: vi.fn(),
    syncContactFromZohoRecord: vi.fn(),
    syncZohoContacts: vi.fn(),
    syncZohoLeads: vi.fn(),
  };
});

vi.mock("./zoho.client.js", () => ({
  getZohoRecordById: vi.fn(),
  registerZohoWebhook: vi.fn(),
  unsubscribeZohoWebhook: vi.fn(),
}));

vi.mock("axios", () => ({ default: { post: vi.fn(), get: vi.fn() } }));

vi.mock("../../../../utils/checkSession.js", () => ({ checkSession: vi.fn() }));
vi.mock("../../../../utils/redisConnection.js", () => ({
  integrationTriggerQueue: { add: vi.fn() },
}));

import axios from "axios";
import { integrationTriggerQueue } from "../../../../utils/redisConnection.js";
import { checkSession } from "../../../../utils/checkSession.js";
import { getIntegrationByName } from "../../integrations.service.js";
import { getIntegrationByZohoChannelId, getValidZohoAccessToken } from "./zoho.service.js";
import { getZohoRecordById, unsubscribeZohoWebhook } from "./zoho.client.js";
import { disconnectZohoIntegrationHandler, handleZohoWebhook } from "./zoho.controller.js";
import { zohoRoutes } from "./zoho.route.js";
import {
  addZohoContactToQueue,
  buildZohoContactPayload,
  buildZohoLeadPayload,
  formatZohoDateTime,
  isZohoTriggerEnabled,
} from "./zoho.utils.js";

type Mock = ReturnType<typeof vi.fn>;

const ORG = "11111111-1111-1111-1111-111111111111";
const VICTIM_ORG = "22222222-2222-2222-2222-222222222222";

function reply() {
  const rep: any = { code: vi.fn(() => rep), send: vi.fn(() => rep) };
  return rep;
}

function answer(rep: any) {
  return { code: rep.code.mock.calls[0]?.[0], body: rep.send.mock.calls[0]?.[0] };
}

beforeEach(() => {
  vi.clearAllMocks();
  (getIntegrationByName as unknown as Mock).mockResolvedValue(null);
  (getIntegrationByZohoChannelId as unknown as Mock).mockResolvedValue(null);
  (getValidZohoAccessToken as unknown as Mock).mockResolvedValue("zoho-access-token");
  (getZohoRecordById as unknown as Mock).mockResolvedValue({ data: [{ id: "z-1" }] });
  (unsubscribeZohoWebhook as unknown as Mock).mockResolvedValue(undefined);
  (axios.post as unknown as Mock).mockResolvedValue({ status: 200 });
  (integrationTriggerQueue.add as unknown as Mock).mockResolvedValue({ id: "job-1" });
});

// ===========================================================================
// Route registration
// ===========================================================================

describe("zohoRoutes", () => {
  function server() {
    const routes: any[] = [];
    const hooks: any[] = [];
    const srv: any = {
      addHook: vi.fn((name, fn) => hooks.push({ name, fn })),
      get: vi.fn((url, opts, handler) => routes.push({ method: "GET", url, opts, handler })),
      post: vi.fn((url, opts, handler) => routes.push({ method: "POST", url, opts, handler })),
    };
    return { srv, routes, hooks };
  }

  test("guards every operator route with checkSession", async () => {
    const { srv, routes } = server();

    await zohoRoutes(srv);

    const guarded = routes.filter((r) => r.opts?.preHandler === checkSession);
    expect(guarded.map((r) => r.url)).toEqual([
      "/auth",
      "/contacts",
      "/contacts/sync",
      "/leads",
      "/users",
      "/pipelines",
      "/leads/sync",
      "/unsubscribe/:orgId",
    ]);
  });

  // The webhook is the only open route now, and it verifies a per-org shared secret.
  test("leaves only the webhook unguarded", async () => {
    const { srv, routes } = server();

    await zohoRoutes(srv);

    const open = routes.filter((r) => !r.opts?.preHandler);
    expect(open.map((r) => `${r.method} ${r.url}`)).toEqual(["POST /webhooks/:product"]);
  });
});

// ===========================================================================
// disconnectZohoIntegrationHandler
// ===========================================================================

describe("disconnectZohoIntegrationHandler", () => {
  const credential = {
    access_token: "zoho-access",
    refresh_token: "zoho-refresh",
    api_domain: "https://www.zohoapis.in",
    crmWebhook: { channelId: "chan-crm" },
    biginWebhook: { channelId: "chan-bigin" },
  };

  test("acts on the caller's own org, not the one the path names", async () => {
    (getIntegrationByName as unknown as Mock).mockResolvedValueOnce({ credential });
    const rep = reply();

    await disconnectZohoIntegrationHandler(
      { params: { orgId: VICTIM_ORG }, user: { orgId: ORG } } as never,
      rep,
    );

    expect(getIntegrationByName).toHaveBeenCalledWith(ORG, "zoho");
    expect(getIntegrationByName).not.toHaveBeenCalledWith(VICTIM_ORG, "zoho");
    expect(answer(rep).code).toBe(200);
  });

  test("unsubscribes both webhooks and revokes the refresh token", async () => {
    (getIntegrationByName as unknown as Mock).mockResolvedValueOnce({ credential });

    await disconnectZohoIntegrationHandler(
      { params: { orgId: VICTIM_ORG }, user: { orgId: ORG } } as never,
      reply(),
    );

    expect(unsubscribeZohoWebhook).toHaveBeenCalledTimes(2);
    expect(axios.post).toHaveBeenCalledWith(
      "https://accounts.zoho.in/oauth/v2/token/revoke",
      null,
      { params: { token: "zoho-refresh" } },
    );
  });

  // NOTE: revoking is irreversible from this side — the org has to walk the
  // whole OAuth consent flow again to restore the sync.
  test("reports success even when every step of the teardown failed", async () => {
    (getIntegrationByName as unknown as Mock).mockResolvedValueOnce({ credential });
    (unsubscribeZohoWebhook as unknown as Mock).mockRejectedValue(new Error("zoho down"));
    (axios.post as unknown as Mock).mockRejectedValueOnce(new Error("revoke failed"));
    const rep = reply();

    await disconnectZohoIntegrationHandler(
      { params: { orgId: VICTIM_ORG }, user: { orgId: ORG } } as never,
      rep,
    );

    expect(answer(rep)).toEqual({
      code: 200,
      body: { success: true, message: "Zoho disconnected successfully" },
    });
  });

  test("leaves the integration row in place", async () => {
    (getIntegrationByName as unknown as Mock).mockResolvedValueOnce({ credential });

    await disconnectZohoIntegrationHandler(
      { params: { orgId: VICTIM_ORG }, user: { orgId: ORG } } as never,
      reply(),
    );

    // Nothing deletes or deactivates the row; only the remote side is torn down.
    const svc = await import("../../integrations.service.js");
    expect(svc.updateIntegrationByName).not.toHaveBeenCalled();
  });

  test("404s an org with no zoho integration", async () => {
    const rep = reply();

    await disconnectZohoIntegrationHandler(
      { params: { orgId: VICTIM_ORG }, user: { orgId: ORG } } as never,
      rep,
    );

    expect(answer(rep).code).toBe(404);
  });
});

// ===========================================================================
// handleZohoWebhook
// ===========================================================================

describe("handleZohoWebhook", () => {
  const integration = {
    orgId: ORG,
    credential: {
      zohoWebhookSecret: "shared-secret",
      access_token: "zoho-access",
      api_domain: "https://www.zohoapis.in",
    },
  };

  const payload = (over: any = {}) => ({
    channel_id: "chan-1",
    token: "shared-secret",
    ids: ["z-1"],
    module: "Contacts",
    ...over,
  });

  // NOTE: this is the one webhook in the module that authenticates its caller.
  test("rejects a payload whose token does not match the stored secret", async () => {
    (getIntegrationByZohoChannelId as unknown as Mock).mockResolvedValueOnce(integration);
    const rep = reply();

    await handleZohoWebhook(
      { params: { product: "crm" }, body: payload({ token: "guessed" }) } as never,
      rep,
    );

    expect(answer(rep).code).toBe(401);
    expect(getZohoRecordById).not.toHaveBeenCalled();
  });

  test("accepts a payload whose token matches", async () => {
    (getIntegrationByZohoChannelId as unknown as Mock).mockResolvedValueOnce(integration);
    const rep = reply();

    await handleZohoWebhook({ params: { product: "crm" }, body: payload() } as never, rep);

    expect(answer(rep)).toEqual({ code: 200, body: { success: true } });
    expect(getZohoRecordById).toHaveBeenCalledOnce();
  });

  // NOTE: a plain !== on two strings — not a constant-time compare. The secret
  // is a random id rather than a signature over the body, so a replayed
  // payload with a captured token is accepted.
  test("compares the secret with a plain inequality", async () => {
    (getIntegrationByZohoChannelId as unknown as Mock).mockResolvedValueOnce({
      ...integration,
      credential: { ...integration.credential, zohoWebhookSecret: undefined },
    });
    const rep = reply();

    await handleZohoWebhook(
      { params: { product: "crm" }, body: payload({ token: "anything" }) } as never,
      rep,
    );

    expect(answer(rep).code).toBe(401);
  });

  test("400s a payload missing any of the three required fields", async () => {
    for (const missing of ["channel_id", "token", "ids"]) {
      const body = payload();
      delete (body as any)[missing];
      const rep = reply();

      await handleZohoWebhook({ params: { product: "crm" }, body } as never, rep);

      expect(answer(rep).code).toBe(400);
    }
  });

  test("404s a channel it does not recognise", async () => {
    const rep = reply();

    await handleZohoWebhook({ params: { product: "crm" }, body: payload() } as never, rep);

    expect(answer(rep).code).toBe(404);
  });

  // NOTE: only Leads, Contacts and Deals are handled; anything else is logged
  // and answered 200, so Zoho stops retrying an event nothing consumed.
  test("acknowledges an unhandled module as a success", async () => {
    (getIntegrationByZohoChannelId as unknown as Mock).mockResolvedValueOnce(integration);
    const rep = reply();

    await handleZohoWebhook(
      { params: { product: "crm" }, body: payload({ module: "Accounts" }) } as never,
      rep,
    );

    expect(answer(rep)).toEqual({ code: 200, body: { success: true } });
    expect(getZohoRecordById).not.toHaveBeenCalled();
  });

  test("acknowledges an unknown product as a success too", async () => {
    (getIntegrationByZohoChannelId as unknown as Mock).mockResolvedValueOnce(integration);
    const rep = reply();

    await handleZohoWebhook({ params: { product: "desk" }, body: payload() } as never, rep);

    expect(answer(rep).code).toBe(200);
    expect(getZohoRecordById).not.toHaveBeenCalled();
  });

  test("only the first record id of a batch is processed", async () => {
    (getIntegrationByZohoChannelId as unknown as Mock).mockResolvedValueOnce(integration);

    await handleZohoWebhook(
      { params: { product: "crm" }, body: payload({ ids: ["z-1", "z-2", "z-3"] }) } as never,
      reply(),
    );

    expect(getZohoRecordById).toHaveBeenCalledOnce();
    expect((getZohoRecordById as unknown as Mock).mock.calls[0][2]).toBe("z-1");
  });
});

// ===========================================================================
// zoho.utils
// ===========================================================================

describe("the zoho payload builders", () => {
  test("splits a two-part name into first and last", () => {
    expect(buildZohoContactPayload({ name: "Ann Smith" })).toMatchObject({
      First_Name: "Ann",
      Last_Name: "Smith",
    });
  });

  test("keeps everything after the first word as the surname", () => {
    expect(buildZohoLeadPayload({ name: "Ann van der Berg" })).toMatchObject({
      First_Name: "Ann",
      Last_Name: "van der Berg",
    });
  });

  test("puts a single-word name in the required last-name field", () => {
    expect(buildZohoContactPayload({ name: "Cher" })).toMatchObject({
      First_Name: "",
      Last_Name: "Cher",
    });
  });

  test("falls back to Unknown for a missing name", () => {
    expect(buildZohoContactPayload({})).toMatchObject({ First_Name: "", Last_Name: "Unknown" });
  });

  test("collapses runs of whitespace", () => {
    expect(buildZohoContactPayload({ name: "  Ann   Smith  " })).toMatchObject({
      First_Name: "Ann",
      Last_Name: "Smith",
    });
  });

  test("defaults an absent contact method to an empty string", () => {
    expect(buildZohoContactPayload({ name: "Ann" })).toMatchObject({ Email: "", Phone: "" });
  });

  test("the lead payload carries a status, the contact payload does not", () => {
    expect(buildZohoLeadPayload({ name: "Ann" }).Lead_Status).toBe("New");
    expect(buildZohoContactPayload({ name: "Ann" })).not.toHaveProperty("Lead_Status");
  });

  // NOTE: source, psid and igsId are interpolated into a free-text Description
  // rather than mapped to fields, so they are unsearchable in Zoho.
  test("packs the identifiers into a free-text description", () => {
    const payload = buildZohoContactPayload({
      name: "Ann",
      source: "web",
      psid: "p1",
      igsId: "i1",
    });

    expect(payload.Description).toContain("Source: web");
    expect(payload.Description).toContain("PSID: p1");
    expect(payload.Description).toContain("IGSID: i1");
  });
});

describe("addZohoContactToQueue", () => {
  // NOTE: one contact create enqueues two jobs unconditionally — the Bigin one
  // runs even for orgs that only connected CRM.
  test("enqueues both a CRM and a Bigin job for every contact", async () => {
    await addZohoContactToQueue({ id: "c-1", name: "Ann" }, ORG);

    expect(integrationTriggerQueue.add).toHaveBeenCalledTimes(2);
    expect((integrationTriggerQueue.add as unknown as Mock).mock.calls.map((c) => c[0])).toEqual([
      "zoho-contact-create",
      "zoho-bigin-contact-create",
    ]);
  });

  test("both jobs carry the org and the originating contact id", async () => {
    await addZohoContactToQueue({ id: "c-1", name: "Ann" }, ORG);

    for (const [, job] of (integrationTriggerQueue.add as unknown as Mock).mock.calls) {
      expect(job.orgId).toBe(ORG);
      expect(job.rateupContactId).toBe("c-1");
    }
  });
});

describe("formatZohoDateTime", () => {
  test("renders the local wall-clock time with its offset", () => {
    const out = formatZohoDateTime(new Date(2026, 6, 29, 9, 5, 3));

    expect(out).toMatch(/^2026-07-29T09:05:03[+-]\d{2}:\d{2}$/);
  });

  test("zero-pads every component", () => {
    const out = formatZohoDateTime(new Date(2026, 0, 2, 3, 4, 5));

    expect(out.startsWith("2026-01-02T03:04:05")).toBe(true);
  });
});

describe("isZohoTriggerEnabled", () => {
  const credential = {
    triggerSubscriptions: [
      { subscribed_field: "contact_create", active: true },
      { subscribed_field: "contact_update", active: false },
    ],
  };

  test("is true only for an active subscription", () => {
    expect(isZohoTriggerEnabled(credential, "contact_create")).toBe(true);
    expect(isZohoTriggerEnabled(credential, "contact_update")).toBe(false);
    expect(isZohoTriggerEnabled(credential, "contact_delete")).toBe(false);
  });

  test("treats a credential with no subscriptions as disabled", () => {
    expect(isZohoTriggerEnabled({}, "contact_create")).toBe(false);
    expect(isZohoTriggerEnabled(null, "contact_create")).toBe(false);
  });

  // NOTE: active is compared with ===, so a truthy non-boolean does not count.
  test("requires active to be exactly true", () => {
    expect(
      isZohoTriggerEnabled(
        // A truthy non-boolean, cast in deliberately — the point of the test.
        { triggerSubscriptions: [{ subscribed_field: "x", active: "true" as unknown as boolean }] },
        "x",
      ),
    ).toBe(false);
  });
});
