import { beforeEach, describe, expect, test, vi } from "vitest";

vi.hoisted(() => {
  process.env.API_URL = "https://api.test.example";
  process.env.FRONTEND_URL = "https://app.test.example";
  process.env.SHOPIFY_API_KEY = "shopify-key";
  process.env.SHOPIFY_API_SECRET = "shopify-secret";
  process.env.SHOPIFY_SCOPES = "read_products,write_orders";
});

vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock("../../../utils/prisma.js", () => ({
  default: {
    integration: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    waMessage: { findFirst: vi.fn() },
  },
}));

vi.mock("../integrations.service.js", () => ({
  getIntegrationByName: vi.fn(),
  updateIntegrationByName: vi.fn(),
  createIntegration: vi.fn(),
  deleteIntegrationByName: vi.fn(),
}));

vi.mock("../../org/org.services.js", () => ({ pauseOrg: vi.fn() }));

vi.mock("./shopify.config.js", () => ({
  default: {
    config: { scopes: { equals: vi.fn(() => true) } },
    clients: {
      Graphql: class {
        request = vi.fn();
      },
      Rest: class {},
    },
    webhooks: {
      register: vi.fn(),
      addHandlers: vi.fn(),
      getTopicsAdded: vi.fn(() => []),
      process: vi.fn(),
    },
    auth: { begin: vi.fn(), callback: vi.fn() },
    utils: { sanitizeShop: vi.fn((s: string) => s) },
  },
}));

// The service module pulls in most of the WhatsApp tree; stub the leaves it
// only calls at runtime so the import graph stays cheap.
vi.mock("../../whatsapp/whatsappSurvey/wasurvey.service.js", () => ({
  createSession: vi.fn(),
  deleteSession: vi.fn(),
  getSession: vi.fn(),
  sendMessage: vi.fn(),
}));
vi.mock("../../whatsapp/whatsappSurvey/wasurvey.controller.js", () => ({
  convertComponentForSenting: vi.fn(),
  updateButtonText: vi.fn(),
  wait: vi.fn(),
}));
vi.mock("../../stats/stats.service.js", () => ({ updateMonthlyStat: vi.fn() }));
vi.mock("../../whatsapp/automatedReply/wa_automatedReply.utils.js", () => ({
  checkAndExecuteRuleByTriggerEvent: vi.fn(),
}));
vi.mock("../../whatsapp/whatsappSurvey/wasurvey.utils.js", () => ({
  createTemplateMessage: vi.fn(),
  validateSession: vi.fn(),
}));
vi.mock("../../whatsapp/messageTemplates/wa_templates.service.js", () => ({
  getDbTemplate: vi.fn(),
}));
vi.mock("../../whatsapp/messageTemplates/wa_templates.utils.js", () => ({
  getFlowIdFromTemplateComponents: vi.fn(),
}));
vi.mock("../../whatsapp/messageTemplates/wa_templates.controller.js", () => ({
  sendTemplateToUserCore: vi.fn(),
}));
vi.mock("../../whatsapp/messageTemplates/wa_templates.auth.js", () => ({
  verifyTemplateMessageLimit: vi.fn(),
}));
vi.mock("../../subscription/subscription.service.js", () => ({ getSubscription: vi.fn() }));
vi.mock("../../loyalty/accounts/account.service.js", () => ({
  awardPoints: vi.fn(),
  getLCustomerByPhone: vi.fn(),
}));
vi.mock("../../loyalty/program/program.service.js", () => ({ getLoyaltyProgramByOrg: vi.fn() }));
vi.mock("../../loyalty/earningRulesEngine.js", () => ({ EarningRulesEngine: class {} }));

