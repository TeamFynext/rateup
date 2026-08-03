import { beforeEach, describe, expect, test, vi } from "vitest";

vi.hoisted(() => {
  process.env.wa_access_token_encryption_key = "00".repeat(32);
});

vi.mock("../../utils/prisma.js", () => ({
  default: {
    whatsappSettings: { findFirstOrThrow: vi.fn() },
    metaBusinessAgent: {
      findFirst: vi.fn(),
      findFirstOrThrow: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    metaAgentAllowlistEntry: {
      findFirstOrThrow: vi.fn(),
      findMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    metaAgentFaq: {
      findFirstOrThrow: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    metaAgentSkill: { findFirstOrThrow: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
    metaAgentConnector: {
      findFirstOrThrow: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      update: vi.fn(),
    },
    metaAgentConnectorTool: { findFirstOrThrow: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock("axios", () => ({ default: vi.fn() }));
vi.mock("../../../utils/encryption/encryption.utils.js", () => ({
  aes_decrypt: vi.fn(() => "decrypted-token"),
}));
vi.mock("../../utils/checkSession.js", () => ({ checkSession: vi.fn() }));
vi.mock("../whatsapp/whatsappSurvey/wasurvey.controller.js", () => ({
  webhookSubscribeHandler: vi.fn(),
}));

import axios from "axios";
import prisma from "../../utils/prisma.js";
import { log } from "../../utils/logger.js";
import { checkSession } from "../../utils/checkSession.js";
import { webhookSubscribeHandler } from "../whatsapp/whatsappSurvey/wasurvey.controller.js";
import { callMetaAgentApi, MetaAgentApiError } from "./metaAgent.client.js";
import {
  deleteFaq,
  getOrCreateAgentRecord,
  removeAllowlistEntry,
  updateFaq,
} from "./metaAgent.service.js";
import { getMetaBusinessAgentHandler, listFaqsHandler } from "./metaAgent.controller.js";
import { metaAgentWebhookEventHandler } from "./metaAgent.webhook.controller.js";
import { metaAgentRoutes } from "./metaAgent.route.js";
import { metaAgentWebhookRoutes } from "./metaAgent.webhook.route.js";
import { byIdParamSchema, connectorBodySchema } from "./metaAgent.schema.js";

type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as Record<string, any>;

const ORG = "11111111-1111-1111-1111-111111111111";
const SETTINGS = "22222222-2222-2222-2222-222222222222";
const AGENT = "3f8a1e2c-5b7d-4c9e-8a1b-2d3e4f5a6b7c";
const FAQ = "7c6b5a4f-3e2d-4b1a-9c8d-7e6f5a4b3c2d";

function reply() {
  const rep: any = { code: vi.fn(() => rep), send: vi.fn(() => rep) };
  return rep;
}

function answer(rep: any) {
  return { code: rep.code.mock.calls[0]?.[0], body: rep.send.mock.calls[0]?.[0] };
}

beforeEach(() => {
  vi.clearAllMocks();
  // clearAllMocks keeps implementations but drops queued values.
  db.whatsappSettings.findFirstOrThrow.mockResolvedValue({
    phoneId: "phone-1",
    accessToken: "enc",
    accessToken_iv: "iv",
  });
  db.metaBusinessAgent.findFirst.mockResolvedValue({ id: AGENT, orgId: ORG });
  db.metaBusinessAgent.findFirstOrThrow.mockResolvedValue({ id: AGENT, orgId: ORG });
  db.metaBusinessAgent.create.mockResolvedValue({ id: AGENT, orgId: ORG });
  db.metaAgentAllowlistEntry.findFirstOrThrow.mockResolvedValue({ id: "e-1", metaId: null });
  db.metaAgentAllowlistEntry.delete.mockResolvedValue({ id: "e-1" });
  db.metaAgentFaq.findFirstOrThrow.mockResolvedValue({ id: FAQ, metaId: null });
  db.metaAgentFaq.findMany.mockResolvedValue([]);
  db.metaAgentFaq.update.mockResolvedValue({ id: FAQ });
  db.metaAgentFaq.delete.mockResolvedValue({ id: FAQ });
  (axios as unknown as Mock).mockResolvedValue({ status: 200, data: {} });
});

// ===========================================================================
// The tenancy pattern — established positively
// ===========================================================================

describe("the org scoping", () => {
  // NOTE: every handler goes through a `wrap` helper that reads orgId from the
  // session and threads it into the service as the first argument. Nothing in
  // the module reads an org from a path, a query or a body.
  test("the handler takes the org from the session and the settings id from the path", async () => {
    const rep = reply();

    await getMetaBusinessAgentHandler(
      { user: { orgId: ORG }, params: { whatsappSettingsId: SETTINGS } } as never,
      rep,
    );

    expect(db.metaBusinessAgent.findFirst.mock.calls[0][0].where).toEqual({
      orgId: ORG,
      whatsappSettingsId: SETTINGS,
    });
    expect(answer(rep).code).toBe(200);
  });

  test("the agent record is resolved on both the org and the channel", async () => {
    await getOrCreateAgentRecord(ORG, SETTINGS);

    expect(db.metaBusinessAgent.findFirst).toHaveBeenCalledWith({
      where: { orgId: ORG, whatsappSettingsId: SETTINGS },
    });
  });

  // NOTE: the WhatsApp channel the agent acts through is itself resolved with
  // the org in the where, so a settings id from another tenant throws before
  // any token is decrypted.
  test("the channel lookup carries the org", async () => {
    await deleteFaq(ORG, SETTINGS, FAQ);

    expect(db.whatsappSettings.findFirstOrThrow.mock.calls[0][0].where).toEqual({
      id: SETTINGS,
      orgId: ORG,
    });
  });

  // NOTE: this is the pattern that fails elsewhere in the codebase — a by-id
  // delete. Here the row is resolved against the agent first, so the bare
  // `where: { id }` that follows has already been proven to belong.
  test("a by-id delete resolves ownership before deleting", async () => {
    await deleteFaq(ORG, SETTINGS, FAQ);

    expect(db.metaAgentFaq.findFirstOrThrow).toHaveBeenCalledWith({
      where: { id: FAQ, agentId: AGENT },
    });
    expect(db.metaAgentFaq.delete).toHaveBeenCalledWith({ where: { id: FAQ } });
  });

  test("a by-id update does the same", async () => {
    await updateFaq(ORG, SETTINGS, FAQ, { question: "q", answer: "a" } as never);

    expect(db.metaAgentFaq.findFirstOrThrow).toHaveBeenCalledWith({
      where: { id: FAQ, agentId: AGENT },
    });
    expect(db.metaAgentFaq.update.mock.calls[0][0].where).toEqual({ id: FAQ });
  });

  test("the allowlist delete follows the same order", async () => {
    await removeAllowlistEntry(ORG, SETTINGS, "e-1");

    expect(db.metaAgentAllowlistEntry.findFirstOrThrow.mock.calls[0][0].where).toMatchObject({
      id: "e-1",
    });
    expect(db.metaAgentAllowlistEntry.delete).toHaveBeenCalledWith({ where: { id: "e-1" } });
  });

  // NOTE: the by-id param schema declares both identifiers, so the enclosing
  // channel is validated on the sub-resource routes too.
  test("the by-id params schema carries both identifiers", () => {
    expect(byIdParamSchema.safeParse({ id: FAQ }).success).toBe(false);
    expect(byIdParamSchema.safeParse({ id: FAQ, whatsappSettingsId: SETTINGS }).success).toBe(true);
  });

  test("a channel belonging to another org throws before anything is called", async () => {
    db.whatsappSettings.findFirstOrThrow.mockRejectedValueOnce(
      Object.assign(new Error("No WhatsappSettings found"), { code: "P2025" }),
    );

    await expect(deleteFaq(ORG, SETTINGS, FAQ)).rejects.toMatchObject({ code: "P2025" });
    expect(db.metaAgentFaq.delete).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// A read that writes
// ===========================================================================

describe("getOrCreateAgentRecord", () => {
  // NOTE: the GET route's handler is getOrCreateAgentRecord, so opening the
  // agent page inserts a MetaBusinessAgent row when none exists.
  test("the read endpoint creates a row when none exists", async () => {
    db.metaBusinessAgent.findFirst.mockResolvedValueOnce(null);

    await getMetaBusinessAgentHandler(
      { user: { orgId: ORG }, params: { whatsappSettingsId: SETTINGS } } as never,
      reply(),
    );

    expect(db.metaBusinessAgent.create).toHaveBeenCalledWith({
      data: { orgId: ORG, whatsappSettingsId: SETTINGS },
    });
  });

  test("an existing row is returned without a write", async () => {
    await getOrCreateAgentRecord(ORG, SETTINGS);

    expect(db.metaBusinessAgent.create).not.toHaveBeenCalled();
  });

  // NOTE: MetaBusinessAgent has no unique constraint enforced here — the
  // read-then-create is not transactional, so two concurrent page loads both
  // find nothing and both insert.
  test("concurrent reads both create", async () => {
    db.metaBusinessAgent.findFirst.mockResolvedValue(null);

    await getOrCreateAgentRecord(ORG, SETTINGS);
    await getOrCreateAgentRecord(ORG, SETTINGS);

    expect(db.metaBusinessAgent.create).toHaveBeenCalledTimes(2);
  });
});

// ===========================================================================
// The API client
// ===========================================================================

describe("callMetaAgentApi", () => {
  test("sends the bearer token and the API version header", async () => {
    await callMetaAgentApi("/x/agent_eligibility", "GET", "tok");

    const config = (axios as unknown as Mock).mock.calls[0][0];
    expect(config.url).toBe("https://api.facebook.com/x/agent_eligibility");
    expect(config.headers.Authorization).toBe("Bearer tok");
    expect(config.headers["X-API-Version"]).toBe("2.0.0");
  });

  // NOTE: validateStatus is disabled so every response resolves, and the
  // status is then checked explicitly and a non-2xx thrown. That is the
  // opposite of issues.txt 26.12, where the same disabled validation is never
  // followed by a check.
  test("accepts every status and then checks it itself", async () => {
    const config = () => (axios as unknown as Mock).mock.calls[0][0];

    await callMetaAgentApi("/x", "GET", "tok");
    expect(config().validateStatus()).toBe(true);
  });

  test("throws a typed error for a non-2xx", async () => {
    (axios as unknown as Mock).mockResolvedValueOnce({
      status: 403,
      data: { detail: "Not eligible", type: "PermissionError" },
    });

    await expect(callMetaAgentApi("/x", "GET", "tok")).rejects.toBeInstanceOf(MetaAgentApiError);
  });

  test("the thrown error carries Meta's status and detail", async () => {
    (axios as unknown as Mock).mockResolvedValueOnce({
      status: 429,
      data: { detail: "Rate limited", type: "Throttle" },
    });

    await expect(callMetaAgentApi("/x", "GET", "tok")).rejects.toMatchObject({
      status: 429,
      detail: "Rate limited",
      type: "Throttle",
    });
  });

  test("logs Meta's error body", async () => {
    (axios as unknown as Mock).mockResolvedValueOnce({ status: 500, data: { detail: "boom" } });

    await callMetaAgentApi("/x", "GET", "tok").catch(() => {});

    expect(log.error).toHaveBeenCalled();
  });

  test("the trace log names the method and url but not the body", async () => {
    await callMetaAgentApi("/x", "POST", "tok", { api_key: "super-secret" });

    const traced = (log.trace as unknown as Mock).mock.calls[0];
    expect(JSON.stringify(traced)).not.toContain("super-secret");
  });

  // NOTE: the status check is a string prefix test rather than a numeric range.
  test("the success check is a string prefix on the status", async () => {
    (axios as unknown as Mock).mockResolvedValueOnce({ status: 204, data: { ok: true } });

    await expect(callMetaAgentApi("/x", "GET", "tok")).resolves.toEqual({ ok: true });
  });
});

// ===========================================================================
// The webhook
// ===========================================================================

describe("metaAgentWebhookEventHandler", () => {
  const body = {
    entry: [
      { changes: [{ field: "business_ai_agent", value: { thread_control: "handed_back" } }] },
    ],
  };

  // NOTE: no signature header is read and no secret is consulted. Every other
  // webhook in the codebase verifies — Shopify through its library, Stripe and
  // Razorpay by signature, Zoho by a shared token.
  test("accepts a payload with no signature of any kind", async () => {
    const rep = reply();

    await metaAgentWebhookEventHandler({ body, headers: {} } as never, rep);

    expect(answer(rep)).toEqual({ code: 200, body: "EVENT_RECEIVED" });
  });

  // NOTE: the file's own comment describes this as the entry point for
  // thread-control and agent-event notifications. The handler only logs them.
  test("does nothing with the event beyond logging it", async () => {
    await metaAgentWebhookEventHandler({ body, headers: {} } as never, reply());

    expect(db.metaBusinessAgent.update).not.toHaveBeenCalled();
    expect(log.info).toHaveBeenCalledTimes(2);
  });

  test("writes the whole caller-supplied body into the log", async () => {
    await metaAgentWebhookEventHandler(
      { body: { entry: [], marker: "attacker-controlled" }, headers: {} } as never,
      reply(),
    );

    expect(JSON.stringify((log.info as unknown as Mock).mock.calls[0])).toContain(
      "attacker-controlled",
    );
  });

  test("logs one line per change notification", async () => {
    await metaAgentWebhookEventHandler(
      {
        body: { entry: [{ changes: [{ field: "a" }, { field: "b" }] }] },
        headers: {},
      } as never,
      reply(),
    );

    expect(log.info).toHaveBeenCalledTimes(3);
  });

  test("tolerates a body with no entries", async () => {
    const rep = reply();

    await metaAgentWebhookEventHandler({ body: {}, headers: {} } as never, rep);

    expect(answer(rep).code).toBe(200);
  });

  // NOTE: the catch answers 200 as well, so Meta is told the event was handled
  // whatever happened.
  test("answers 200 even when handling throws", async () => {
    const rep = reply();

    await metaAgentWebhookEventHandler(
      {
        body: { entry: [{ changes: null }] },
        get headers() {
          throw new Error("x");
        },
      } as never,
      rep,
    );

    expect(answer(rep)).toEqual({ code: 200, body: "EVENT_RECEIVED" });
  });

  test("the webhook tree reuses the WhatsApp subscribe handler for the challenge", async () => {
    const routes: any[] = [];
    const srv: any = {
      get: vi.fn((url, handler) => routes.push({ method: "GET", url, handler })),
      post: vi.fn((url, handler) => routes.push({ method: "POST", url, handler })),
      addHook: vi.fn(),
    };

    await metaAgentWebhookRoutes(srv);

    expect(routes).toEqual([
      { method: "GET", url: "/", handler: webhookSubscribeHandler },
      { method: "POST", url: "/", handler: metaAgentWebhookEventHandler },
    ]);
    expect(srv.addHook).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// Error relay
// ===========================================================================

describe("the error handler", () => {
  test("relays Meta's status and detail to the caller", async () => {
    db.metaAgentFaq.findMany.mockRejectedValueOnce(
      Object.assign(
        new MetaAgentApiError({ status: 403, data: { detail: "Agent not onboarded" } } as never),
      ),
    );
    const rep = reply();

    await listFaqsHandler(
      { user: { orgId: ORG }, params: { whatsappSettingsId: SETTINGS } } as never,
      rep,
    );

    expect(answer(rep)).toEqual({
      code: 403,
      body: { message: "Agent not onboarded", detail: "Agent not onboarded" },
    });
  });

  test("anything else answers a fixed 500", async () => {
    db.metaAgentFaq.findMany.mockRejectedValueOnce(new Error("db down"));
    const rep = reply();

    await listFaqsHandler(
      { user: { orgId: ORG }, params: { whatsappSettingsId: SETTINGS } } as never,
      rep,
    );

    expect(answer(rep)).toEqual({ code: 500, body: { message: "Something went wrong" } });
  });

  test("an empty result is sent as an object rather than undefined", async () => {
    const rep = reply();

    await listFaqsHandler(
      { user: { orgId: ORG }, params: { whatsappSettingsId: SETTINGS } } as never,
      rep,
    );

    expect(answer(rep).body).toEqual([]);
  });
});

// ===========================================================================
// Schemas and route registration
// ===========================================================================

describe("the connector schema", () => {
  // NOTE: base_url is the address Meta will call on the business's behalf, and
  // it is a bare z.string() — no URL parse, no scheme requirement.
  test("accepts a base_url that is not a URL", () => {
    const parsed = connectorBodySchema.safeParse({
      name: "n",
      description: "d",
      base_url: "not a url",
      auth_type: "NONE",
    });

    expect(parsed.success).toBe(true);
  });

  test("constrains the auth type to the three Meta supports", () => {
    expect(
      connectorBodySchema.safeParse({
        name: "n",
        description: "d",
        base_url: "https://x.test",
        auth_type: "BASIC",
      }).success,
    ).toBe(false);
  });
});

describe("metaAgentRoutes", () => {
  async function collect() {
    const routes: any[] = [];
    const hooks: any[] = [];
    const srv: any = {
      addHook: vi.fn((name, fn) => hooks.push({ name, fn })),
      get: vi.fn((url, opts, handler) => routes.push({ method: "GET", url, opts, handler })),
      post: vi.fn((url, opts, handler) => routes.push({ method: "POST", url, opts, handler })),
      put: vi.fn((url, opts, handler) => routes.push({ method: "PUT", url, opts, handler })),
      delete: vi.fn((url, opts, handler) => routes.push({ method: "DELETE", url, opts, handler })),
    };
    await metaAgentRoutes(srv);
    return { routes, hooks };
  }

  test("requires a session for the whole tree", async () => {
    const { hooks } = await collect();

    expect(hooks).toEqual([{ name: "preHandler", fn: checkSession }]);
  });

  test("every route is scoped under the channel id", async () => {
    const { routes } = await collect();

    for (const r of routes) {
      expect(r.url.startsWith("/:whatsappSettingsId")).toBe(true);
    }
  });

  test("every route declares a params schema", async () => {
    const { routes } = await collect();

    for (const r of routes) {
      expect(r.opts.schema.params).toBeDefined();
    }
  });

  // NOTE: no role check and no subscription gate anywhere — any member can
  // configure the agent and register connector credentials.
  test("no route carries a role or feature requirement", async () => {
    const { routes } = await collect();

    for (const r of routes) {
      expect(r.opts.preHandler).toBeUndefined();
    }
  });

  test("the credential routes are ordinary member-accessible writes", async () => {
    const { routes } = await collect();

    const credentialRoutes = routes.filter((r) => /upsert(ApiKey|OAuth|Certificate)/i.test(r.url));
    expect(credentialRoutes.length).toBeGreaterThan(0);
    for (const r of credentialRoutes) {
      expect(r.opts.preHandler).toBeUndefined();
      expect(r.opts.schema.body).toBeDefined();
    }
  });
});
