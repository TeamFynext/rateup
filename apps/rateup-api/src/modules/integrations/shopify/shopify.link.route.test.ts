import Fastify from "fastify";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/prisma.js", () => ({
  default: {
    shopifyCheckoutReminder: { findUnique: vi.fn(), updateMany: vi.fn(), update: vi.fn() },
  },
}));
vi.mock("../../../utils/rateLimit.js", () => ({
  rateLimit: () => async () => {},
}));

import prisma from "../../../utils/prisma.js";
import { shopifyLinkPublicRoutes, slugify, withUtm } from "./shopify.link.route.js";

type Mock = ReturnType<typeof vi.fn>;
const db = prisma as unknown as { shopifyCheckoutReminder: Record<string, Mock> };

const app = Fastify();
beforeAll(async () => {
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  await app.register(shopifyLinkPublicRoutes, { prefix: "/api/public/r" });
  await app.ready();
});
afterAll(() => app.close());

const CODE = "AbC123xYz9";
const RECOVER = "https://store.myshopify.com/checkouts/recover/42?key=abc";

beforeEach(() => {
  vi.clearAllMocks();
  db.shopifyCheckoutReminder.findUnique.mockResolvedValue({
    id: "rem-1",
    linkCode: CODE,
    rule: { name: "Abandoned checkout reminder" },
    checkout: { body: { abandoned_checkout_url: RECOVER } },
  });
});

describe("withUtm", () => {
  test("adds RateUp's tags and keeps the checkout's own parameters", () => {
    const url = new URL(withUtm(RECOVER, "cart-reminder", CODE));
    expect(url.searchParams.get("key")).toBe("abc");
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      utm_source: "rateup",
      utm_medium: "whatsapp",
      utm_campaign: "cart-reminder",
      utm_content: CODE,
    });
  });

  test("leaves tags the URL already carries", () => {
    const url = new URL(withUtm(`${RECOVER}&utm_source=email`, "x", CODE));
    expect(url.searchParams.getAll("utm_source")).toEqual(["email"]);
  });
});

test("slugify names a campaign from the rule name", () => {
  expect(slugify("Abandoned checkout — follow-up!")).toBe("abandoned-checkout-follow-up");
});

describe("GET /api/public/r/:code", () => {
  test("counts the tap and redirects to the tagged recovery URL", async () => {
    const res = await app.inject({ method: "GET", url: `/api/public/r/${CODE}` });

    expect(res.statusCode).toBe(302);
    const location = new URL(res.headers.location as string);
    expect(location.origin + location.pathname).toBe(
      "https://store.myshopify.com/checkouts/recover/42",
    );
    expect(location.searchParams.get("utm_campaign")).toBe("abandoned-checkout-reminder");
    expect(db.shopifyCheckoutReminder.updateMany).toHaveBeenCalledWith({
      where: { id: "rem-1", clickedAt: null },
      data: { clickedAt: expect.any(Date) },
    });
    expect(db.shopifyCheckoutReminder.update).toHaveBeenCalledWith({
      where: { id: "rem-1" },
      data: { clickCount: { increment: 1 } },
    });
  });

  test("an unknown code shows the expired page", async () => {
    db.shopifyCheckoutReminder.findUnique.mockResolvedValue(null);

    const res = await app.inject({ method: "GET", url: `/api/public/r/${CODE}` });

    expect(res.statusCode).toBe(410);
    expect(db.shopifyCheckoutReminder.update).not.toHaveBeenCalled();
  });

  test("a checkout whose details were forgotten shows the expired page", async () => {
    db.shopifyCheckoutReminder.findUnique.mockResolvedValue({
      id: "rem-1",
      linkCode: CODE,
      rule: { name: "x" },
      checkout: { body: {} },
    });

    const res = await app.inject({ method: "GET", url: `/api/public/r/${CODE}` });

    expect(res.statusCode).toBe(410);
  });

  test("a malformed code is refused before any lookup", async () => {
    const res = await app.inject({ method: "GET", url: "/api/public/r/short" });

    expect(res.statusCode).toBe(400);
    expect(db.shopifyCheckoutReminder.findUnique).not.toHaveBeenCalled();
  });
});
