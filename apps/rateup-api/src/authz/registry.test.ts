import { afterEach, describe, expect, test, vi } from "vitest";

vi.mock("../utils/logger.js", () => ({ log: { warn: vi.fn(), error: vi.fn() } }));

import {
  classifyRoute,
  declareAccess,
  describeRoute,
  registerAuthzRouteRegistry,
} from "./registry.js";

const route = (url: string, config: Record<string, unknown> = {}, method = "GET") =>
  ({ method, url, config }) as any;

afterEach(() => {
  delete process.env.AUTHZ_STRICT;
});

describe("classifyRoute", () => {
  test("a permission implies a session and counts as declared", () => {
    const r = route("/api/team", { permission: "teams.manage" }, "POST");
    expect(classifyRoute(r)).toBe("declared");
    expect(r.config.access).toBe("session");
  });

  test("an explicit access is declared as is", () => {
    const r = route("/api/org", { access: "session" }, "POST");
    expect(classifyRoute(r)).toBe("declared");
    expect(r.config.access).toBe("session");
  });

  test("public, health and the isPublic flag are tagged public", () => {
    for (const r of [
      route("/api/public/survey/:id"),
      route("/api/health"),
      route("/api/linktrees/:slug", { isPublic: true }),
    ]) {
      expect(classifyRoute(r)).toBe("tagged");
      expect(r.config.access).toBe("public");
    }
  });

  test("isPublic must be exactly true", () => {
    expect(classifyRoute(route("/api/linktrees/:slug", { isPublic: "true" }))).toBe("undeclared");
  });

  test("the external token API is tagged token", () => {
    const r = route("/api/external/v1/:orgId/contacts");
    expect(classifyRoute(r)).toBe("tagged");
    expect(r.config.access).toBe("token");
  });

  test("anything else under /api with no declaration is undeclared and left alone", () => {
    const r = route("/api/wa/settings", {}, "PUT");
    expect(classifyRoute(r)).toBe("undeclared");
    expect(r.config.access).toBeUndefined();
  });

  test("routes outside /api (docs, root) are not the registry's business", () => {
    expect(classifyRoute(route("/docs"))).toBe("declared");
  });

  test("a route with no config object gets one", () => {
    const r = { method: "GET", url: "/api/public/x" } as any;
    classifyRoute(r);
    expect(r.config).toEqual({ access: "public" });
  });
});

describe("registerAuthzRouteRegistry", () => {
  function fakeServer() {
    const hooks: Record<string, Function[]> = {};
    return {
      hooks,
      addHook: vi.fn((name: string, fn: Function) => {
        (hooks[name] ??= []).push(fn);
      }),
    };
  }

  test("in strict mode an undeclared /api route refuses to boot at ready, naming the route", async () => {
    process.env.AUTHZ_STRICT = "1";
    const server = fakeServer();
    registerAuthzRouteRegistry(server as any);
    const onRoute = server.hooks.onRoute[0];
    onRoute(route("/api/wa/settings", {}, "PUT"));
    onRoute(route("/api/wa/settings", { permission: "channels.manage" }, "POST"));
    onRoute(route("/api/public/x"));
    await expect(server.hooks.onReady[0]()).rejects.toThrow(
      /1 route\(s\) declare neither[\s\S]*PUT \/api\/wa\/settings/,
    );
  });

  test("a module default applied after the root hook saw the route still counts", async () => {
    process.env.AUTHZ_STRICT = "1";
    const server = fakeServer();
    registerAuthzRouteRegistry(server as any);
    const r = route("/api/wa/settings", {}, "PUT");
    server.hooks.onRoute[0](r);
    r.config.access = "session";
    await expect(server.hooks.onReady[0]()).resolves.toBeUndefined();
  });

  test("outside strict mode undeclared routes are reported once at ready", async () => {
    const server = fakeServer();
    registerAuthzRouteRegistry(server as any);
    const onRoute = server.hooks.onRoute[0];
    onRoute(route("/api/wa/settings", {}, "PUT"));
    onRoute(route("/api/wa/webhook", {}, "POST"));
    const { log } = await import("../utils/logger.js");
    await server.hooks.onReady[0]();
    expect(log.warn).toHaveBeenCalledWith(
      { count: 2, routes: ["PUT /api/wa/settings", "POST /api/wa/webhook"] },
      expect.stringContaining("without an access declaration"),
    );
  });

  test("describeRoute joins multi-method routes", () => {
    expect(describeRoute({ method: ["GET", "HEAD"], url: "/api/x" } as any)).toBe(
      "GET|HEAD /api/x",
    );
  });
});

describe("declareAccess", () => {
  function moduleServer() {
    const hooks: Function[] = [];
    return { hooks, addHook: vi.fn((_: string, fn: Function) => hooks.push(fn)) };
  }

  test("fills a session default only where the route says nothing", () => {
    const server = moduleServer();
    declareAccess(server as any, { access: "session" });
    const plain = route("/api/org/x", {}, "POST");
    const pub = route("/api/org/y", { access: "public" }, "POST");
    const perm = route("/api/org/z", { permission: "org.settings" }, "PUT");
    for (const r of [plain, pub, perm]) server.hooks[0](r);
    expect(plain.config).toEqual({ access: "session" });
    expect(pub.config).toEqual({ access: "public" });
    expect(perm.config).toEqual({ permission: "org.settings" });
  });

  test("read/write defaults pick by method and imply a session", () => {
    const server = moduleServer();
    declareAccess(server as any, { read: "inbox.read", write: "inbox.reply" });
    const get = route("/api/wa/inbox/:id", {}, "GET");
    const head = { method: ["GET", "HEAD"], url: "/api/wa/inbox", config: {} } as any;
    const post = route("/api/wa/inbox/:id", {}, "POST");
    const own = route("/api/wa/inbox/assign", { permission: "inbox.assign" }, "POST");
    for (const r of [get, head, post, own]) server.hooks[0](r);
    expect(get.config).toEqual({ permission: "inbox.read", access: "session" });
    expect(head.config).toEqual({ permission: "inbox.read", access: "session" });
    expect(post.config).toEqual({ permission: "inbox.reply", access: "session" });
    expect(own.config).toEqual({ permission: "inbox.assign" });
  });
});
