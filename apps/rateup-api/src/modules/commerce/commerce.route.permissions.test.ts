import Fastify, { type RouteOptions } from "fastify";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";
import { describe, expect, test, vi } from "vitest";

vi.mock("./commerce.controller.js", () => ({
  exportCommerceOrdersHandler: vi.fn(),
  exportCommerceOverviewHandler: vi.fn(),
  getCommerceChannelsHandler: vi.fn(),
  getCommerceOrdersHandler: vi.fn(),
  getCommerceOverviewHandler: vi.fn(),
  getCommerceTimeseriesHandler: vi.fn(),
  getCommerceTopProductsHandler: vi.fn(),
}));

const { commerceRoutes } = await import("./commerce.route.js");

describe("/api/commerce", () => {
  test("reads need commerce access, and exports of buyers' details need order management", async () => {
    const app = Fastify();
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);
    const seen: RouteOptions[] = [];
    app.addHook("onRoute", (r) => void seen.push(r));
    await app.register(commerceRoutes, { prefix: "/api/commerce" });
    await app.ready();

    const permissions = Object.fromEntries(
      seen
        .filter((r) => r.method !== "HEAD")
        .map((r) => [
          `${String(r.method)} ${r.url}`,
          (r.config as { permission?: string; access?: string }).permission ??
            (r.config as { access?: string }).access,
        ]),
    );
    expect(permissions).toEqual({
      "GET /api/commerce/channels": "commerce.read",
      "GET /api/commerce/overview": "commerce.read",
      "GET /api/commerce/overview/timeseries": "commerce.read",
      "GET /api/commerce/overview/top-products": "commerce.read",
      "GET /api/commerce/orders": "commerce.read",
      "POST /api/commerce/export/orders": "commerce.orders.manage",
      "POST /api/commerce/export/overview": "commerce.orders.manage",
    });
  });
});
