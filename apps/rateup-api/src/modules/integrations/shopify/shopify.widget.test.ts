import Fastify from "fastify";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), trace: vi.fn(), debug: vi.fn() },
}));

const { graphql, redis } = vi.hoisted(() => ({
  graphql: { request: vi.fn() },
  redis: { get: vi.fn(), set: vi.fn() },
}));
vi.mock("./shopify.config.js", () => ({
  default: {
    clients: {
      Graphql: class {
        request = graphql.request;
      },
    },
  },
}));
vi.mock("./shopify.session.js", () => ({
  getActiveShopifySession: vi.fn(async () => ({ shop: "demo.myshopify.com" })),
}));
vi.mock("../../../utils/redisConnection.js", () => ({ default: redis }));
vi.mock("../../../utils/rateLimit.js", () => ({
  rateLimit: () => async () => {},
}));
vi.mock("../../../utils/prisma.js", () => ({
  default: {
    integration: { findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn() },
    channel: { findFirst: vi.fn() },
    shopifyWidgetStat: { upsert: vi.fn(), aggregate: vi.fn() },
    $executeRaw: vi.fn(),
  },
}));

import prisma from "../../../utils/prisma.js";
import { widgetEventHandler } from "./shopify.controller.js";
import {
  shopifyWidgetEventSchema,
  shopifyWidgetSchema,
  type ShopifyWidgetSettings,
} from "./shopify.schema.js";
import {
  buildWidgetPayload,
  DEFAULT_WIDGET_SETTINGS,
  saveWidgetSettings,
  ShopifyWidgetError,
  syncWidgetMetafield,
  WIDGET_EVENT_ROUTE,
} from "./shopify.widget.js";

type Mock = ReturnType<typeof vi.fn>;
const db = prisma as unknown as {
  integration: { findUnique: Mock; findFirst: Mock; findMany: Mock };
  channel: { findFirst: Mock };
  shopifyWidgetStat: { upsert: Mock; aggregate: Mock };
  $executeRaw: Mock;
};

const ORG = "0b0e6c7e-2f0a-4f6e-9d55-0a4b1f0c0001";
const CHANNEL = "0b0e6c7e-2f0a-4f6e-9d55-0a4b1f0c0002";
const SHOP = "demo.myshopify.com";

const settings: ShopifyWidgetSettings = {
  ...DEFAULT_WIDGET_SETTINGS,
  enabled: true,
  channelId: CHANNEL,
};

function integration(widget?: ShopifyWidgetSettings) {
  return {
    id: "int-1",
    orgId: ORG,
    active: true,
    credential: { session: { shop: SHOP }, isWebhookRegistered: true, shopifySurveys: [], widget },
  } as unknown as ShopifyIntegration;
}

const connectedChannel = {
  status: "ACTIVE",
  whatsapp: { phone: "+91 98765-43210", status: "ACTIVE" },
};

/** The payload the last `metafieldsSet` call wrote. */
function writtenMetafield() {
  const call = graphql.request.mock.calls.find(([query]) =>
    String(query).includes("metafieldsSet"),
  );
  const [metafield] = call?.[1].variables.metafields ?? [];
  return { ...metafield, value: JSON.parse(metafield.value) };
}

beforeEach(() => {
  vi.clearAllMocks();
  redis.get.mockResolvedValue(null);
  db.integration.findUnique.mockResolvedValue(integration());
  db.channel.findFirst.mockResolvedValue(connectedChannel);
  graphql.request.mockImplementation(async (query: string) =>
    query.includes("currentAppInstallation")
      ? { data: { currentAppInstallation: { id: "gid://shopify/AppInstallation/1" } } }
      : { data: { metafieldsSet: { userErrors: [] } } },
  );
});

