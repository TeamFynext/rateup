import Fastify from "fastify";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";
import { describe, expect, test, vi } from "vitest";

interface Limiter {
  key: string;
  max: number;
  keyFrom?: (r: unknown) => string | null | undefined;
}
const limiters = vi.hoisted(() => [] as Limiter[]);

vi.mock("../../../utils/rateLimit.js", () => ({
  rateLimit: (opts: Limiter) => {
    limiters.push(opts);
    return async () => undefined;
  },
  clientIp: (r: { ip: string }) => r.ip,
}));
vi.mock("../../../utils/prisma.js", () => ({ default: {} }));
vi.mock("./checkout.service.js", () => ({}));
vi.mock("./payments/payments.service.js", () => ({}));
vi.mock("./recovery.service.js", () => ({}));
vi.mock("./returns.service.js", () => ({}));
vi.mock("./invoice.service.js", () => ({}));
vi.mock("./shipping.service.js", () => ({}));
vi.mock("./storefront.service.js", () => ({}));
vi.mock("./store.service.js", () => ({}));

const { shopPublicRoutes } = await import("./shop.public.route.js");

describe("guessing coupon codes on the hosted checkout", () => {
  test("is limited per checkout and per visitor, counting only requests with a code", async () => {
    const app = Fastify();
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);
    await app.register(shopPublicRoutes);
    await app.ready();

    const byToken = limiters.find((l) => l.key === "shopCouponToken")!;
    const byIp = limiters.find((l) => l.key === "shopCouponIp")!;
    expect(byToken.max).toBeLessThanOrEqual(10);
    expect(byIp.max).toBeLessThanOrEqual(30);

    const withCode = {
      params: { token: "tok-1234567890" },
      body: { discountCode: "SAVE" },
      ip: "1.2.3.4",
    };
    const without = {
      params: { token: "tok-1234567890" },
      body: { shippingRateId: "r" },
      ip: "1.2.3.4",
    };
    expect(byToken.keyFrom!(withCode)).toBe("tok-1234567890");
    expect(byIp.keyFrom!(withCode)).toBe("1.2.3.4");
    expect(byToken.keyFrom!(without)).toBeNull();
    expect(byIp.keyFrom!(without)).toBeNull();
    await app.close();
  });
});
