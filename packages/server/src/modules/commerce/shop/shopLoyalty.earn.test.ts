import { beforeEach, describe, expect, test, vi } from "vitest";

const db = vi.hoisted(() => ({
  shopOrder: { findUnique: vi.fn() },
  loyaltyProgram: {
    findUnique: vi.fn(async () => ({ id: "prog", status: "active", currencyName: "Points" })),
  },
  customerLoyaltyAccount: {
    findUnique: vi.fn(async () => ({
      id: "acc",
      currentPoints: 0,
      status: "active",
      currentTier: null,
    })),
  },
}));
const loyalty = vi.hoisted(() => ({ awardPoints: vi.fn() }));

vi.mock("../../../utils/prisma.js", () => ({ default: db }));
vi.mock("../../../utils/logger.js", () => ({ log: { warn: vi.fn() } }));
vi.mock("../../loyalty/accounts/account.service.js", () => loyalty);
vi.mock("../../loyalty/accounts/pointsReversal.service.js", () => ({
  reversePurchasePoints: vi.fn(),
}));

const { earnForOrder } = await import("./shopLoyalty.js");

const order = (checkoutVia: string, externalProvider: string | null = null) => ({
  id: "o1",
  orgId: "org",
  number: 1042,
  contactId: "c1",
  channel: "WHATSAPP",
  checkoutVia,
  externalProvider,
  total: 40,
  shippingTotal: 0,
  items: [{ lineTotal: 40, sku: null, variant: { product: { loyaltyMultiplier: 1 } } }],
});

beforeEach(() => vi.clearAllMocks());

describe("points for a paid shop order", () => {
  test("RateUp earns them when the order lives only in RateUp", async () => {
    db.shopOrder.findUnique.mockResolvedValue(order("RATEUP"));
    await earnForOrder("o1");
    expect(loyalty.awardPoints).toHaveBeenCalledTimes(1);
  });

  test.each(["shopify", "woocommerce"])(
    "RateUp earns them for a RateUp-checkout order written back to %s; its echo earns none",
    async (provider) => {
      db.shopOrder.findUnique.mockResolvedValue(order("RATEUP", provider));
      await earnForOrder("o1");
      expect(loyalty.awardPoints).toHaveBeenCalledTimes(1);
    },
  );

  test.each(["SHOPIFY", "WOOCOMMERCE"])(
    "paid on the %s checkout, the store's order webhook earns them, so they are earned once",
    async (via) => {
      db.shopOrder.findUnique.mockResolvedValue(order(via, via.toLowerCase()));
      await earnForOrder("o1");
      expect(loyalty.awardPoints).not.toHaveBeenCalled();
    },
  );
});
