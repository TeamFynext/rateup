import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

const sync = vi.hoisted(() => ({ scheduleStoreMirror: vi.fn(async () => {}) }));
const credential = vi.hoisted(() => ({
  getShopifyIntegrationByShop: vi.fn(),
  updateShopifyIntegrationByShop: vi.fn(),
}));
const wooProducts = vi.hoisted(() => ({ handleWooProductUpdated: vi.fn(async () => ({})) }));

vi.mock("../commerce/shop/storeSync.service.js", () => sync);
vi.mock("../../utils/logger.js", () => ({ log: { info: vi.fn(), warn: vi.fn(), debug: vi.fn() } }));
vi.mock("./shopify/shopify.credential.js", () => credential);
vi.mock("./shopify/shopify.checkouts.service.js", () => ({
  handleCheckoutDeleted: vi.fn(),
  handleCheckoutWebhook: vi.fn(),
  redactShopifyCustomer: vi.fn(),
  redactShopifyShop: vi.fn(),
}));
vi.mock("./shopify/shopify.orders.js", () => ({
  handleShopifyOrderEvents: vi.fn(),
  handleShopifyRefundEvent: vi.fn(),
}));
vi.mock("./shopify/shopify.billing.js", () => ({ handleSubscriptionUpdateFromShopify: vi.fn() }));
vi.mock("../org/org.services.js", () => ({ pauseOrg: vi.fn() }));
vi.mock("../notification/notify.js", () => ({ notify: vi.fn() }));
vi.mock("./woocommerce/woocommerce.connect.js", () => ({
  removeWooWebhooks: vi.fn(),
  syncWooWebhooks: vi.fn(),
}));
vi.mock("./woocommerce/woocommerce.inbound.js", () => ({ handleWooInbound: vi.fn() }));
vi.mock("./woocommerce/woocommerce.plugin.js", () => ({
  DISCONNECTED_PLUGIN_DATA: {},
  pushWooPluginData: vi.fn(),
  syncWooPluginConnection: vi.fn(),
}));
vi.mock("./woocommerce/woocommerce.products.js", () => wooProducts);

const { handleWebhook } = await import("./shopify/shopify.inbound.js");
const { wooCommerceProvider } = await import("./woocommerce/woocommerce.provider.js");
const { ShopifyEvents } = await import("../../types/enums.js");

beforeEach(() => vi.clearAllMocks());

describe("a product changing in the store a shop follows", () => {
  test.each([
    ShopifyEvents.PRODUCTS_CREATE,
    ShopifyEvents.PRODUCTS_UPDATE,
    ShopifyEvents.PRODUCTS_DELETE,
    ShopifyEvents.INVENTORY_LEVELS_UPDATE,
  ])("Shopify %s schedules the shop's refresh", async (topic) => {
    credential.getShopifyIntegrationByShop.mockResolvedValue({ orgId: "org-1" });
    await handleWebhook({ topic, shop: "fern.myshopify.com", webhookId: "w1", body: {} } as never);
    expect(sync.scheduleStoreMirror).toHaveBeenCalledWith("org-1", "shopify");
  });

  test.each(["product.created", "product.updated", "product.deleted"])(
    "WooCommerce %s schedules the shop's refresh",
    async (triggerKey) => {
      await wooCommerceProvider.processJob!(
        { id: "int-1", orgId: "org-1" } as never,
        { triggerKey, data: { payload: {} } } as never,
        {} as never,
      );
      expect(sync.scheduleStoreMirror).toHaveBeenCalledWith("org-1", "woocommerce");
      expect(wooProducts.handleWooProductUpdated).toHaveBeenCalledTimes(
        triggerKey === "product.updated" ? 1 : 0,
      );
    },
  );
});