describe("shopifyWidgetSchema", () => {
  test("accepts the defaults", () => {
    expect(shopifyWidgetSchema.safeParse(DEFAULT_WIDGET_SETTINGS).success).toBe(true);
  });

  test("refuses to switch on without a number", () => {
    const result = shopifyWidgetSchema.safeParse({ ...settings, channelId: null });
    expect(result.success).toBe(false);
  });

  test.each([
    ["a colour that isn't a hex code", { color: "red" }],
    ["an unknown page", { showOn: ["checkout"] }],
    ["no pages at all", { showOn: [] }],
    ["an offset the script would ignore", { offsetY: 401 }],
    ["an over-long greeting", { greeting: "x".repeat(301) }],
  ])("refuses %s", (_name, patch) => {
    expect(shopifyWidgetSchema.safeParse({ ...settings, ...patch }).success).toBe(false);
  });
});

describe("shopifyWidgetEventSchema", () => {
  test("reads the text/plain body sendBeacon sends", () => {
    const body = JSON.stringify({ shop: SHOP, event: "click", pageType: "product" });
    expect(shopifyWidgetEventSchema.parse(body)).toEqual({
      shop: SHOP,
      event: "click",
      pageType: "product",
    });
  });

  test("files an unknown or missing page type under other", () => {
    expect(
      shopifyWidgetEventSchema.parse({ shop: SHOP, event: "open", pageType: "x".repeat(20) }),
    ).toMatchObject({ pageType: "other" });
    expect(shopifyWidgetEventSchema.parse({ shop: SHOP, event: "open" })).toMatchObject({
      pageType: "other",
    });
  });

  test.each([
    ["a shop that isn't a myshopify domain", { shop: "evil.example.com", event: "open" }],
    ["an unknown event", { shop: SHOP, event: "view" }],
    ["a body that isn't JSON", "not json"],
  ])("refuses %s", (_name, body) => {
    expect(shopifyWidgetEventSchema.safeParse(body).success).toBe(false);
  });
});

describe("buildWidgetPayload", () => {
  test("carries the number and no internal id", () => {
    const payload = buildWidgetPayload(settings, "919876543210");
    expect(payload).toMatchObject({ enabled: true, phone: "919876543210" });
    expect(payload.eventUrl.endsWith(WIDGET_EVENT_ROUTE)).toBe(true);
    expect(JSON.stringify(payload)).not.toContain(CHANNEL);
    expect(payload).not.toHaveProperty("channelId");
  });

  test("switches the button off when the number is gone", () => {
    expect(buildWidgetPayload(settings, null)).toMatchObject({ enabled: false, phone: "" });
  });
});

describe("saveWidgetSettings", () => {
  test("stores the settings and writes the public payload to the app's metafield", async () => {
    await saveWidgetSettings(ORG, settings);

    expect(db.$executeRaw).toHaveBeenCalledTimes(1);
    const metafield = writtenMetafield();
    expect(metafield).toMatchObject({
      ownerId: "gid://shopify/AppInstallation/1",
      namespace: "rateup",
      key: "widget",
      type: "json",
    });
    expect(metafield.value).toMatchObject({ enabled: true, phone: "919876543210" });
    expect(metafield.value).not.toHaveProperty("channelId");
  });

  test.each([
    ["a disconnected channel", { ...connectedChannel, status: "DISCONNECTED" }],
    [
      "a disconnected number",
      { status: "ACTIVE", whatsapp: { phone: "1", status: "DISCONNECTED" } },
    ],
    ["a channel of another org or platform", null],
  ])("rejects %s and saves nothing", async (_name, channel) => {
    db.channel.findFirst.mockResolvedValue(channel);

    await expect(saveWidgetSettings(ORG, settings)).rejects.toMatchObject({ status: 400 });
    expect(db.$executeRaw).not.toHaveBeenCalled();
    expect(graphql.request).not.toHaveBeenCalled();
  });

  test("looks the channel up inside the org, among WhatsApp channels", async () => {
    await saveWidgetSettings(ORG, settings);
    expect(db.channel.findFirst.mock.calls[0][0].where).toEqual({
      id: CHANNEL,
      orgId: ORG,
      platform: "WHATSAPP",
    });
  });

  test("can still be switched off after its number is disconnected", async () => {
    db.channel.findFirst.mockResolvedValue(null);

    await saveWidgetSettings(ORG, { ...settings, enabled: false });

    expect(db.$executeRaw).toHaveBeenCalledTimes(1);
    expect(writtenMetafield().value).toMatchObject({ enabled: false, phone: "" });
  });

  test("needs a connected store", async () => {
    db.integration.findUnique.mockResolvedValue(null);
    await expect(saveWidgetSettings(ORG, settings)).rejects.toMatchObject({ status: 404 });
  });

  test("keeps the settings and says so when Shopify refuses the metafield", async () => {
    graphql.request.mockImplementation(async (query: string) =>
      query.includes("currentAppInstallation")
        ? { data: { currentAppInstallation: { id: "gid://shopify/AppInstallation/1" } } }
        : { data: { metafieldsSet: { userErrors: [{ field: null, message: "nope" }] } } },
    );

    const error = await saveWidgetSettings(ORG, settings).catch((e) => e);
    expect(error).toBeInstanceOf(ShopifyWidgetError);
    expect(error.status).toBe(502);
    expect(db.$executeRaw).toHaveBeenCalledTimes(1);
  });
});