import dayjs from "dayjs";
import prisma from "../../../utils/prisma.js";
import { pauseOrg } from "../../org/org.services.js";
import { getIntegrationByName, deleteIntegrationByName } from "../integrations.service.js";
import {
  getAbandonedCheckouts,
  getShopifyIntegrationByShop,
  handleShopifyAppUnistalled,
  registerWebhookByTopic,
  resolveShopifyPathValue,
  updateShopifyIntegrationByShop,
} from "./shopify.service.js";
import { updateShopifyIntegrationByShopHandler } from "./shopify.controller.js";
import webhookHandlers, {
  customersDataRequestHandler,
  customersRedactHandler,
  mandatoryWebhookHandlers,
  shopRedactRequestHandler,
  WEBHOOK_API_ROUTE,
} from "./shopify.handler.js";
import { getScheduledTime, ShopifyPlanMap } from "./shopify.util.js";
import { ShopifySendAfter } from "../../../types/enums.js";
import { shopifyRoutes } from "./shopify.route.js";
import type { Session } from "@shopify/shopify-api";

type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as {
  integration: Record<string, Mock>;
  waMessage: Record<string, Mock>;
};

const ORG = "11111111-1111-1111-1111-111111111111";
const SHOP = "victim-store.myshopify.com";

function reply() {
  const rep: any = { code: vi.fn(() => rep), send: vi.fn(() => rep), redirect: vi.fn(() => rep) };
  return rep;
}

function answer(rep: any) {
  return { code: rep.code.mock.calls[0]?.[0], body: rep.send.mock.calls[0]?.[0] };
}

beforeEach(() => {
  vi.clearAllMocks();
  db.integration.findFirst.mockResolvedValue(null);
  db.integration.findUnique.mockResolvedValue(null);
  db.integration.findMany.mockResolvedValue([]);
  db.integration.updateMany.mockResolvedValue({ count: 1 });
  db.integration.deleteMany.mockResolvedValue({ count: 1 });
  (getIntegrationByName as unknown as Mock).mockResolvedValue(null);
  (deleteIntegrationByName as unknown as Mock).mockResolvedValue({ id: "int-1" });
  (pauseOrg as unknown as Mock).mockResolvedValue(undefined);
});

// ===========================================================================
// Claiming a shop
// ===========================================================================

describe("updateShopifyIntegrationByShop", () => {
  // NOTE: updateMany selecting on a JSON path, with the shop domain as the
  // only condition. No org, no ownership, no id.
  test("selects rows by the shop domain alone", async () => {
    await updateShopifyIntegrationByShop(SHOP, { orgId: ORG });

    expect(db.integration.updateMany).toHaveBeenCalledWith({
      where: { credential: { path: ["session", "shop"], equals: SHOP } },
      data: { orgId: ORG },
    });
  });

  test("writes whatever data object it is handed", async () => {
    await updateShopifyIntegrationByShop(SHOP, { active: false });

    expect(db.integration.updateMany.mock.calls[0][0].data).toEqual({ active: false });
  });

  test("updates every matching row, not one", async () => {
    db.integration.updateMany.mockResolvedValueOnce({ count: 3 });

    const res = await updateShopifyIntegrationByShop(SHOP, { orgId: ORG });

    expect(res.count).toBe(3);
  });
});

