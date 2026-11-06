import Fastify, { type RouteOptions } from "fastify";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";
import { describe, expect, test, vi } from "vitest";

/** Routes are captured as they register; nothing is called, so the mocks only let modules load. */
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

vi.mock("../../../utils/prisma.js", () => ({ default: anything(), excludeFields: vi.fn() }));
vi.mock("../../../utils/redisConnection.js", () => ({ default: anything() }));
vi.mock("bullmq", async (importOriginal) => {
  const actual = await importOriginal<typeof import("bullmq")>();
  const stub = function () {
    return anything();
  };
  return { ...actual, Queue: stub, QueueEvents: stub, FlowProducer: stub, Worker: stub };
});
vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), trace: vi.fn(), debug: vi.fn() },
}));

const { shopRoutes } = await import("./shop.route.js");
const { returnActionSchema } = await import("./shop.schema.js");

async function routes() {
  const app = Fastify();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  const seen: RouteOptions[] = [];
  app.addHook("onRoute", (r) => void seen.push(r));
  await app.register(shopRoutes, { prefix: "/api/shop" });
  await app.ready();
  return seen;
}

describe("shop money routes", () => {
  test("refunds need the payments permission, whichever route they go through", async () => {
    const all = await routes();
    const permission = (method: string, url: string) =>
      (all.find((r) => r.method === method && r.url === url)?.config as { permission?: string })
        ?.permission;
    expect(permission("POST", "/api/shop/orders/:id/refund")).toBe("commerce.payments.manage");
    expect(permission("POST", "/api/shop/returns/:id/refund")).toBe("commerce.payments.manage");
    expect(returnActionSchema.safeParse({ action: "refund" }).success).toBe(false);
  });
});
