import Fastify from "fastify";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}));
vi.mock("../../../utils/prisma.js", () => ({
  default: {
    integration: { findUnique: vi.fn(), findFirst: vi.fn() },
    channel: { findFirst: vi.fn() },
    shopifyWidgetStat: { aggregate: vi.fn(), upsert: vi.fn() },
    $executeRaw: vi.fn(),
  },
}));
vi.mock("../../../utils/redisConnection.js", () => ({
  default: { get: vi.fn(), set: vi.fn() },
}));
vi.mock("../../../utils/rateLimit.js", () => ({
  rateLimit: () => async () => {},
}));
vi.mock("./woocommerce.plugin.js", () => ({ syncWooPluginConnection: vi.fn() }));

import prisma from "../../../utils/prisma.js";
import redis from "../../../utils/redisConnection.js";
import { DEFAULT_WIDGET_SETTINGS } from "../commerce/storeWidget.js";
import { syncWooPluginConnection } from "./woocommerce.plugin.js";
import { wooCommercePublicRoutes } from "./woocommerce.route.js";
import { checkWooPlugin, getWooWidget, saveWooWidget } from "./woocommerce.widget.js";

type Mock = ReturnType<typeof vi.fn>;
const db = prisma as unknown as {
  integration: { findUnique: Mock; findFirst: Mock };
  channel: { findFirst: Mock };
  shopifyWidgetStat: { aggregate: Mock; upsert: Mock };
  $executeRaw: Mock;
};
const cache = redis as unknown as { get: Mock; set: Mock };
const push = syncWooPluginConnection as unknown as Mock;

const ORG = "11111111-1111-4111-8111-111111111111";
const CHANNEL = "22222222-2222-4222-8222-222222222222";
const KEY = "AbCdEfGhIjKlMnOpQrStUv";

const connected = (credential: Record<string, unknown> = {}) => ({
  id: "int-1",
  orgId: ORG,
  name: "woocommerce",
  active: true,
  credential: {
    storeUrl: "https://shop.example.com",
    consumerKey: "ck",
    consumerSecret: "cs",
    webhookSecret: "secret",
    webhooks: [],
    connectedAt: "2026-10-17T06:00:00.000Z",
    ...credential,
  },
});

const settings = (over: Partial<typeof DEFAULT_WIDGET_SETTINGS> = {}) => ({
  ...DEFAULT_WIDGET_SETTINGS,
  enabled: true,
  channelId: CHANNEL,
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  db.integration.findUnique.mockResolvedValue(connected());
  db.channel.findFirst.mockResolvedValue({
    status: "ACTIVE",
    whatsapp: { phone: "+91 98765 43210", status: "ACTIVE" },
  });
  db.shopifyWidgetStat.aggregate.mockResolvedValue({ _sum: { opens: 4, clicks: 3 } });
  cache.get.mockResolvedValue(null);
  push.mockResolvedValue("installed");
});

describe("the settings page", () => {
  test("shows defaults until the button is saved, and only this store's taps", async () => {
    const view = await getWooWidget(ORG);

    expect(view).toMatchObject({
      settings: DEFAULT_WIDGET_SETTINGS,
      configured: false,
      plugin: null,
      stats: { days: 30, opens: 4, clicks: 3 },
    });
    expect(db.shopifyWidgetStat.aggregate.mock.calls[0][0].where).toMatchObject({
      orgId: ORG,
      provider: "woocommerce",
    });
  });

  test("a store that isn't connected is a 404", async () => {
    db.integration.findUnique.mockResolvedValue(null);
    await expect(getWooWidget(ORG)).rejects.toMatchObject({ status: 404 });
  });
});