describe("updateShopifyIntegrationByShopHandler", () => {
  test("claims a shop that no org owns yet", async () => {
    (getIntegrationByName as unknown as Mock).mockResolvedValueOnce(null);
    db.integration.updateMany.mockResolvedValueOnce({ count: 1 });
    const rep = reply();

    await updateShopifyIntegrationByShopHandler(
      { params: { shop: SHOP }, user: { orgId: ORG } } as never,
      rep,
    );

    expect(db.integration.updateMany.mock.calls[0][0]).toEqual({
      where: { credential: { path: ["session", "shop"], equals: SHOP }, orgId: null },
      data: { orgId: ORG },
    });
    expect(answer(rep)).toEqual({ code: 200, body: { message: "success" } });
  });

  test("refuses a shop another org already owns", async () => {
    (getIntegrationByName as unknown as Mock).mockResolvedValueOnce(null);
    db.integration.updateMany.mockResolvedValueOnce({ count: 0 });
    const rep = reply();

    await updateShopifyIntegrationByShopHandler(
      { params: { shop: SHOP }, user: { orgId: ORG } } as never,
      rep,
    );

    expect(answer(rep)).toEqual({
      code: 409,
      body: { message: "This store is already linked to an organisation" },
    });
  });

  test("does nothing when the caller's org already holds that shop", async () => {
    (getIntegrationByName as unknown as Mock).mockResolvedValueOnce({
      credential: { session: { shop: SHOP } },
    });
    const rep = reply();

    await updateShopifyIntegrationByShopHandler(
      { params: { shop: SHOP }, user: { orgId: ORG } } as never,
      rep,
    );

    expect(db.integration.updateMany).not.toHaveBeenCalled();
    expect(answer(rep)).toEqual({ code: 200, body: "success" });
  });

  test("refuses rather than dropping the store the caller already has", async () => {
    (getIntegrationByName as unknown as Mock).mockResolvedValueOnce({
      credential: { session: { shop: "own-store.myshopify.com" } },
    });
    const rep = reply();

    await updateShopifyIntegrationByShopHandler(
      { params: { shop: SHOP }, user: { orgId: ORG } } as never,
      rep,
    );

    expect(deleteIntegrationByName).not.toHaveBeenCalled();
    expect(db.integration.updateMany).not.toHaveBeenCalled();
    expect(answer(rep).code).toBe(409);
  });

  test("the claim itself carries the ownership condition, not a prior read", async () => {
    (getIntegrationByName as unknown as Mock).mockResolvedValueOnce(null);
    db.integration.updateMany.mockResolvedValueOnce({ count: 1 });

    await updateShopifyIntegrationByShopHandler(
      { params: { shop: SHOP }, user: { orgId: ORG } } as never,
      reply(),
    );

    expect(db.integration.updateMany.mock.calls[0][0].where.orgId).toBeNull();
  });

  test("returns the bare error object when the write fails", async () => {
    db.integration.updateMany.mockRejectedValueOnce(new Error("db down"));
    const rep = reply();

    await updateShopifyIntegrationByShopHandler(
      { params: { shop: SHOP }, user: { orgId: ORG } } as never,
      rep,
    );

    expect(answer(rep).code).toBe(500);
  });
});

describe("getShopifyIntegrationByShop", () => {
  test("matches on the session shop inside the credential JSON", async () => {
    await getShopifyIntegrationByShop(SHOP);

    expect(db.integration.findFirst.mock.calls[0][0]).toEqual({
      where: { credential: { path: ["session", "shop"], equals: SHOP } },
      include: { org: true },
    });
  });
});

// ===========================================================================
// registerWebhookByTopic — the callback URL
// ===========================================================================

describe("registerWebhookByTopic", () => {
  test("points Shopify at this API's public webhook route", async () => {
    const client = { request: vi.fn(async (_query: string, _opts?: any) => ({ data: {} })) };
    const shopify = (await import("./shopify.config.js")).default as any;
    shopify.clients.Graphql = class {
      request = client.request;
    };

    await registerWebhookByTopic("ORDERS_CREATE", { shop: SHOP } as unknown as Session);

    const vars = client.request.mock.calls[0][1].variables;
    expect(vars.topic).toBe("ORDERS_CREATE");
    expect(vars.webhookSubscription.callbackUrl).toContain(WEBHOOK_API_ROUTE);
  });

  test("registers the callback URL with no trailing space", async () => {
    const client = { request: vi.fn(async (_query: string, _opts?: any) => ({ data: {} })) };
    const shopify = (await import("./shopify.config.js")).default as any;
    shopify.clients.Graphql = class {
      request = client.request;
    };

    await registerWebhookByTopic("ORDERS_CREATE", { shop: SHOP } as unknown as Session);

    const url = client.request.mock.calls[0][1].variables.webhookSubscription.callbackUrl;
    expect(url).toBe(`${process.env.API_URL}${WEBHOOK_API_ROUTE}`);
  });
});

// ===========================================================================
// getAbandonedCheckouts
// ===========================================================================

