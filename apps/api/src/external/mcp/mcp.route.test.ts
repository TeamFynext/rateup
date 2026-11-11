import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from "vite-plus/test";
import Fastify, { type FastifyInstance, type FastifyRequest } from "fastify";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";
import z from "zod";

vi.mock("../../utils/logger.js", () => ({
  log: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), trace: vi.fn(), debug: vi.fn() },
}));
vi.mock("../shared/rateLimit.js", () => ({ externalRateLimit: () => async () => {} }));
vi.mock("../../modules/settings/org/orgSuspension.js", () => ({
  isOrgSuspended: vi.fn(async () => false),
  ORG_SUSPENDED_MESSAGE: "suspended",
}));

/** `rk_full` may do anything, `rk_read` only read contacts, `rk_test` is a full test key. */
const auth = vi.hoisted(() => ({
  assertApiKeyV2: vi.fn(async (request: FastifyRequest) => {
    const key = request.headers.authorization?.replace("Bearer ", "");
    if (!key || !["rk_full", "rk_read", "rk_test"].includes(key)) {
      const { ApiAuthError } = await import("../../modules/settings/apiKeys/apiKey.auth.js");
      throw new ApiAuthError(401, "invalid_token", "Invalid access token");
    }
    const can = (p: string) => key !== "rk_read" || p === "contacts.read";
    Object.assign(request, {
      user: { orgId: "org-1", role: "SUPER_ADMIN" },
      actor: { can },
      apiKey: { id: key, mode: key === "rk_test" ? "test" : "live", version: "v2" },
    });
    return {};
  }),
}));
vi.mock("../../modules/settings/apiKeys/apiKey.auth.js", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  assertApiKeyV2: auth.assertApiKeyV2,
}));

import { externalErrorHandler } from "../shared/errors.js";
import { requireScope, refuseTestKeyOnPaidRoute, declareExternalScopes } from "../shared/scopes.js";
import { EXTERNAL_V2_PREFIX } from "../v2/prefix.js";
import { recordV2Route } from "./catalog.js";
import { externalMcpRoutes, MCP_PATH, resetMcpToolCache } from "./mcp.route.js";

const seen = vi.fn();
let app: FastifyInstance;

/** A stand-in v2: two contact routes and a paid send, behind the real scope checks. */
async function fakeV2(v2: FastifyInstance) {
  v2.setErrorHandler(externalErrorHandler);
  v2.addHook("preHandler", async (request) => {
    await auth.assertApiKeyV2(request);
    requireScope(request);
    refuseTestKeyOnPaidRoute(request);
  });
  v2.addHook("onRoute", recordV2Route);

  v2.register(
    async (contacts) => {
      declareExternalScopes(contacts, { read: "contacts.read", write: "contacts.manage" });
      contacts.get(
        "/",
        {
          schema: {
            summary: "List contacts",
            querystring: z.object({ limit: z.coerce.number().int().max(100).default(50) }),
          },
        },
        async (request) => {
          seen(request.headers, request.query);
          return { data: [{ id: "c-1" }], nextCursor: null };
        },
      );
      contacts.get(
        "/:contactId",
        { schema: { summary: "Get a contact", params: z.object({ contactId: z.string() }) } },
        async (request) => ({ id: (request.params as { contactId: string }).contactId }),
      );
      contacts.post(
        "/",
        { schema: { summary: "Create a contact", body: z.object({ name: z.string() }) } },
        async (request, reply) => {
          seen(request.headers, request.body);
          return reply.code(201).send({ id: "c-2", ...(request.body as object) });
        },
      );
    },
    { prefix: "/contacts" },
  );

  v2.register(
    async (templates) => {
      declareExternalScopes(templates, { read: "inbox.read", write: "inbox.reply" });
      templates.post(
        "/send",
        {
          config: { paid: true },
          schema: { summary: "Send a template", body: z.object({ phone: z.string() }) },
        },
        async () => ({ messageId: "m-1" }),
      );
    },
    { prefix: "/wa/templates" },
  );
}

beforeAll(async () => {
  resetMcpToolCache();
  app = Fastify();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  await app.register(fakeV2, { prefix: EXTERNAL_V2_PREFIX });
  await app.register(externalMcpRoutes, { prefix: MCP_PATH });
  await app.ready();
});
afterAll(() => app.close());
beforeEach(() => seen.mockClear());

let nextId = 1;
async function rpc(method: string, params?: unknown, key = "rk_full") {
  const res = await app.inject({
    method: "POST",
    url: MCP_PATH,
    headers: { authorization: `Bearer ${key}`, "cf-connecting-ip": "203.0.113.9" },
    payload: { jsonrpc: "2.0", id: nextId++, method, params },
  });
  return { status: res.statusCode, body: res.payload ? JSON.parse(res.payload) : null, res };
}

const call = (name: string, args: unknown, key?: string) =>
  rpc("tools/call", { name, arguments: args }, key);

