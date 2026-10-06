import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock("./zoho.import.js", () => ({
  fetchZohoContacts: vi.fn(),
  fetchZohoLeads: vi.fn(),
  syncZohoContacts: vi.fn(),
  syncZohoLeads: vi.fn(),
}));

vi.mock("./zoho.meta.js", () => ({
  fetchZohoPipelineMeta: vi.fn(),
  fetchZohoUsers: vi.fn(),
}));

vi.mock("./zoho.inbound.js", () => ({
  findIntegrationByZohoChannel: vi.fn(),
  handleZohoInbound: vi.fn(),
}));

// The real receiver pulls in the whole provider registry; the alias only needs
// to recognise a rejection.
vi.mock("../../shared/inboundWebhookContract.js", () => ({
  InboundWebhookRejected: class InboundWebhookRejected extends Error {},
}));

vi.mock("../../../../utils/checkSession.js", () => ({ checkSession: vi.fn() }));
vi.mock("../../../../workers/bullmq/queues/index.js", () => ({
  integrationTriggerQueue: { add: vi.fn() },
}));

import { integrationTriggerQueue } from "../../../../workers/bullmq/queues/index.js";
import { checkSession } from "../../../../utils/checkSession.js";
import { InboundWebhookRejected } from "../../shared/inboundWebhookContract.js";
import { fetchZohoContacts, fetchZohoLeads } from "./zoho.import.js";
import { findIntegrationByZohoChannel, handleZohoInbound } from "./zoho.inbound.js";
import { fetchZohoUsers } from "./zoho.meta.js";
import {
  getZohoContactsHandler,
  getZohoLeadsHandler,
  getZohoUsersHandler,
  handleZohoWebhook,
} from "./zoho.controller.js";
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
  (findIntegrationByZohoChannel as unknown as Mock).mockResolvedValue(null);
  (handleZohoInbound as unknown as Mock).mockResolvedValue(undefined);
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

  // Connecting and disconnecting moved to the shared integration routes; what
  // is left are the settings page's reads and syncs.
  test("guards every operator route with checkSession", async () => {
    const { srv, routes } = server();

    await zohoRoutes(srv);

    const guarded = routes.filter((r) => r.opts?.preHandler === checkSession);
    expect(guarded.map((r) => r.url)).toEqual([
      "/contacts",
      "/contacts/sync",
      "/leads",
      "/users",
      "/pipelines",
      "/leads/sync",
    ]);
  });

  test("leaves only the old webhook address unguarded", async () => {
    const { srv, routes } = server();

    await zohoRoutes(srv);

    const open = routes.filter((r) => !r.opts?.preHandler);
    expect(open.map((r) => `${r.method} ${r.url}`)).toEqual(["POST /webhooks/:product"]);
  });
});

// These took `orgId` from the query string, so any logged-in user could name
// someone else's org and read that org's CRM data through its stored
// credentials.
describe("zoho handlers read the org from the session, not the query", () => {
  test("contacts", async () => {
    (fetchZohoContacts as unknown as Mock).mockResolvedValueOnce([]);

    await getZohoContactsHandler(
      { query: { orgId: VICTIM_ORG }, user: { orgId: ORG } } as never,
      reply(),
    );

    expect(fetchZohoContacts).toHaveBeenCalledWith(ORG, "crm");
    expect(fetchZohoContacts).not.toHaveBeenCalledWith(VICTIM_ORG, expect.anything());
  });

  test("leads", async () => {
    (fetchZohoLeads as unknown as Mock).mockResolvedValueOnce([]);

    await getZohoLeadsHandler(
      { query: { orgId: VICTIM_ORG }, user: { orgId: ORG } } as never,
      reply(),
    );

    expect(fetchZohoLeads).toHaveBeenCalledWith(ORG);
  });

  test("users", async () => {
    (fetchZohoUsers as unknown as Mock).mockResolvedValueOnce([]);

    await getZohoUsersHandler(
      { query: { orgId: VICTIM_ORG }, user: { orgId: ORG } } as never,
      reply(),
    );

    expect(fetchZohoUsers).toHaveBeenCalledWith(ORG);
  });
});

// ===========================================================================
// handleZohoWebhook — the pre-move address
// ===========================================================================

describe("handleZohoWebhook", () => {
  const integration = { id: "int-1", orgId: ORG, credential: {} };
  const body = { channel_id: "chan-1", token: "shared-secret", ids: ["z-1"], module: "Contacts" };

  test("404s a channel it does not recognise", async () => {
    const rep = reply();

    await handleZohoWebhook({ params: { product: "crm" }, body } as never, rep);

    expect(findIntegrationByZohoChannel).toHaveBeenCalledWith("chan-1");
    expect(answer(rep).code).toBe(404);
    expect(handleZohoInbound).not.toHaveBeenCalled();
  });

  test("404s a delivery with no channel id", async () => {
    const rep = reply();

    await handleZohoWebhook({ params: { product: "crm" }, body: {} } as never, rep);

    expect(answer(rep).code).toBe(404);
    expect(findIntegrationByZohoChannel).not.toHaveBeenCalled();
  });

  test("hands a known channel's delivery to the provider's inbound handler", async () => {
    (findIntegrationByZohoChannel as unknown as Mock).mockResolvedValueOnce(integration);
    const request = { params: { product: "crm" }, body };
    const rep = reply();

    await handleZohoWebhook(request as never, rep);

    expect(handleZohoInbound).toHaveBeenCalledWith(integration, request);
    expect(answer(rep)).toEqual({ code: 200, body: { success: true } });
  });

  test("answers 401 when the inbound handler rejects the token", async () => {
    (findIntegrationByZohoChannel as unknown as Mock).mockResolvedValueOnce(integration);
    (handleZohoInbound as unknown as Mock).mockRejectedValueOnce(
      new InboundWebhookRejected("token mismatch"),
    );
    const rep = reply();

    await handleZohoWebhook({ params: { product: "crm" }, body } as never, rep);

    expect(answer(rep).code).toBe(401);
  });

  test("answers 500 on anything else, so Zoho retries", async () => {
    (findIntegrationByZohoChannel as unknown as Mock).mockResolvedValueOnce(integration);
    (handleZohoInbound as unknown as Mock).mockRejectedValueOnce(new Error("redis down"));
    const rep = reply();

    await handleZohoWebhook({ params: { product: "crm" }, body } as never, rep);

    expect(answer(rep).code).toBe(500);
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