describe("getAbandonedCheckouts", () => {
  // NOTE (fixed): the query used to ask for `edges { nodes { ... } } ` — but
  // `nodes` (plural) only exists on the connection, not on an individual
  // edge (which only has `node`). Shopify rejects that field, so this used to
  // throw for every call. It's now `edges { node { ... } }`, matching how the
  // code reads the response.
  test("reads back a well-formed edges/node response without throwing", async () => {
    const client: any = {
      request: vi.fn(async () => ({
        data: {
          abandonedCheckouts: {
            edges: [
              {
                node: {
                  id: "gid://shopify/AbandonedCheckout/1",
                  createdAt: new Date().toISOString(),
                  completedAt: null,
                  billingAddress: null,
                  customer: null,
                },
                cursor: "c",
              },
            ],
            pageInfo: { hasNextPage: false, endCursor: null },
          },
        },
      })),
    };

    await expect(getAbandonedCheckouts(client)).resolves.toEqual([
      expect.objectContaining({ id: "gid://shopify/AbandonedCheckout/1" }),
    ]);
  });

  test("the query text asks for node (singular) inside edges", async () => {
    const client: any = {
      request: vi.fn(async () => ({ data: { abandonedCheckouts: { edges: [], pageInfo: {} } } })),
    };

    await getAbandonedCheckouts(client).catch(() => {});

    const query = client.request.mock.calls[0][0];
    expect(query).toContain("edges {");
    expect(query).toContain("node {");
    expect(query).not.toContain("nodes {");
  });

  // NOTE (fixed): the projection used to be id/createdAt/completedAt only —
  // no phone, no customer, no billing address — even though
  // validateAndParseCheckoutPhone needs `customer.defaultAddress.phone` /
  // `billingAddress.phone` to find a phone number to message. Now selected.
  test("selects phone fields the sender needs to find a customer phone number", async () => {
    const client: any = {
      request: vi.fn(async () => ({ data: { abandonedCheckouts: { edges: [], pageInfo: {} } } })),
    };

    await getAbandonedCheckouts(client).catch(() => {});

    const query = client.request.mock.calls[0][0];
    expect(query).toContain("phone");
    expect(query).toContain("customer");
    expect(query).toContain("billingAddress");
  });
});

// ===========================================================================
// handleShopifyAppUnistalled
// ===========================================================================

describe("handleShopifyAppUnistalled", () => {
  test("deactivates the integration when the org predates it", async () => {
    db.integration.findFirst.mockResolvedValueOnce({
      orgId: ORG,
      createdAt: new Date(2026, 5, 1),
      org: { id: ORG, createdAt: new Date(2025, 0, 1) },
    });

    await handleShopifyAppUnistalled({ shop: SHOP });

    expect(db.integration.updateMany.mock.calls[0][0].data).toEqual({ active: false });
    expect(pauseOrg).not.toHaveBeenCalled();
  });

  // NOTE: an org created by the Shopify install itself is paused outright when
  // the app is uninstalled — the whole tenant, not just the integration.
  test("pauses the whole org when the org was created by the install", async () => {
    db.integration.findFirst.mockResolvedValueOnce({
      orgId: ORG,
      createdAt: new Date(2025, 0, 1),
      org: { id: ORG, createdAt: new Date(2026, 5, 1) },
    });

    await handleShopifyAppUnistalled({ shop: SHOP });

    expect(pauseOrg).toHaveBeenCalledWith(ORG, { isPaused: true });
    expect(db.integration.updateMany).not.toHaveBeenCalled();
  });

  test("deactivates rather than throwing when the shop was never linked to an org", async () => {
    db.integration.findFirst.mockResolvedValueOnce({
      orgId: null,
      createdAt: new Date(),
      org: null,
    });

    await expect(handleShopifyAppUnistalled({ shop: SHOP })).resolves.toBeUndefined();

    expect(db.integration.updateMany.mock.calls[0][0].data).toEqual({ active: false });
    expect(pauseOrg).not.toHaveBeenCalled();
  });

  test("does nothing for a shop it does not know", async () => {
    db.integration.findFirst.mockResolvedValueOnce(null);

    await expect(handleShopifyAppUnistalled({ shop: SHOP })).resolves.toBeUndefined();
    expect(pauseOrg).not.toHaveBeenCalled();
  });

  // NOTE: the comparison is strict isBefore, so identical timestamps take the
  // pause branch.
  test("pauses the org when the two timestamps are equal", async () => {
    const at = new Date(2026, 5, 1);
    db.integration.findFirst.mockResolvedValueOnce({
      orgId: ORG,
      createdAt: at,
      org: { id: ORG, createdAt: at },
    });

    await handleShopifyAppUnistalled({ shop: SHOP });

    expect(pauseOrg).toHaveBeenCalledOnce();
  });
});

