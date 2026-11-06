import { beforeEach, describe, expect, test, vi } from "vitest";

vi.hoisted(() => {
  process.env.wa_access_token_encryption_key = "00".repeat(32);
  process.env.waclient_secret = "meta-app-secret";
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
vi.mock("fastify-raw-body", () => ({ default: vi.fn() }));

import axios from "axios";
import prisma from "../../utils/prisma.js";
import { log } from "../../utils/logger.js";
import { webhookSubscribeHandler } from "../whatsapp/whatsappSurvey/wasurvey.controller.js";
import { callMetaAgentApi, MetaAgentApiError } from "./metaAgent.client.js";
import crypto from "node:crypto";
import {
  deleteFaq,
  getAgentRecord,
  getOrCreateAgentRecord,
  removeAllowlistEntry,
  updateFaq,
} from "./metaAgent.service.js";
import { getMetaBusinessAgentHandler, listFaqsHandler } from "./metaAgent.controller.js";
import { metaAgentWebhookEventHandler } from "./metaAgent.webhook.controller.js";
import { metaAgentRoutes } from "./metaAgent.route.js";
import { metaAgentWebhookRoutes } from "./metaAgent.webhook.route.js";
import {
  agentEventBodySchema,
  agentSettingsBodySchema,
  allowlistEntryBodySchema,
  byIdParamSchema,
  connectorBodySchema,
  connectorLogsQuerySchema,
  connectorToolBodySchema,
  requestDefinitionSchema,
  skillBodySchema,
  uiSkillBodySchema,
  uiSkillUpdateBodySchema,
  upsertApiKeyBodySchema,
  upsertCertificateBodySchema,
  upsertOAuthBodySchema,
} from "./metaAgent.schema.js";

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

describe("the agent record read", () => {
  test("the read endpoint no longer creates a row", async () => {
    db.metaBusinessAgent.findFirst.mockResolvedValueOnce(null);
    const rep = reply();

    await getMetaBusinessAgentHandler(
      { user: { orgId: ORG }, params: { whatsappSettingsId: SETTINGS } } as never,
      rep,
    );

    expect(db.metaBusinessAgent.create).not.toHaveBeenCalled();
    // wrap() sends `data ?? {}`, so a channel with no agent reads as empty.
    expect(answer(rep)).toEqual({ code: 200, body: {} });
  });

  test("an existing row is returned as it stands", async () => {
    const rep = reply();

    await getMetaBusinessAgentHandler(
      { user: { orgId: ORG }, params: { whatsappSettingsId: SETTINGS } } as never,
      rep,
    );

    expect(answer(rep).body).toEqual({ id: AGENT, orgId: ORG });
  });

  test("the read is scoped on the org and the channel", async () => {
    await getAgentRecord(ORG, SETTINGS);

    expect(db.metaBusinessAgent.findFirst).toHaveBeenCalledWith({
      where: { orgId: ORG, whatsappSettingsId: SETTINGS },
    });
  });

  // The row is still created by the two explicit POSTs — the eligibility check
  // and onboarding — which is where it belongs.
  test("the create-if-missing helper survives for the onboarding path", async () => {
    db.metaBusinessAgent.findFirst.mockResolvedValueOnce(null);

    await getOrCreateAgentRecord(ORG, SETTINGS);

    expect(db.metaBusinessAgent.create).toHaveBeenCalledWith({
      data: { orgId: ORG, whatsappSettingsId: SETTINGS },
    });
  });

  test("and returns an existing row without a write", async () => {
    await getOrCreateAgentRecord(ORG, SETTINGS);

    expect(db.metaBusinessAgent.create).not.toHaveBeenCalled();
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

  // Meta signs each delivery with an HMAC-SHA256 over the exact bytes it sent,
  // keyed on the app secret. Build the request the way Meta would.
  function signed(payload: unknown, secret = "meta-app-secret") {
    const rawBody = JSON.stringify(payload);
    const digest = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
    return {
      body: payload,
      rawBody,
      headers: { "x-hub-signature-256": `sha256=${digest}` },
      ip: "203.0.113.9",
    } as never;
  }

  test("refuses a payload with no signature of any kind", async () => {
    const rep = reply();

    await metaAgentWebhookEventHandler(
      { body, rawBody: JSON.stringify(body), headers: {}, ip: "203.0.113.9" } as never,
      rep,
    );

    expect(answer(rep)).toEqual({ code: 401, body: { message: "Invalid signature" } });
    expect(log.info).not.toHaveBeenCalled();
  });

  test("refuses a signature computed with the wrong secret", async () => {
    const rep = reply();

    await metaAgentWebhookEventHandler(signed(body, "not-the-app-secret"), rep);

    expect(answer(rep).code).toBe(401);
  });

  test("refuses a signature that does not match the body it arrived with", async () => {
    const request = signed(body) as any;
    request.rawBody = JSON.stringify({ entry: [{ changes: [{ field: "tampered" }] }] });
    const rep = reply();

    await metaAgentWebhookEventHandler(request, rep);

    expect(answer(rep).code).toBe(401);
  });

  test("refuses a delivery whose raw body never reached the handler", async () => {
    const request = signed(body) as any;
    delete request.rawBody;
    const rep = reply();

    await metaAgentWebhookEventHandler(request, rep);

    expect(answer(rep).code).toBe(401);
  });

  test("accepts a correctly signed delivery", async () => {
    const rep = reply();

    await metaAgentWebhookEventHandler(signed(body), rep);

    expect(answer(rep)).toEqual({ code: 200, body: "EVENT_RECEIVED" });
  });

  test("does nothing with the event beyond logging it", async () => {
    await metaAgentWebhookEventHandler(signed(body), reply());

    expect(db.metaBusinessAgent.update).not.toHaveBeenCalled();
    expect(log.info).toHaveBeenCalledTimes(1);
  });

  // The whole body used to be logged at info by an unauthenticated caller. It
  // is verified now, and recorded at debug rather than info.
  test("the full body is no longer written at info level", async () => {
    await metaAgentWebhookEventHandler(signed({ entry: [], marker: "caller-controlled" }), reply());

    expect(JSON.stringify((log.info as unknown as Mock).mock.calls)).not.toContain(
      "caller-controlled",
    );
    expect(JSON.stringify((log.debug as unknown as Mock).mock.calls)).toContain(
      "caller-controlled",
    );
  });

  test("logs one line per change notification", async () => {
    await metaAgentWebhookEventHandler(
      signed({ entry: [{ changes: [{ field: "a" }, { field: "b" }] }] }),
      reply(),
    );

    expect(log.info).toHaveBeenCalledTimes(2);
  });

  test("tolerates a body with no entries", async () => {
    const rep = reply();

    await metaAgentWebhookEventHandler(signed({}), rep);

    expect(answer(rep).code).toBe(200);
  });

  // Still 200 once the delivery is authentic: nothing acts on the event, so
  // there is nothing a Meta retry would fix.
  test("answers 200 even when handling throws", async () => {
    const request = signed({ entry: null }) as any;
    Object.defineProperty(request, "body", {
      get() {
        throw new Error("x");
      },
    });
    const rep = reply();

    await metaAgentWebhookEventHandler(request, rep);

    expect(answer(rep)).toEqual({ code: 200, body: "EVENT_RECEIVED" });
  });

  test("the webhook tree reuses the WhatsApp subscribe handler for the challenge", async () => {
    const routes: any[] = [];
    const srv: any = {
      register: vi.fn(),
      get: vi.fn((url, handler) => routes.push({ method: "GET", url, handler })),
      post: vi.fn((url, opts, handler) => routes.push({ method: "POST", url, opts, handler })),
      addHook: vi.fn(),
    };

    await metaAgentWebhookRoutes(srv);

    expect(routes[0]).toEqual({ method: "GET", url: "/", handler: webhookSubscribeHandler });
    expect(routes[1].handler).toBe(metaAgentWebhookEventHandler);
    // The raw body is what the signature is computed over, so the POST has to
    // ask for it.
    expect(routes[1].opts.config.rawBody).toBe(true);
    expect(srv.register).toHaveBeenCalledOnce();
    expect(srv.addHook).toHaveBeenCalledWith("onRoute", expect.any(Function));
  });
});

// ===========================================================================
// Error relay
// ===========================================================================

describe("the error handler", () => {
  async function failWith(status: number, detail = "Agent not onboarded") {
    db.metaAgentFaq.findMany.mockRejectedValueOnce(
      new MetaAgentApiError({ status, data: { detail } } as never),
    );
    const rep = reply();
    await listFaqsHandler(
      { user: { orgId: ORG }, params: { whatsappSettingsId: SETTINGS } } as never,
      rep,
    );
    return answer(rep);
  }

  test("an upstream refusal is a 502 here, not a 403", async () => {
    expect(await failWith(403)).toEqual({
      code: 502,
      body: {
        message: "Agent not onboarded",
        detail: "Agent not onboarded",
        upstreamStatus: 403,
      },
    });
  });

  test("Meta's throttle is not relayed as ours", async () => {
    expect((await failWith(429, "Rate limited")).code).toBe(502);
  });

  test("a rejected payload stays a 400", async () => {
    expect((await failWith(400, "base_url is invalid")).code).toBe(400);
    expect((await failWith(422, "unprocessable")).code).toBe(400);
  });

  test("a not-found stays a 404", async () => {
    expect((await failWith(404, "no such agent")).code).toBe(404);
  });

  test("a Meta error with no status is a 502", async () => {
    expect((await failWith(undefined as never, "unknown")).code).toBe(502);
  });

  test("a Meta call that timed out is a 504 that says what to do", async () => {
    const reply = { code: vi.fn(() => reply), send: vi.fn(() => reply) } as any;
    const timedOut = Object.assign(new Error("timeout of 45000ms exceeded"), {
      code: "ECONNABORTED",
    });
    vi.mocked(prisma.metaBusinessAgent.findFirst).mockRejectedValueOnce(timedOut);
    await listFaqsHandler(
      { user: { orgId: "org-1" }, params: { whatsappSettingsId: "ws-1" } } as any,
      reply,
    );
    expect(reply.code).toHaveBeenLastCalledWith(504);
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
  const connector = (base_url: string) => ({
    name: "n",
    description: "d",
    base_url,
    auth_type: "NONE" as const,
  });

  test("refuses a base_url that is not a URL", () => {
    expect(connectorBodySchema.safeParse(connector("not a url")).success).toBe(false);
    expect(connectorBodySchema.safeParse(connector("")).success).toBe(false);
  });

  test("requires https", () => {
    expect(connectorBodySchema.safeParse(connector("http://x.test")).success).toBe(false);
    expect(connectorBodySchema.safeParse(connector("https://x.test/v1")).success).toBe(true);
  });

  test("bounds the length", () => {
    expect(
      connectorBodySchema.safeParse(connector(`https://x.test/${"a".repeat(2100)}`)).success,
    ).toBe(false);
  });

  test("only accepts the three auth types Meta supports today", () => {
    const withAuth = (auth_type: string) =>
      connectorBodySchema.safeParse({
        name: "n",
        description: "d",
        base_url: "https://x.test",
        auth_type,
      }).success;

    for (const auth of ["OAUTH2_CLIENT_CREDENTIALS", "API_KEY", "NONE"]) {
      expect(withAuth(auth)).toBe(true);
    }
    // Listed in Meta's enum, but "Currently, only OAUTH2_CLIENT_CREDENTIALS,
    // API_KEY, and NONE are supported."
    for (const auth of ["OAUTH2", "BASIC", "CUSTOM", "MUTUAL_TLS"]) {
      expect(withAuth(auth)).toBe(false);
    }
  });
});

// Each of these mirrors a shape Meta's reference spells out, and each was a
// place the payload we sent would have been rejected — or silently misread —
// before it was pinned down here.
describe("the credential upsert schemas match Meta's own bodies", () => {
  test("an API key is a set of named header/query/body fields, not one string", () => {
    expect(upsertApiKeyBodySchema.safeParse({ api_key: "secret" }).success).toBe(false);
    expect(
      upsertApiKeyBodySchema.safeParse({
        api_key_config: {
          headers: [{ field_name: "Authorization", value: "secret", prefix: "Bearer " }],
        },
      }).success,
    ).toBe(true);
  });

  test("an API key config with every bucket empty is rejected", () => {
    expect(
      upsertApiKeyBodySchema.safeParse({ api_key_config: { headers: [], query_params: [] } })
        .success,
    ).toBe(false);
  });

  test("OAuth needs the token url and at least one scope", () => {
    const oauth = (config: Record<string, unknown>) =>
      upsertOAuthBodySchema.safeParse({ oauth_config: config }).success;

    expect(oauth({ client_id: "id", client_secret: "s" })).toBe(false);
    expect(
      oauth({
        token_url: "https://auth.test/token",
        scopes_to_request: [],
        client_id: "id",
        client_secret: "s",
      }),
    ).toBe(false);
    expect(
      oauth({
        token_url: "https://auth.test/token",
        scopes_to_request: ["orders.read"],
        client_id: "id",
        client_secret: "s",
      }),
    ).toBe(true);
  });

  test("a certificate upsert wants PEM blocks under Meta's field names", () => {
    const pem = "-----BEGIN CERTIFICATE-----\nabc\n-----END CERTIFICATE-----";
    expect(
      upsertCertificateBodySchema.safeParse({ certificate: pem, private_key: pem }).success,
    ).toBe(false);
    expect(
      upsertCertificateBodySchema.safeParse({ client_certificate: pem, client_key: "hunter2" })
        .success,
    ).toBe(false);
    // A key has to be a key, not a second certificate.
    expect(
      upsertCertificateBodySchema.safeParse({ client_certificate: pem, client_key: pem }).success,
    ).toBe(false);
    const key = "-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----";
    for (const header of ["PRIVATE KEY", "RSA PRIVATE KEY", "EC PRIVATE KEY"]) {
      expect(
        upsertCertificateBodySchema.safeParse({
          client_certificate: pem,
          client_key: `-----BEGIN ${header}-----\nabc`,
        }).success,
      ).toBe(true);
    }
    expect(
      upsertCertificateBodySchema.safeParse({ client_certificate: key, client_key: key }).success,
    ).toBe(false);
  });
});

describe("the connector tool request definition", () => {
  const definition = (over: Record<string, unknown> = {}) => ({
    method: "GET",
    path: "/orders",
    ...over,
  });

  test("only accepts the five methods Meta lists", () => {
    expect(requestDefinitionSchema.safeParse(definition({ method: "HEAD" })).success).toBe(false);
    expect(requestDefinitionSchema.safeParse(definition({ method: "PATCH" })).success).toBe(true);
  });

  test("requires a leading slash on the path", () => {
    expect(requestDefinitionSchema.safeParse(definition({ path: "orders" })).success).toBe(false);
  });

  // The failure this catches is invisible until runtime, when the agent calls a
  // literal `/orders/{orderId}`.
  test("rejects a path placeholder with no matching path parameter", () => {
    expect(
      requestDefinitionSchema.safeParse(definition({ path: "/orders/{orderId}" })).success,
    ).toBe(false);
    expect(
      requestDefinitionSchema.safeParse(
        definition({
          path: "/orders/{orderId}",
          path_parameters: { orderId: { type: "string", required: true } },
        }),
      ).success,
    ).toBe(true);
  });

  test("a default binding needs a value and a macro binding a known macro", () => {
    const withBinding = (binding: Record<string, unknown>) =>
      requestDefinitionSchema.safeParse(
        definition({ query_parameters: { phone: { type: "string", binding } } }),
      ).success;

    expect(withBinding({ kind: "default" })).toBe(false);
    expect(withBinding({ kind: "default", value: "IN" })).toBe(true);
    expect(withBinding({ kind: "macro", macro: "NOT_A_MACRO" })).toBe(false);
    expect(withBinding({ kind: "macro", macro: "WHATSAPP_PHONE_NUMBER" })).toBe(true);
  });

  test("body objects nest through properties", () => {
    expect(
      requestDefinitionSchema.safeParse(
        definition({
          method: "POST",
          body: {
            content_type: "application/json",
            params: {
              order: {
                type: "object",
                required: ["id"],
                properties: {
                  id: { type: "string" },
                  tags: { type: "array", items: { type: "string" } },
                },
              },
            },
            required: ["order"],
          },
        }),
      ).success,
    ).toBe(true);
  });

  test("user_auth_required is not optional on a tool", () => {
    const tool = { name: "get_order", description: "d", request_definition: definition() };
    expect(connectorToolBodySchema.safeParse(tool).success).toBe(false);
    expect(connectorToolBodySchema.safeParse({ ...tool, user_auth_required: false }).success).toBe(
      true,
    );
  });
});

describe("the settings, skill and ui-skill schemas", () => {
  test("an enabled follow-up must carry an interval and a message", () => {
    expect(agentSettingsBodySchema.safeParse({ followup: { enabled: true } }).success).toBe(false);
    expect(
      agentSettingsBodySchema.safeParse({
        followup: { enabled: true, followup_interval_in_seconds: 900, message: "Still there?" },
      }).success,
    ).toBe(true);
  });

  test("only Meta's eight follow-up intervals are accepted", () => {
    expect(
      agentSettingsBodySchema.safeParse({
        followup: { enabled: true, followup_interval_in_seconds: 600, message: "hi" },
      }).success,
    ).toBe(false);
  });

  test("a skill title is a lowercase slug within 64 characters", () => {
    const skill = (title: string) =>
      skillBodySchema.safeParse({ title, description: "d", skill: "s" }).success;

    expect(skill("Order Status")).toBe(false);
    expect(skill("order-status-lookup")).toBe(true);
    expect(skill("a".repeat(65))).toBe(false);
  });

  test("a ui-skill title is a lowercase slug that does not start or end with a hyphen", () => {
    const title = (value: string) =>
      uiSkillBodySchema.safeParse({
        title: value,
        component_type: "cta_url",
        status: "enabled",
        instruction: "Send when the customer wants to book",
      }).success;

    expect(title("book-a-table")).toBe(true);
    expect(title("menu2")).toBe(true);
    expect(title("a")).toBe(true);
    expect(title("Book a table")).toBe(false);
    expect(title("book_a_table")).toBe(false);
    expect(title("-book")).toBe(false);
    expect(title("book-")).toBe(false);
    expect(title("-")).toBe(false);
    expect(uiSkillUpdateBodySchema.safeParse({ title: "Book" }).success).toBe(false);
    expect(uiSkillUpdateBodySchema.safeParse({ title: "book" }).success).toBe(true);
  });

  test("a flow ui-skill is the one component type that needs a flow id", () => {
    const uiSkill = (over: Record<string, unknown>) =>
      uiSkillBodySchema.safeParse({
        title: "book-a-table",
        status: "enabled",
        instruction: "Send when the customer wants to book",
        ...over,
      }).success;

    expect(uiSkill({ component_type: "flow" })).toBe(false);
    expect(uiSkill({ component_type: "flow", flow_id: "1234567890123" })).toBe(true);
    expect(uiSkill({ component_type: "cta_url" })).toBe(true);
    expect(uiSkill({ component_type: "carousel" })).toBe(false);
  });
});

describe("the operate schemas", () => {
  test("phone numbers must be E.164 before they reach Meta", () => {
    expect(allowlistEntryBodySchema.safeParse({ consumer_phone_number: "5551234" }).success).toBe(
      false,
    );
    expect(
      allowlistEntryBodySchema.safeParse({ consumer_phone_number: "+15551234567" }).success,
    ).toBe(true);
  });

  test("an event payload must be JSON within 4096 characters", () => {
    const event = (payload: string) =>
      agentEventBodySchema.safeParse({
        to: "+15551234567",
        event: { type: "order_shipped", description: "d", payload },
      }).success;

    expect(event("not json")).toBe(false);
    expect(event(JSON.stringify({ orderId: "1" }))).toBe(true);
    expect(event(JSON.stringify({ blob: "x".repeat(5000) }))).toBe(false);
  });

  // Meta only keeps 7 days of connector logs and 400s on a wider window.
  test("the connector log window is capped at 7 days", () => {
    const day = 24 * 60 * 60;
    const start = Math.floor(Date.now() / 1000) - 6 * day;
    expect(
      connectorLogsQuerySchema.safeParse({ start_time: start, end_time: start + 8 * day }).success,
    ).toBe(false);
    expect(
      connectorLogsQuerySchema.safeParse({ start_time: start, end_time: start + 5 * day }).success,
    ).toBe(true);
  });

  test("and cannot start before Meta's 7 days of retention", () => {
    const eightDaysAgo = Math.floor(Date.now() / 1000) - 8 * 24 * 60 * 60;
    expect(connectorLogsQuerySchema.safeParse({ start_time: eightDaysAgo }).success).toBe(false);
  });

  test("the log flags read the string false as false", () => {
    // Query values arrive as strings; z.coerce.boolean() made "false" true.
    const parsed = connectorLogsQuerySchema.parse({ summary_only: "false", include_stats: "true" });
    expect(parsed.summary_only).toBe(false);
    expect(parsed.include_stats).toBe(true);
  });
});

describe("metaAgentRoutes", () => {
  async function collect() {
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
    await metaAgentRoutes(srv);
    return { routes, hooks };
  }

  test("requires a session for the whole tree", async () => {
    const { hooks } = await collect();

    expect(hooks).toEqual([{ name: "onRoute", fn: expect.any(Function) }]);
    const read: any = { method: "GET", url: "/x", config: {} };
    const write: any = { method: "POST", url: "/x", config: {} };
    hooks[0].fn(read);
    hooks[0].fn(write);
    expect(read.config).toEqual({ permission: "meta_agent.read", access: "session" });
    expect(write.config).toEqual({ permission: "meta_agent.use", access: "session" });
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

  test("the credential routes require an admin", async () => {
    const { routes } = await collect();

    const credentialRoutes = routes.filter((r) => /upsert(ApiKey|OAuth|Certificate)/i.test(r.url));
    expect(credentialRoutes.length).toBe(3);
    for (const r of credentialRoutes) {
      expect(r.opts.config.permission).toBe("meta_agent.manage");
      expect(r.opts.schema.body).toBeDefined();
    }
  });

  test("so do the connector and tool writes that surround them", async () => {
    const { routes } = await collect();

    const gated = routes
      .filter((r) => r.opts.config?.permission === "meta_agent.manage")
      .map((r) => `${r.method} ${r.url.replace("/:whatsappSettingsId", "")}`);

    expect(gated).toEqual([
      // Tearing the agent down at Meta discards every mirrored config, so it is
      // gated alongside the credential writes rather than left to any member.
      "DELETE /agent",
      "POST /connectors",
      "PUT /connectors/:id",
      "DELETE /connectors/:id",
      "POST /connectors/:id/upsertApiKey",
      "POST /connectors/:id/upsertOAuth",
      "POST /connectors/:id/upsertCertificate",
      "POST /rateup-connector",
      "DELETE /rateup-connector",
      "POST /connectors/:connectorId/tools",
      "PUT /connectors/:connectorId/tools/:toolId",
      "DELETE /connectors/:connectorId/tools/:toolId",
      "POST /connectors/:connectorId/tools/:toolId/run",
      // A usage cap decides when customers stop getting AI replies.
      "PUT /budget",
    ]);
  });

  // The reads stay open to any member — what is gated is registering
  // credentials and calling out with them.
  test("the connector reads are still member-accessible", async () => {
    const { routes } = await collect();

    for (const url of ["/connectors", "/connectors/:id/logs", "/connectors/:connectorId/tools"]) {
      const r = routes.find((x) => x.method === "GET" && x.url.endsWith(url));
      expect(r.opts.preHandler).toBeUndefined();
    }
  });

  test("no subscription or feature gate anywhere", async () => {
    const { routes } = await collect();

    const knowledge = routes.filter((r) => r.url.includes("/knowledge/"));
    expect(knowledge.length).toBeGreaterThan(0);
    for (const r of knowledge) {
      expect(r.opts.preHandler).toBeUndefined();
    }
  });
});
