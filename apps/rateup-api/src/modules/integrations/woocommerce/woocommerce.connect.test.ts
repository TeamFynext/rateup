import { createHmac, randomBytes } from "node:crypto";

import Fastify from "fastify";
import { beforeAll, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}));
vi.mock("../../../utils/prisma.js", () => ({
  default: { integration: { findUnique: vi.fn(), upsert: vi.fn(), update: vi.fn() } },
}));
vi.mock("../../../workers/bullmq/queues/index.js", () => ({
  integrationTriggerQueue: { add: vi.fn() },
}));
vi.mock("../shared/integrationHealth.js", () => ({
  recordIntegrationFailure: vi.fn(),
  markIntegrationHealthy: vi.fn(),
}));
vi.mock("node:dns/promises", () => ({
  lookup: vi.fn(async () => [{ address: "203.0.113.10", family: 4 }]),
}));

// A fake store behind axios: the REST index, system status, settings and webhooks.
const store = vi.hoisted(() => ({
  webhooks: new Map<number, Record<string, unknown>>(),
  nextId: 100,
  rejectBasic: false,
  failCreate: false,
  index: { name: "Demo Store", namespaces: ["wp/v2", "wc/v3"] } as Record<string, unknown>,
}));

vi.mock("axios", () => {
  const axiosError = (status: number) =>
    Object.assign(new Error(`HTTP ${status}`), { isAxiosError: true, response: { status } });

  const client = (config: { auth?: unknown }) => {
    const authed = config.auth ? !store.rejectBasic : true;
    const webhookId = (url: string) => Number(/^\/webhooks\/(\d+)$/.exec(url)?.[1]);
    return {
      config,
      get: vi.fn(async (url: string) => {
        if (!authed) throw axiosError(401);
        if (url === "/system_status") {
          return { data: { environment: { version: "9.3.1" }, settings: { currency: "INR" } } };
        }
        if (url.startsWith("/settings/general/")) return { data: { value: "IN:KL" } };
        const hook = store.webhooks.get(webhookId(url));
        if (!hook) throw axiosError(404);
        return { data: hook };
      }),
      post: vi.fn(async (_url: string, body: Record<string, unknown>) => {
        if (!authed) throw axiosError(401);
        if (store.failCreate) throw axiosError(500);
        const hook = { id: store.nextId++, ...body };
        store.webhooks.set(hook.id, hook);
        return { data: hook };
      }),
      delete: vi.fn(async (url: string) => {
        if (!authed) throw axiosError(401);
        if (!store.webhooks.delete(webhookId(url))) throw axiosError(404);
        return { data: {} };
      }),
    };
  };

  const axios = {
    create: vi.fn(client),
    get: vi.fn(async () => ({ data: store.index })),
    isAxiosError: (error: unknown) => (error as { isAxiosError?: boolean })?.isAxiosError === true,
  };
  return { default: axios, ...axios };
});

import prisma from "../../../utils/prisma.js";
import { integrationTriggerQueue } from "../../../workers/bullmq/queues/index.js";
import { InboundWebhookRejected, inboundWebhookRoutes } from "../shared/inboundWebhook.js";
import { recordIntegrationFailure } from "../shared/integrationHealth.js";
import { signOAuthState, verifyOAuthState } from "../shared/oauth2.js";
import {
  completeWooConnect,
  getWooStatus,
  startWooConnect,
  syncWooWebhooks,
  updateWooSettings,
  WooConnectError,
} from "./woocommerce.connect.js";
import { handleWooInbound, isValidWooSignature } from "./woocommerce.inbound.js";
import { WOO_TOPICS, type WooCredential } from "./woocommerce.types.js";
import { assertPublicStore, normaliseStoreUrl, WooStoreUrlError } from "./woocommerce.url.js";

type Mock = ReturnType<typeof vi.fn>;
const db = prisma.integration as unknown as Record<string, Mock>;

const STORE = "https://shop.example.com";
const DELIVERY_URL = "https://api.test.example/api/public/integrations/webhooks/woocommerce/int-1";

beforeAll(() => {
  process.env.INTEGRATION_SECRET_KEY = randomBytes(32).toString("base64");
  process.env.API_URL = "https://api.test.example";
  process.env.FRONTEND_URL = "https://app.test.example";
});

beforeEach(() => {
  vi.clearAllMocks();
  store.webhooks.clear();
  store.nextId = 100;
  store.rejectBasic = false;
  store.failCreate = false;
  store.index = { name: "Demo Store", namespaces: ["wp/v2", "wc/v3"] };
  db.findUnique.mockResolvedValue(null);
  db.upsert.mockImplementation(async (args: { create: { credential: unknown } }) => ({
    id: "int-1",
    orgId: "org-1",
    name: "woocommerce",
    active: true,
    consecutiveFailures: 0,
    credential: args.create.credential,
  }));
  db.update.mockResolvedValue({});
});