describe("MCP transport", () => {
  test("initialize answers with the client's protocol version and the tools capability", async () => {
    const { status, body } = await rpc("initialize", {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "test", version: "0" },
    });
    expect(status).toBe(200);
    expect(body.result.protocolVersion).toBe("2025-06-18");
    expect(body.result.capabilities).toEqual({ tools: { listChanged: false } });
    expect(body.result.serverInfo.name).toBe("rateup");
  });

  test("an unknown protocol version gets the newest one", async () => {
    const { body } = await rpc("initialize", { protocolVersion: "1999-01-01" });
    expect(body.result.protocolVersion).toBe("2025-11-25");
  });

  test("a notification is accepted with 202 and no body", async () => {
    const res = await app.inject({
      method: "POST",
      url: MCP_PATH,
      headers: { authorization: "Bearer rk_full" },
      payload: { jsonrpc: "2.0", method: "notifications/initialized" },
    });
    expect(res.statusCode).toBe(202);
    expect(res.payload).toBe("");
  });

  test("no key is 401 with a WWW-Authenticate header", async () => {
    const res = await app.inject({
      method: "POST",
      url: MCP_PATH,
      payload: { jsonrpc: "2.0", id: 1, method: "ping" },
    });
    expect(res.statusCode).toBe(401);
    expect(res.headers["www-authenticate"]).toContain("Bearer");
    expect(JSON.parse(res.payload).error.code).toBe("unauthorized");
  });

  test("GET is 405: there is no server stream", async () => {
    const res = await app.inject({
      method: "GET",
      url: MCP_PATH,
      headers: { authorization: "Bearer rk_full" },
    });
    expect(res.statusCode).toBe(405);
    expect(res.headers.allow).toBe("POST");
  });

  test("unknown methods and bad messages are JSON-RPC errors", async () => {
    expect((await rpc("nope")).body.error.code).toBe(-32601);
    const res = await app.inject({
      method: "POST",
      url: MCP_PATH,
      headers: { authorization: "Bearer rk_full" },
      payload: { id: 1, method: "ping" },
    });
    expect(JSON.parse(res.payload).error.code).toBe(-32600);
  });

  test("a batch gets an array of answers", async () => {
    const res = await app.inject({
      method: "POST",
      url: MCP_PATH,
      headers: { authorization: "Bearer rk_full" },
      payload: [
        { jsonrpc: "2.0", id: 1, method: "ping" },
        { jsonrpc: "2.0", method: "notifications/initialized" },
        { jsonrpc: "2.0", id: 2, method: "ping" },
      ],
    });
    expect(JSON.parse(res.payload).map((a: { id: number }) => a.id)).toEqual([1, 2]);
  });
});

describe("tools/list", () => {
  const names = async (key: string) =>
    (await rpc("tools/list", {}, key)).body.result.tools.map((t: { name: string }) => t.name);

  test("a full key sees every tool, without the internal route details", async () => {
    const { body } = await rpc("tools/list");
    expect(body.result.tools.map((t: { name: string }) => t.name)).toEqual([
      "contacts_create",
      "contacts_get",
      "contacts_list",
      "templates_send",
    ]);
    expect(body.result.tools[0]).not.toHaveProperty("route");
    expect(body.result.tools[0].inputSchema.type).toBe("object");
  });

  test("a scoped key sees only what its scopes allow", async () => {
    expect(await names("rk_read")).toEqual(["contacts_get", "contacts_list"]);
  });

  test("a test key does not see paid sends", async () => {
    expect(await names("rk_test")).not.toContain("templates_send");
  });
});

describe("tools/call", () => {
  test("runs the v2 route with the caller's key and address", async () => {
    const { body } = await call("contacts_list", { limit: 5 });
    expect(body.result.isError).toBe(false);
    expect(JSON.parse(body.result.content[0].text)).toEqual({
      data: [{ id: "c-1" }],
      nextCursor: null,
    });
    const [headers, query] = seen.mock.calls[0]!;
    expect(headers.authorization).toBe("Bearer rk_full");
    expect(headers["cf-connecting-ip"]).toBe("203.0.113.9");
    expect(headers["user-agent"]).toMatch(/^rateup-mcp/);
    expect(query).toEqual({ limit: 5 });
  });

  test("fills path params and sends the body and Idempotency-Key", async () => {
    const got = await call("contacts_get", { contactId: "abc" });
    expect(JSON.parse(got.body.result.content[0].text)).toEqual({ id: "abc" });

    const created = await call("contacts_create", {
      body: { name: "Ann" },
      idempotencyKey: "key-12345",
    });
    expect(JSON.parse(created.body.result.content[0].text)).toEqual({ id: "c-2", name: "Ann" });
    const [headers, body] = seen.mock.calls[0]!;
    expect(headers["idempotency-key"]).toBe("key-12345");
    expect(body).toEqual({ name: "Ann" });
  });

  test("v2's refusals come back as tool errors in v2's envelope", async () => {
    const scope = await call("contacts_create", { body: { name: "Ann" } }, "rk_read");
    expect(scope.body.result.isError).toBe(true);
    expect(JSON.parse(scope.body.result.content[0].text).error.code).toBe("insufficient_scope");

    const paid = await call("templates_send", { body: { phone: "919876543210" } }, "rk_test");
    expect(JSON.parse(paid.body.result.content[0].text).error.code).toBe("test_key_not_allowed");

    const invalid = await call("contacts_create", { body: {} });
    expect(JSON.parse(invalid.body.result.content[0].text).error.code).toBe("validation_failed");
  });

  test("a missing path argument is a tool error; an unknown tool a protocol error", async () => {
    const missing = await call("contacts_get", {});
    expect(missing.body.result.isError).toBe(true);
    expect(missing.body.result.content[0].text).toContain("contactId");

    expect((await call("contacts_teleport", {})).body.error.code).toBe(-32602);
  });
});
