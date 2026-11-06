import formbody from "@fastify/formbody";
import Fastify from "fastify";
import { describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/prisma.js", () => ({
  default: { integration: { findUnique: vi.fn(async () => null) } },
}));
vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}));
vi.mock("../providers/registry.js", () => ({ getIntegrationProvider: vi.fn() }));
vi.mock("../../../workers/bullmq/queues/index.js", () => ({
  integrationTriggerQueue: { add: vi.fn() },
}));

import { hubSpotPublicRoutes } from "../hubspot/hubspot.route.js";
import { inboundWebhookRoutes } from "./inboundWebhook.js";

// The app registers `@fastify/formbody` server-wide (plugins/index.ts) before the
// integration routes; a second parser for form posts used to stop the server at boot.
describe("the inbound receiver's routes, mounted as the app mounts them", () => {
  test("register beside the app's own form parser, and still accept a form post", async () => {
    const server = Fastify();
    await server.register(formbody);
    await server.register(inboundWebhookRoutes, { prefix: "/webhooks" });
    await expect(server.ready()).resolves.toBeDefined();

    const response = await server.inject({
      method: "POST",
      url: "/webhooks/woocommerce/not-a-uuid",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      payload: "webhook_id=102",
    });
    // Parsed and routed (an unknown integration is a 404), not refused as a 415.
    expect(response.statusCode).toBe(404);
  });

  test("register on a bare server too, bringing their own form parser", async () => {
    const server = Fastify();
    await server.register(inboundWebhookRoutes, { prefix: "/webhooks" });
    const response = await server.inject({
      method: "POST",
      url: "/webhooks/woocommerce/not-a-uuid",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      payload: "webhook_id=102",
    });
    expect(response.statusCode).toBe(404);
  });

  test("boot beside HubSpot's webhook route, each with its own raw body", async () => {
    const server = Fastify();
    await server.register(formbody);
    await server.register(inboundWebhookRoutes, { prefix: "/webhooks" });
    await server.register(hubSpotPublicRoutes, { prefix: "/hubspot" });
    await expect(server.ready()).resolves.toBeDefined();
  });
});