const callback = (over: Record<string, unknown> = {}) => ({
  key_id: 7,
  user_id: signOAuthState({ orgId: "org-1", provider: "woocommerce", context: STORE }),
  consumer_key: "ck_live",
  consumer_secret: "cs_live",
  key_permissions: "read_write",
  ...over,
});

/** The credential the last `update` wrote — where the webhook ids end up. */
const savedCredential = () =>
  db.update.mock.calls.at(-1)?.[0].data.credential as WooCredential | undefined;

describe("the store address", () => {
  test.each([
    ["shop.example.com", STORE],
    ["https://Shop.Example.com/", STORE],
    ["https://shop.example.com/wp-admin/admin.php?page=wc-settings", STORE],
    ["https://example.com/store/shop/", "https://example.com/store"],
  ])("%s → %s", (input, expected) => {
    expect(normaliseStoreUrl(input)).toBe(expected);
  });

  test("plain HTTP is refused: the key would travel in the clear", () => {
    expect(() => normaliseStoreUrl("http://shop.example.com")).toThrow(WooStoreUrlError);
  });

  test("an address on our own network is refused", async () => {
    await expect(
      assertPublicStore("https://intranet.example", async () => [{ address: "10.0.0.5" }]),
    ).rejects.toThrow(/not reachable/);
    await expect(assertPublicStore("https://127.0.0.1")).rejects.toThrow(WooStoreUrlError);
    await expect(
      assertPublicStore("https://shop.example.com", async () => [{ address: "203.0.113.10" }]),
    ).resolves.toBeUndefined();
  });
});

describe("starting a connect", () => {
  test("sends the admin to the store's approval screen with signed state naming the store", async () => {
    const url = new URL(await startWooConnect("org-1", "user-1", "shop.example.com/"));

    expect(url.origin + url.pathname).toBe(`${STORE}/wc-auth/v1/authorize`);
    expect(url.searchParams.get("scope")).toBe("read_write");
    expect(url.searchParams.get("return_url")).toBe(
      "https://app.test.example/dashboard/settings/integrations/woocommerce",
    );
    expect(url.searchParams.get("callback_url")).toBe(
      "https://api.test.example/api/public/integrations/woocommerce/auth-callback",
    );
    expect(verifyOAuthState(url.searchParams.get("user_id")!, "woocommerce")).toMatchObject({
      orgId: "org-1",
      userId: "user-1",
      context: STORE,
    });
  });

  test("a WordPress site without WooCommerce is caught before the admin is sent anywhere", async () => {
    store.index = { name: "Blog", namespaces: ["wp/v2"] };

    await expect(startWooConnect("org-1", undefined, STORE)).rejects.toThrow(
      /WooCommerce is not active/,
    );
  });
});

