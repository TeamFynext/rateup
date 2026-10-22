import { describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/prisma.js", () => ({ default: {} }));
vi.mock("../../../workers/bullmq/queues/shop.queue.js", () => ({
  enqueueCatalogPublish: vi.fn(),
  armShopReminder: vi.fn(),
  disarmShopReminders: vi.fn(),
  enqueueBackInStock: vi.fn(),
}));

const { discountState, normaliseCode, ruleOf } = await import("./discounts.service.js");
const { redeemablePoints } = await import("./shopLoyalty.js");
const { parseCsv } = await import("./products.service.js");
const { nextStep } = await import("./orders.service.js");
const { toMinorUnits, fromMinorUnits } = await import("./money.js");
const { slugify } = await import("./store.service.js");

const discount = (over: Record<string, unknown> = {}) =>
  ({
    active: true,
    startsAt: new Date(Date.now() - 1000),
    endsAt: null,
    usageLimit: null,
    usedCount: 0,
    type: "PERCENTAGE",
    value: 15,
    buyQty: null,
    getQty: null,
    appliesTo: "ALL",
    collectionIds: [],
    productIds: [],
    ...over,
  }) as never;

describe("discounts", () => {
  test("codes are compared upper-case without spaces", () => {
    expect(normaliseCode(" autumn 15 ")).toBe("AUTUMN15");
  });

  test("state reflects switches, dates and usage", () => {
    expect(discountState(discount())).toBe("ACTIVE");
    expect(discountState(discount({ active: false }))).toBe("OFF");
    expect(discountState(discount({ startsAt: new Date(Date.now() + 60_000) }))).toBe("SCHEDULED");
    expect(discountState(discount({ endsAt: new Date(Date.now() - 1) }))).toBe("ENDED");
    expect(discountState(discount({ usageLimit: 5, usedCount: 5 }))).toBe("USED_UP");
    expect(discountState(discount({ endsAt: new Date(Date.now() + 86_400_000) }))).toBe(
      "ENDS_SOON",
    );
  });

  test("free shipping without a value has no cap", () => {
    expect(ruleOf(discount({ type: "FREE_SHIPPING", value: null })).rule).toEqual({
      type: "FREE_SHIPPING",
      cap: null,
    });
  });
});

describe("points at checkout", () => {
  const store = { pointValue: 0.01, minPointsToRedeem: 100, maxPointsPct: 50 } as never;

  test("caps points at the store's share of the goods", () => {
    // $80 goods, 50% cap = $40 = 4000 points; the member has 840
    expect(redeemablePoints(store, 840, 80)).toEqual({ points: 840, value: 8.4 });
    expect(redeemablePoints(store, 10_000, 80)).toEqual({ points: 4000, value: 40 });
  });

  test("nothing below the minimum, or when points have no value", () => {
    expect(redeemablePoints(store, 99, 80)).toEqual({ points: 0, value: 0 });
    expect(redeemablePoints({ ...(store as object), pointValue: null } as never, 5000, 80)).toEqual(
      { points: 0, value: 0 },
    );
  });
});

test("CSV parsing handles quotes, commas and blank lines", () => {
  expect(parseCsv('Product,Price\n"Cedar, large",24\n\n"Say ""hi""",5\r\n')).toEqual([
    ["Product", "Price"],
    ["Cedar, large", "24"],
    ['Say "hi"', "5"],
  ]);
});

test("next step names what an order waits on", () => {
  const o = {
    status: "OPEN",
    paymentStatus: "PAID",
    fulfillmentStatus: "UNFULFILLED",
    confirmedAt: null,
    checkoutStage: "DONE",
    checkoutVia: "RATEUP",
    externalProvider: null,
    externalId: null,
  } as const;
  expect(nextStep(o)).toBe("Pack and ship");
  expect(nextStep({ ...o, paymentStatus: "COD_PENDING" })).toBe(
    "Waiting for the customer to confirm",
  );
  expect(nextStep({ ...o, status: "DRAFT", checkoutStage: "ADDRESS" })).toBe(
    "Waiting for the address",
  );
  expect(nextStep({ ...o, status: "CANCELLED" })).toBe("—");
});

test("orders the store handles point staff at the store", () => {
  const o = {
    status: "OPEN",
    paymentStatus: "PAID",
    fulfillmentStatus: "UNFULFILLED",
    confirmedAt: null,
    checkoutStage: "DONE",
    checkoutVia: "SHOPIFY",
    externalProvider: "shopify",
    externalId: "5501",
  } as const;
  expect(nextStep({ ...o, status: "DRAFT", checkoutStage: "PAYMENT" })).toBe(
    "Waiting for checkout in Shopify",
  );
  expect(nextStep(o)).toBe("Fulfil it in Shopify");
  expect(nextStep({ ...o, fulfillmentStatus: "SHIPPED" })).toBe("Fulfilled in Shopify");
  // A RateUp-checkout order written back to WooCommerce is fulfilled there too.
  expect(
    nextStep({ ...o, checkoutVia: "RATEUP", externalProvider: "woocommerce", externalId: "812" }),
  ).toBe("Fulfil it in WooCommerce");
});

test("gateway amounts use minor units except zero-decimal currencies", () => {
  expect(toMinorUnits(24.5, "usd")).toBe(2450);
  expect(toMinorUnits(2450, "JPY")).toBe(2450);
  expect(fromMinorUnits(2450, "EUR")).toBe(24.5);
});

test("store slugs are url-safe", () => {
  expect(slugify("Juniper & Co. — Café")).toBe("juniper-co-cafe");
});
