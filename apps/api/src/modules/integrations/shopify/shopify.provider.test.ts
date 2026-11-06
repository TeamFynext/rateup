import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getActiveShopifySession: vi.fn(),
  refreshShopifyCredential: vi.fn(),
  saveShopifySession: vi.fn(),
  deleteAllWebhooks: vi.fn(),
  getShopifyIntegrationByShop: vi.fn(),
  updateShopifyIntegrationByOrgId: vi.fn(),
  createIntegration: vi.fn(),
}));

vi.mock("./shopify.session.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./shopify.session.js")>()),
  getActiveShopifySession: mocks.getActiveShopifySession,
  refreshShopifyCredential: mocks.refreshShopifyCredential,
  saveShopifySession: mocks.saveShopifySession,
}));
vi.mock("./shopify.webhooks.js", () => ({ deleteAllWebhooks: mocks.deleteAllWebhooks }));
vi.mock("./shopify.credential.js", () => ({
  getShopifyIntegrationByShop: mocks.getShopifyIntegrationByShop,
  updateShopifyIntegrationByOrgId: mocks.updateShopifyIntegrationByOrgId,
}));
vi.mock("../integrations.service.js", () => ({ createIntegration: mocks.createIntegration }));
vi.mock("./shopify.config.js", () => ({ default: {} }));

import { Session } from "@shopify/shopify-api";
import type { Integration } from "../../../../generated/prisma/client.js";
import { getIntegrationProvider } from "../providers/registry.js";
import { connectShopify } from "./shopify.connect.js";
import { shopifyProvider } from "./shopify.provider.js";

const SHOP = "demo.myshopify.com";

const row = (credential: unknown) =>
  ({ id: "int-1", orgId: "org-1", name: "shopify", credential }) as unknown as Integration;

const installSession = () =>
  new Session({
    id: `offline_${SHOP}`,
    shop: SHOP,
    state: "",
    isOnline: false,
    accessToken: "shpat_new",
    scope: "read_orders",
  });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("shopifyProvider", () => {
  test("is in the registry, on its own connect and inbound paths", () => {
    expect(getIntegrationProvider("shopify")).toBe(shopifyProvider);
    // Install starts in Shopify, and deliveries are signed app-wide.
    expect(shopifyProvider.oauth).toBeUndefined();
    expect(shopifyProvider.handleInbound).toBeUndefined();
    // Deliveries run on webhookQueue, keyed by shop rather than org.
    expect(shopifyProvider.processJob).toBeUndefined();
    expect(shopifyProvider.events).toEqual([]);
  });

  test("refreshCredential hands the row to the session's scheduled refresh", async () => {
    const integration = row({ session: { shop: SHOP } });

    await shopifyProvider.refreshCredential!(integration);

    expect(mocks.refreshShopifyCredential).toHaveBeenCalledWith(integration);
  });

  test("disconnect removes the shop's webhook subscriptions", async () => {
    const session = { shop: SHOP };
    mocks.getActiveShopifySession.mockResolvedValue(session);

    await shopifyProvider.disconnect!(row({ session: { shop: SHOP } }));

    expect(mocks.deleteAllWebhooks).toHaveBeenCalledWith(session);
  });

  test("disconnect has nothing to remove without a session", async () => {
    await shopifyProvider.disconnect!(row({}));

    expect(mocks.getActiveShopifySession).not.toHaveBeenCalled();
    expect(mocks.deleteAllWebhooks).not.toHaveBeenCalled();
  });
});

describe("connectShopify", () => {
  test("reactivates a shop an org has already claimed, writing the session on its own", async () => {
    mocks.getShopifyIntegrationByShop.mockResolvedValue({ id: "int-1", orgId: "org-1" });
    const session = installSession();

    await connectShopify(session);

    expect(mocks.updateShopifyIntegrationByOrgId).toHaveBeenCalledWith("org-1", {
      credential: expect.objectContaining({ isWebhookRegistered: false, shopifySurveys: [] }),
      active: true,
    });
    expect(mocks.saveShopifySession).toHaveBeenCalledWith("int-1", session);
    expect(mocks.createIntegration).not.toHaveBeenCalled();
  });

  test("saves a new shop with no org, for the merchant's login to claim", async () => {
    mocks.getShopifyIntegrationByShop.mockResolvedValue(null);

    await connectShopify(installSession());

    expect(mocks.createIntegration).toHaveBeenCalledWith({
      name: "shopify",
      credential: expect.objectContaining({
        session: expect.objectContaining({ shop: SHOP, accessToken: "shpat_new" }),
        isWebhookRegistered: false,
        shopifySurveys: [],
      }),
    });
    expect(mocks.updateShopifyIntegrationByOrgId).not.toHaveBeenCalled();
  });
});
