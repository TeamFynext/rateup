import { describe, expect, test, vi } from "vitest";

vi.mock("./subscription.controller.js", () => ({
  getAllSubscriptionsHandler: vi.fn(),
  getMessageStatsHandler: vi.fn(),
  getSubscriptionHandler: vi.fn(),
  getUserSubscriptionHandler: vi.fn(),
  updateSubscriptionHandler: vi.fn(),
}));
vi.mock("../../utils/auth.js", () => ({ assertRootOrg: vi.fn() }));
vi.mock("../../authz/registry.js", () => ({ declareAccess: vi.fn() }));

import { assertRootOrg } from "../../utils/auth.js";
import { subscriptionRoutes } from "./subscription.route.js";

interface Registered {
  method: string;
  url: string;
  opts: any;
}

async function collectRoutes(): Promise<Registered[]> {
  const routes: Registered[] = [];
  const record = (method: string) => (url: string, opts: any, handler?: unknown) =>
    routes.push({ method, url, opts: handler ? opts : {} });
  const server: any = {
    get: vi.fn(record("GET")),
    post: vi.fn(record("POST")),
    put: vi.fn(record("PUT")),
    delete: vi.fn(record("DELETE")),
    patch: vi.fn(record("PATCH")),
    addHook: vi.fn(),
    register: vi.fn(),
  };
  await subscriptionRoutes(server);
  return routes;
}

function preHandlers(route: Registered): unknown[] {
  const pre = route.opts.preHandler;
  return Array.isArray(pre) ? pre : pre ? [pre] : [];
}

describe("subscription routes", () => {
  // A route that takes an org id in the URL answers for that org whatever the caller's own
  // org is; without the root gate any signed-in user could read or rewrite another tenant's plan.
  test("every route naming an :orgId requires the root org", async () => {
    const routes = await collectRoutes();
    const byOrg = routes.filter((r) => r.url.includes(":orgId"));
    expect(byOrg.length).toBeGreaterThan(0);
    for (const route of byOrg) {
      expect(preHandlers(route), `${route.method} ${route.url}`).toContain(assertRootOrg);
    }
  });

  test("GET /message-stats/:orgId is root-gated", async () => {
    const routes = await collectRoutes();
    const stats = routes.find((r) => r.method === "GET" && r.url === "/message-stats/:orgId");
    expect(stats).toBeDefined();
    expect(preHandlers(stats!)).toContain(assertRootOrg);
  });

  // It let any session rewrite any org's plan, features and expiry, and nothing called it.
  test("PUT /menu/:orgId is gone", async () => {
    const routes = await collectRoutes();
    expect(routes.some((r) => r.url.startsWith("/menu"))).toBe(false);
  });

  test("GET / (the caller's own subscription) stays open to any session", async () => {
    const routes = await collectRoutes();
    const own = routes.find((r) => r.method === "GET" && r.url === "/");
    expect(own).toBeDefined();
    expect(preHandlers(own!)).not.toContain(assertRootOrg);
  });
});
