import { beforeAll, describe, expect, test, vi } from "vite-plus/test";
import Fastify from "fastify";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";

/**
 * Every real v2 route becomes a tool (or is left out on purpose in TOOL_NAMES). Routes are
 * only registered, never called, so the mocks just let the modules import.
 */

// Any property, at any depth, is a function returning another such thing (and awaiting one
// gives it back). Lets a module that touches Prisma or Redis at import time load without
// either — `redis.duplicate().on(...)`, for one.
function anything(): any {
  const fn = vi.fn((): any => anything());
  return new Proxy(fn, {
    get: (target, prop) => {
      if (prop === "then") return undefined;
      if (prop in target) return (target as any)[prop];
      return ((target as any)[prop] = anything());
    },
  });
}

vi.mock("../../utils/prisma.js", () => ({ default: anything(), excludeFields: vi.fn() }));
vi.mock("../../utils/redisConnection.js", () => ({ default: anything() }));
// Queues are constructed at module scope all over; none should open a Redis connection here.
vi.mock("bullmq", async (importOriginal) => {
  const actual = await importOriginal<typeof import("bullmq")>();
  const stub = function () {
    return anything();
  };
  return { ...actual, Queue: stub, QueueEvents: stub, FlowProducer: stub, Worker: stub };
});
vi.mock("../../utils/logger.js", () => ({
  log: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), trace: vi.fn(), debug: vi.fn() },
}));

import { documentIdempotencyHeader } from "../shared/idempotency.js";
import { EXTERNAL_V2_PREFIX, registerV2Modules } from "../v2/index.js";
import { recordV2Route, v2Routes } from "./catalog.js";
import { buildTools, routeKey, TOOL_NAMES, toRequest, type McpTool } from "./tools.js";

let tools: McpTool[] = [];

beforeAll(async () => {
  const app = Fastify();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  await app.register(
    async (v2) => {
      v2.addHook("onRoute", documentIdempotencyHeader);
      v2.addHook("onRoute", recordV2Route);
      registerV2Modules(v2);
    },
    { prefix: EXTERNAL_V2_PREFIX },
  );
  await app.ready();
  await app.close();
  tools = buildTools(v2Routes());
});

const tool = (name: string) => {
  const t = tools.find((x) => x.name === name);
  expect(t, name).toBeTruthy();
  return t!;
};

describe("MCP tools from the v2 routes", () => {
  test("every v2 route is named, and every name is a live route", () => {
    const keys = v2Routes().map(routeKey);
    expect(keys.filter((k) => !(k in TOOL_NAMES))).toEqual([]);
    expect(Object.keys(TOOL_NAMES).filter((k) => !keys.includes(k))).toEqual([]);
  });

  test("names are short snake_case, as MCP clients expect", () => {
    expect(tools.length).toBeGreaterThan(40);
    for (const t of tools) expect(t.name).toMatch(/^[a-z][a-z0-9_]{2,63}$/);
  });

  test("the multipart send is left out", () => {
    expect(tools.some((t) => t.route.url.endsWith("/send-with-file"))).toBe(false);
  });

  test("every tool carries the route's permission and an object input schema", () => {
    for (const t of tools) {
      expect(t.route.permissions.length, t.name).toBeGreaterThan(0);
      expect(t.inputSchema.type, t.name).toBe("object");
      expect(JSON.stringify(t.inputSchema), t.name).not.toContain("$schema");
    }
  });

  test("path params are required arguments; query params are flat; the body is nested", () => {
    const get = tool("contacts_get");
    expect(get.inputSchema.required).toEqual(["contactId"]);
    expect(get.annotations.readOnlyHint).toBe(true);

    const list = tool("contacts_list");
    expect(Object.keys(list.inputSchema.properties as object)).toEqual(
      expect.arrayContaining(["search", "cursor", "limit"]),
    );

    const create = tool("contacts_create");
    expect(create.inputSchema.required).toContain("body");
    expect(create.inputSchema.properties).toHaveProperty("idempotencyKey");
    expect(create.annotations.readOnlyHint).toBe(false);
  });

  test("hints: deletes and merges are destructive, sends are paid and open-world", () => {
    expect(tool("contacts_delete").annotations.destructiveHint).toBe(true);
    expect(tool("contacts_merge").annotations.destructiveHint).toBe(true);
    expect(tool("contacts_create").annotations.destructiveHint).toBe(false);
    for (const name of ["templates_send", "campaigns_send", "loyalty_send_card"]) {
      expect(tool(name).route.paid, name).toBe(true);
      expect(tool(name).annotations.openWorldHint, name).toBe(true);
    }
  });

  test("arguments become the v2 request", () => {
    const req = toRequest(tool("contacts_add_identity"), {
      contactId: "a/b",
      body: { kind: "EMAIL", value: "x@y.z" },
      idempotencyKey: "abc12345",
      stray: 1,
    });
    expect(req).toEqual({
      method: "POST",
      url: `${EXTERNAL_V2_PREFIX}/contacts/a%2Fb/identities`,
      query: {},
      body: { kind: "EMAIL", value: "x@y.z" },
      idempotencyKey: "abc12345",
    });

    const list = toRequest(tool("contacts_list"), { limit: 5, search: "ann", idempotencyKey: "k" });
    expect(list.query).toEqual({ limit: "5", search: "ann" });
    expect(list.idempotencyKey).toBeUndefined();

    expect(() => toRequest(tool("contacts_get"), {})).toThrow(/contactId/);
  });
});
