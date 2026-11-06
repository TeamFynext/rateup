import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

const db = vi.hoisted(() => ({
  shopProduct: { count: vi.fn(async () => 4) },
  shopShippingRate: { count: vi.fn(async () => 0) },
  whatsappSettings: { count: vi.fn(async () => 1) },
  shopOrder: { count: vi.fn(async () => 0) },
}));
const external = vi.hoisted(() => ({ storeConnected: vi.fn(async () => true) }));

vi.mock("../../../utils/prisma.js", () => ({ default: db }));
vi.mock("./externalCheckout.service.js", () => external);
vi.mock("./orders.service.js", () => ({ nextStep: vi.fn() }));
vi.mock("./payments/payments.service.js", () => ({
  listPaymentMethods: vi.fn(async () => ({ providers: [{ connected: false }] })),
}));

const { setupChecklist } = await import("./shopAnalytics.service.js");

const store = (checkoutVia: string) =>
  ({
    id: "s1",
    orgId: "org-1",
    metaCatalogId: "cat1",
    checkoutVia,
    codEnabled: false,
    bankTransferEnabled: false,
  }) as never;

const ids = (s: { steps: { id: string }[] }) => s.steps.map((step) => step.id);

beforeEach(() => vi.clearAllMocks());

describe("guided setup", () => {
  test("RateUp checkout asks how the shop gets paid and for a delivery rate", async () => {
    const checklist = await setupChecklist(store("RATEUP"));
    expect(ids(checklist)).toEqual([
      "whatsapp",
      "catalog",
      "products",
      "payments",
      "shipping",
      "test_order",
    ]);
  });

  test("Shopify checkout takes payment and delivery, so neither is asked for", async () => {
    const checklist = await setupChecklist(store("SHOPIFY"));
    expect(ids(checklist)).toEqual(["whatsapp", "catalog", "products", "checkout", "test_order"]);
    expect(checklist.steps.find((s) => s.id === "checkout")).toEqual({
      id: "checkout",
      label: "Customers pay on your Shopify checkout",
      done: true,
    });
  });

  test("WooCommerce checkout still needs RateUp's delivery rates, as its payment page has none", async () => {
    external.storeConnected.mockResolvedValueOnce(false);
    const checklist = await setupChecklist(store("WOOCOMMERCE"));
    expect(ids(checklist)).toContain("shipping");
    expect(checklist.steps.find((s) => s.id === "checkout")?.done).toBe(false);
  });
});