describe("saving the button", () => {
  test("stores the settings with a new tap key, then pushes them to the plugin", async () => {
    await saveWooWidget(ORG, settings());

    expect(db.$executeRaw).toHaveBeenCalledTimes(1);
    const pushed = push.mock.calls[0][0];
    expect(pushed.credential.widget).toEqual(settings());
    expect(pushed.credential.widgetKey).toMatch(/^[A-Za-z0-9_-]{22}$/);
  });

  test("keeps the store's existing tap key", async () => {
    db.integration.findUnique.mockResolvedValue(connected({ widgetKey: KEY }));

    await saveWooWidget(ORG, settings());

    expect(push.mock.calls[0][0].credential.widgetKey).toBe(KEY);
  });

  test("refuses to switch on with a number that isn't connected", async () => {
    db.channel.findFirst.mockResolvedValue(null);

    await expect(saveWooWidget(ORG, settings())).rejects.toMatchObject({ status: 400 });
    expect(db.$executeRaw).not.toHaveBeenCalled();
  });

  test("can still switch off after the number is gone", async () => {
    db.channel.findFirst.mockResolvedValue(null);
    await expect(saveWooWidget(ORG, settings({ enabled: false }))).resolves.toBeDefined();
  });

  test("a store without the plugin saves fine; the page says to install it", async () => {
    push.mockResolvedValue("absent");
    await expect(saveWooWidget(ORG, settings())).resolves.toBeDefined();
  });

  test("a store that can't be reached is a 502, with the settings kept", async () => {
    push.mockResolvedValue("failed");

    await expect(saveWooWidget(ORG, settings())).rejects.toMatchObject({ status: 502 });
    expect(db.$executeRaw).toHaveBeenCalledTimes(1);
  });

  test("'Check again' pushes now", async () => {
    await checkWooPlugin(ORG);
    expect(push).toHaveBeenCalledTimes(1);
  });
});

describe("taps from the storefront", () => {
  const server = Fastify();
  beforeAll(async () => {
    server.setValidatorCompiler(validatorCompiler);
    server.setSerializerCompiler(serializerCompiler);
    await server.register(wooCommercePublicRoutes);
    await server.ready();
  });
  afterAll(() => server.close());

  // As `sendBeacon` sends it: a JSON string as text/plain.
  const send = (body: Record<string, unknown>) =>
    server.inject({
      method: "POST",
      url: "/widget/event",
      headers: { "content-type": "text/plain;charset=UTF-8" },
      payload: JSON.stringify(body),
    });

  test("counts a tap for the store holding the key", async () => {
    db.integration.findFirst.mockResolvedValue({ orgId: ORG });

    const response = await send({ key: KEY, event: "click", pageType: "product" });

    expect(response.statusCode).toBe(204);
    expect(db.integration.findFirst.mock.calls[0][0].where).toMatchObject({
      name: "woocommerce",
      active: true,
      credential: { path: ["widgetKey"], equals: KEY },
    });
    const upsert = db.shopifyWidgetStat.upsert.mock.calls[0][0];
    expect(upsert.where.orgId_date_pageType_provider).toMatchObject({
      orgId: ORG,
      pageType: "product",
      provider: "woocommerce",
    });
    expect(upsert.update).toEqual({ clicks: { increment: 1 } });
  });

  test("an unknown page type is counted as other", async () => {
    db.integration.findFirst.mockResolvedValue({ orgId: ORG });
    await send({ key: KEY, event: "open", pageType: "my-account" });
    expect(db.shopifyWidgetStat.upsert.mock.calls[0][0].create).toMatchObject({
      pageType: "other",
      opens: 1,
    });
  });

  test("a key no store holds is a 404 and counts nothing", async () => {
    db.integration.findFirst.mockResolvedValue(null);

    const response = await send({ key: KEY, event: "click", pageType: "home" });

    expect(response.statusCode).toBe(404);
    expect(db.shopifyWidgetStat.upsert).not.toHaveBeenCalled();
  });

  test("remembers a key's org between taps", async () => {
    cache.get.mockResolvedValue(ORG);

    expect((await send({ key: KEY, event: "click", pageType: "cart" })).statusCode).toBe(204);
    expect(db.integration.findFirst).not.toHaveBeenCalled();
  });

  test("rejects a malformed body", async () => {
    const response = await send({ key: "short", event: "click" });
    expect(response.statusCode).toBe(400);
    expect(db.shopifyWidgetStat.upsert).not.toHaveBeenCalled();
  });
});