// ===========================================================================
// The mandatory GDPR webhooks
// ===========================================================================

describe("the mandatory privacy webhooks", () => {
  // NOTE: Shopify requires these three of every public app. All three bodies
  // are a single log.info — no lookup, no deletion, no export, no queue.
  test("the customer data request handler only logs", async () => {
    const { log } = await import("../../../utils/logger.js");

    await customersDataRequestHandler("CUSTOMERS_DATA_REQUEST", SHOP, "{}", "wh-1", "2024-10");

    expect(log.info).toHaveBeenCalledOnce();
  });

  test("the customer redact handler only logs", async () => {
    const { log } = await import("../../../utils/logger.js");

    await customersRedactHandler(
      "CUSTOMERS_REDACT",
      SHOP,
      '{"customer":{"id":1}}',
      "wh-2",
      "2024-10",
    );

    expect(log.info).toHaveBeenCalledOnce();
  });

  test("the shop redact handler only logs", async () => {
    const { log } = await import("../../../utils/logger.js");

    await shopRedactRequestHandler("SHOP_REDACT", SHOP, "{}", "wh-3", "2024-10");

    expect(log.info).toHaveBeenCalledOnce();
  });

  test("all three are nonetheless registered as handled topics", () => {
    expect(Object.keys(mandatoryWebhookHandlers)).toEqual(
      expect.arrayContaining(["CUSTOMERS_DATA_REQUEST", "CUSTOMERS_REDACT", "SHOP_REDACT"]),
    );
  });

  test("every registered topic points at the same public callback route", () => {
    for (const handlers of Object.values(webhookHandlers)) {
      expect((handlers[0] as any).callbackUrl).toBe(WEBHOOK_API_ROUTE);
    }
  });

  test("the callback route is the unauthenticated public one", () => {
    expect(WEBHOOK_API_ROUTE).toBe("/api/public/integrations/shopify/webhooks");
  });
});

// ===========================================================================
// resolveShopifyPathValue
// ===========================================================================

describe("resolveShopifyPathValue", () => {
  const order = {
    order_number: 1042,
    total_price: "499.00",
    customer: { first_name: "Ann" },
    line_items: [
      { title: "Mug", quantity: 2, fulfillment_status: "fulfilled" },
      { title: "Shirt", quantity: 1, fulfillment_status: null },
    ],
    fulfillments: [{ tracking_number: "TRK1", tracking_url: "https://track.test/1" }],
  };

  test("resolves a plain lodash path", () => {
    expect(resolveShopifyPathValue(order, "customer.first_name")).toBe("Ann");
  });

  test("lists only the fulfilled items", () => {
    expect(resolveShopifyPathValue(order, "items_fulfilled")).toBe("Mug (x2)");
  });

  test("lists everything not yet fulfilled", () => {
    expect(resolveShopifyPathValue(order, "pending_items")).toBe("Shirt (x1)");
  });

  test("falls back through the fulfillment shapes for tracking", () => {
    expect(resolveShopifyPathValue(order, "tracking_number")).toBe("TRK1");
    expect(resolveShopifyPathValue(order, "tracking_url")).toBe("https://track.test/1");
  });

  // NOTE: every miss becomes an empty string rather than an error, and the
  // value goes into a WhatsApp template parameter.
  test("an unresolvable path yields an empty string", () => {
    expect(resolveShopifyPathValue(order, "customer.nope.deeper")).toBe("");
    expect(resolveShopifyPathValue(order, "tracking_number_typo")).toBe("");
  });

  test("an absent body yields an empty string", () => {
    expect(resolveShopifyPathValue(null, "order_number")).toBe("");
  });

  test("everything is coerced to a string", () => {
    expect(resolveShopifyPathValue(order, "order_number")).toBe("1042");
  });

  // NOTE: the resolved value is logged at info for every webhook variable, so
  // customer names, addresses and phone numbers land in the application log.
  test("logs the resolved value at info", async () => {
    const { log } = await import("../../../utils/logger.js");

    resolveShopifyPathValue(
      { billing_address: { phone: "919876543210" } },
      "billing_address.phone",
    );

    expect((log.info as unknown as Mock).mock.calls[0][0]).toContain("919876543210");
  });

  test("a lodash path can reach any field of the webhook body", () => {
    expect(resolveShopifyPathValue(order, "line_items[0].title")).toBe("Mug");
  });
});