test("syncWidgetMetafield leaves a shop whose widget was never saved alone", async () => {
  await syncWidgetMetafield(integration());
  expect(graphql.request).not.toHaveBeenCalled();
});

describe("POST widget/event", () => {
  const app = Fastify();
  beforeAll(async () => {
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);
    app.post("/event", { schema: { body: shopifyWidgetEventSchema } }, widgetEventHandler);
    await app.ready();
  });
  afterAll(() => app.close());

  const send = (body: unknown) =>
    app.inject({
      method: "POST",
      url: "/event",
      headers: { "content-type": "text/plain;charset=UTF-8" },
      payload: JSON.stringify(body),
    });

  test("counts a tap for an active, claimed shop", async () => {
    db.integration.findFirst.mockResolvedValue({ orgId: ORG });

    const response = await send({ shop: SHOP, event: "click", pageType: "product" });

    expect(response.statusCode).toBe(204);
    expect(db.integration.findFirst.mock.calls[0][0].where).toMatchObject({
      active: true,
      orgId: { not: null },
      credential: { path: ["session", "shop"], equals: SHOP },
    });
    const upsert = db.shopifyWidgetStat.upsert.mock.calls[0][0];
    expect(upsert.where.orgId_date_pageType_provider).toMatchObject({
      orgId: ORG,
      pageType: "product",
      provider: "shopify",
    });
    expect(upsert.create).toMatchObject({
      orgId: ORG,
      pageType: "product",
      provider: "shopify",
      clicks: 1,
    });
    expect(upsert.update).toEqual({ clicks: { increment: 1 } });
  });

  test("counts an open in its own column", async () => {
    db.integration.findFirst.mockResolvedValue({ orgId: ORG });
    await send({ shop: SHOP, event: "open", pageType: "index" });
    expect(db.shopifyWidgetStat.upsert.mock.calls[0][0].update).toEqual({
      opens: { increment: 1 },
    });
  });

  test("rejects an unknown or unclaimed shop", async () => {
    db.integration.findFirst.mockResolvedValue(null);

    const response = await send({ shop: SHOP, event: "click", pageType: "product" });

    expect(response.statusCode).toBe(404);
    expect(db.shopifyWidgetStat.upsert).not.toHaveBeenCalled();
  });

  test("remembers a shop's org between taps", async () => {
    redis.get.mockResolvedValue(ORG);

    const response = await send({ shop: SHOP, event: "click", pageType: "cart" });

    expect(response.statusCode).toBe(204);
    expect(db.integration.findFirst).not.toHaveBeenCalled();
  });

  test("rejects a malformed body", async () => {
    const response = await send({ shop: "evil.example.com", event: "click" });
    expect(response.statusCode).toBe(400);
    expect(db.shopifyWidgetStat.upsert).not.toHaveBeenCalled();
  });
});