describe("the key WooCommerce sends back", () => {
  test("is proven, saved with the store's details, and every webhook is registered", async () => {
    await completeWooConnect(callback());

    const created = db.upsert.mock.calls[0][0].create;
    expect(created).toMatchObject({ orgId: "org-1", name: "woocommerce", active: true });
    expect(created.credential).toMatchObject({
      storeUrl: STORE,
      consumerKey: "ck_live",
      consumerSecret: "cs_live",
      keyId: 7,
      authMode: "basic",
      store: { name: "Demo Store", currency: "INR", country: "IN:KL", wcVersion: "9.3.1" },
    });

    const hooks = [...store.webhooks.values()];
    expect(hooks.map((hook) => hook.topic)).toEqual([...WOO_TOPICS]);
    for (const hook of hooks) {
      expect(hook).toMatchObject({
        delivery_url: DELIVERY_URL,
        secret: created.credential.webhookSecret,
        status: "active",
      });
    }
    expect(savedCredential()?.webhooks.map((hook) => hook.topic)).toEqual([...WOO_TOPICS]);
  });

  test("falls back to query-string keys on a host that strips the Authorization header", async () => {
    store.rejectBasic = true;

    await completeWooConnect(callback());

    expect(db.upsert.mock.calls[0][0].create.credential.authMode).toBe("query");
    expect(store.webhooks.size).toBe(WOO_TOPICS.length);
  });

  test("state for another org, or tampered with, attaches nothing", async () => {
    await expect(completeWooConnect(callback({ user_id: "forged.state" }))).rejects.toMatchObject({
      statusCode: 401,
    });
    const zohoState = signOAuthState({ orgId: "org-1", provider: "zoho", context: STORE });
    await expect(completeWooConnect(callback({ user_id: zohoState }))).rejects.toBeInstanceOf(
      WooConnectError,
    );
    expect(db.upsert).not.toHaveBeenCalled();
  });

  test("a read-only key is refused", async () => {
    await expect(completeWooConnect(callback({ key_permissions: "read" }))).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  test("reconnecting removes the old connection's webhooks first", async () => {
    store.webhooks.set(5, { id: 5, topic: "order.created", status: "active" });
    db.findUnique.mockResolvedValue({
      id: "int-1",
      credential: {
        storeUrl: STORE,
        consumerKey: "ck_old",
        consumerSecret: "cs_old",
        webhookSecret: "old-secret",
        webhooks: [{ topic: "order.created", id: 5 }],
      },
    });

    await completeWooConnect(callback());

    expect(store.webhooks.has(5)).toBe(false);
    expect(store.webhooks.size).toBe(WOO_TOPICS.length);
  });

  test("reconnecting the same store keeps customer sync; another store starts with it off", async () => {
    const previous = (storeUrl: string) => ({
      id: "int-1",
      credential: {
        storeUrl,
        consumerKey: "ck_old",
        consumerSecret: "cs_old",
        webhookSecret: "old-secret",
        webhooks: [],
        syncCustomers: true,
      },
    });

    db.findUnique.mockResolvedValue(previous(STORE));
    await completeWooConnect(callback());
    expect(db.upsert.mock.calls.at(-1)?.[0].update.credential.syncCustomers).toBe(true);

    db.findUnique.mockResolvedValue(previous("https://other.example.com"));
    await completeWooConnect(callback());
    expect(db.upsert.mock.calls.at(-1)?.[0].update.credential).not.toHaveProperty("syncCustomers");
  });

  test("webhooks that will not register leave the connection standing, and say so", async () => {
    store.failCreate = true;

    await expect(completeWooConnect(callback())).resolves.toBeUndefined();

    expect(db.upsert).toHaveBeenCalled();
    expect(recordIntegrationFailure).toHaveBeenCalledWith(
      expect.objectContaining({ id: "int-1" }),
      "WooCommerce",
      expect.anything(),
      { notifyAfter: 1 },
    );
    expect(savedCredential()?.webhooks).toEqual([]);
  });
});

describe("keeping webhooks registered", () => {
  const integration = (webhooks: WooCredential["webhooks"]) =>
    ({
      id: "int-1",
      credential: {
        storeUrl: STORE,
        consumerKey: "ck",
        consumerSecret: "cs",
        webhookSecret: "secret",
        webhooks,
      },
    }) as never;

  test("keeps the healthy ones, replaces a disabled one and one deleted on the store", async () => {
    store.webhooks.set(1, {
      id: 1,
      topic: "order.created",
      status: "active",
      delivery_url: DELIVERY_URL,
    });
    store.webhooks.set(2, {
      id: 2,
      topic: "order.updated",
      status: "disabled",
      delivery_url: DELIVERY_URL,
    });

    const refs = await syncWooWebhooks(
      integration([
        { topic: "order.created", id: 1 },
        { topic: "order.updated", id: 2 },
        { topic: "customer.created", id: 3 },
      ]),
    );

    expect(refs.find((ref) => ref.topic === "order.created")?.id).toBe(1);
    expect(refs.find((ref) => ref.topic === "order.updated")?.id).not.toBe(2);
    expect(store.webhooks.has(2)).toBe(false);
    expect(refs).toHaveLength(WOO_TOPICS.length);
  });
});

describe("the settings page's view", () => {
  test("names the store and its webhooks, and never carries the keys", async () => {
    db.findUnique.mockResolvedValue({
      id: "int-1",
      active: true,
      consecutiveFailures: 0,
      lastError: null,
      lastErrorAt: null,
      credential: {
        storeUrl: STORE,
        consumerKey: "ck",
        consumerSecret: "cs",
        webhookSecret: "secret",
        webhooks: [{ topic: "order.created", id: 1 }],
        connectedAt: "2026-09-28T10:00:00.000Z",
      },
    });

    const status = await getWooStatus("org-1");

    expect(status).toMatchObject({ connected: true, storeUrl: STORE });
    expect(JSON.stringify(status)).not.toMatch(/ck|cs|secret/);
    if (status.connected) {
      expect(status.settings).toEqual({ syncCustomers: false });
      expect(status.webhooks.filter((hook) => hook.registered).map((hook) => hook.topic)).toEqual([
        "order.created",
      ]);
    }
  });
});

describe("the admin's settings", () => {
  const connected = {
    id: "int-1",
    active: true,
    consecutiveFailures: 0,
    credential: {
      storeUrl: STORE,
      consumerKey: "ck",
      consumerSecret: "cs",
      webhookSecret: "secret",
      webhooks: [{ topic: "customer.created", id: 3 }],
      connectedAt: "2026-09-28T10:00:00.000Z",
    },
  };

  test("switching customer sync on keeps the rest of the connection as it was", async () => {
    db.findUnique.mockResolvedValue(connected);

    await updateWooSettings("org-1", { syncCustomers: true });

    expect(savedCredential()).toEqual({ ...connected.credential, syncCustomers: true });
  });

  test("with no store connected there is nothing to switch", async () => {
    await expect(updateWooSettings("org-1", { syncCustomers: true })).rejects.toThrow(
      WooConnectError,
    );
  });
});

describe("deliveries", () => {
  const SECRET = "hook-secret";
  const integration = {
    id: "int-1",
    orgId: "org-1",
    name: "woocommerce",
    active: true,
    credential: {
      storeUrl: STORE,
      consumerKey: "ck",
      consumerSecret: "cs",
      webhookSecret: SECRET,
      webhooks: [],
    },
  } as never;

  const sign = (body: string) => createHmac("sha256", SECRET).update(body).digest("base64");
  const request = (headers: Record<string, string>, body: string) =>
    ({ headers, rawBody: body, body: JSON.parse(body || "{}") }) as never;

  test("a signed delivery is queued once per delivery id", async () => {
    const body = JSON.stringify({ id: 901, status: "processing" });

    await handleWooInbound(
      integration,
      request(
        {
          "x-wc-webhook-topic": "order.updated",
          "x-wc-webhook-signature": sign(body),
          "x-wc-webhook-delivery-id": "d-55",
          "x-wc-webhook-id": "101",
        },
        body,
      ),
    );

    expect(integrationTriggerQueue.add).toHaveBeenCalledWith(
      "woocommerce-order.updated",
      {
        integrationName: "woocommerce",
        triggerKey: "order.updated",
        orgId: "org-1",
        data: { deliveryId: "d-55", webhookId: "101", payload: { id: 901, status: "processing" } },
      },
      expect.objectContaining({ jobId: "woo-int-1-d-55", attempts: 5 }),
    );
  });

  test("a bad or missing signature is refused", async () => {
    const body = JSON.stringify({ id: 901 });

    await expect(
      handleWooInbound(
        integration,
        request(
          { "x-wc-webhook-topic": "order.updated", "x-wc-webhook-signature": sign("{}") },
          body,
        ),
      ),
    ).rejects.toBeInstanceOf(InboundWebhookRejected);
    await expect(
      handleWooInbound(integration, request({ "x-wc-webhook-topic": "order.updated" }, body)),
    ).rejects.toBeInstanceOf(InboundWebhookRejected);
    expect(integrationTriggerQueue.add).not.toHaveBeenCalled();
  });

  test("the signature is over the exact bytes", () => {
    expect(isValidWooSignature('{"a":1}', sign('{"a":1}'), SECRET)).toBe(true);
    expect(isValidWooSignature('{"a": 1}', sign('{"a":1}'), SECRET)).toBe(false);
  });

  test("WooCommerce's creation ping — a form post with no topic — gets its 200 through the shared receiver", async () => {
    db.findUnique.mockResolvedValue(integration);
    const server = Fastify();
    await server.register(inboundWebhookRoutes, { prefix: "/webhooks" });

    const response = await server.inject({
      method: "POST",
      url: "/webhooks/woocommerce/0b7c6a52-1f5e-4c6e-9d6a-2f4b8e1c9a10",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      payload: "webhook_id=101",
    });

    expect(response.statusCode).toBe(200);
    expect(integrationTriggerQueue.add).not.toHaveBeenCalled();
    await server.close();
  });
});

describe("routing", () => {
  test("the WooCommerce subtree does not swallow the generic `/:name/...` routes", async () => {
    // The same shape as integrationsRoutes: a static `/woocommerce` prefix beside
    // parametric `/:name` routes. find-my-way must fall back to the parametric
    // route when the static subtree has no match.
    const server = Fastify();
    server.get("/:name/activity", async () => ({ route: "activity" }));
    server.delete("/:name", async () => ({ route: "delete" }));
    await server.register(
      async (woo) => {
        woo.get("/status", async () => ({ route: "status" }));
      },
      { prefix: "/woocommerce" },
    );

    const hit = async (method: "GET" | "DELETE", url: string) =>
      (await server.inject({ method, url })).json().route;

    expect(await hit("GET", "/woocommerce/status")).toBe("status");
    expect(await hit("GET", "/woocommerce/activity")).toBe("activity");
    expect(await hit("DELETE", "/woocommerce")).toBe("delete");
    await server.close();
  });
});