// ===========================================================================
// shopify.util
// ===========================================================================

describe("getScheduledTime", () => {
  test("adds the named delay", () => {
    const before = dayjs();
    const at = dayjs(getScheduledTime(ShopifySendAfter.TwoHour));

    expect(at.diff(before, "minute")).toBeGreaterThanOrEqual(119);
    expect(at.diff(before, "minute")).toBeLessThanOrEqual(121);
  });

  // NOTE: no default branch — an unrecognised or absent delay schedules the
  // message for now rather than refusing.
  test("an unknown delay means immediately", () => {
    const at = dayjs(getScheduledTime("whenever" as never));

    expect(Math.abs(at.diff(dayjs(), "second"))).toBeLessThan(2);
  });

  test("an absent delay means immediately", () => {
    const at = dayjs(getScheduledTime(undefined));

    expect(Math.abs(at.diff(dayjs(), "second"))).toBeLessThan(2);
  });
});

describe("ShopifyPlanMap", () => {
  // NOTE: essential and plus carry the same Shopify plan id, so the id stored
  // on an order cannot distinguish the two tiers.
  test("two different plans share one shopify plan id", () => {
    expect(ShopifyPlanMap.essential.id).toBe(ShopifyPlanMap.plus.id);
    expect(ShopifyPlanMap.essential.name).not.toBe(ShopifyPlanMap.plus.name);
  });

  test("the lookup by name still separates them", () => {
    const byName = (name: string) => Object.values(ShopifyPlanMap).find((p) => p.name === name);

    expect(byName("Essential")).toBe(ShopifyPlanMap.essential);
    expect(byName("Plus")).toBe(ShopifyPlanMap.plus);
  });

  test("a plan name Shopify does not match yields no id at all", () => {
    const found = Object.values(ShopifyPlanMap).find((p) => p.name === "Enterprise");

    expect(found?.id?.toString()).toBeUndefined();
  });
});

// ===========================================================================
// Route registration
// ===========================================================================

describe("shopifyRoutes", () => {
  function server() {
    const routes: any[] = [];
    const hooks: any[] = [];
    const srv: any = {
      addHook: vi.fn((name, fn) => hooks.push({ name, fn })),
      register: vi.fn(),
      get: vi.fn((url, opts, handler) => routes.push({ method: "GET", url, opts, handler })),
      post: vi.fn((url, opts, handler) => routes.push({ method: "POST", url, opts, handler })),
      put: vi.fn((url, opts, handler) => routes.push({ method: "PUT", url, opts, handler })),
      delete: vi.fn((url, opts, handler) => routes.push({ method: "DELETE", url, opts, handler })),
    };
    return { srv, routes, hooks };
  }

  // NOTE: the subtree adds no hook of its own; it inherits the parent's
  // checkSession because integrations.route.ts registers it after addHook.
  test("adds no authentication of its own", async () => {
    const { srv, hooks } = server();

    await shopifyRoutes(srv);

    expect(hooks).toHaveLength(0);
  });

  test("the shop-claiming route validates only the shape of the shop param", async () => {
    const { srv, routes } = server();

    await shopifyRoutes(srv);

    const claim = routes.find((r) => r.method === "PUT" && r.url === "/session/:shop");
    expect(Object.keys(claim.opts)).toEqual(["schema"]);
    expect(claim.opts.schema.params).toBeDefined();
  });

  test("no longer exposes a route that runs the platform-wide cron", async () => {
    const { srv, routes } = server();

    await shopifyRoutes(srv);

    expect(routes.find((r) => r.url === "/test")).toBeUndefined();
  });

  test("the by-shop delete takes the shop from the path", async () => {
    const { srv, routes } = server();

    await shopifyRoutes(srv);

    const del = routes.find((r) => r.method === "DELETE" && r.url === "/:shop");
    expect(del.opts.schema.params).toBeDefined();
  });
});
