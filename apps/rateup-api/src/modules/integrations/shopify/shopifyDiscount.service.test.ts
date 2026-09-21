import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), trace: vi.fn(), debug: vi.fn() },
}));

const graphqlRequest = vi.fn();
vi.mock("./shopify.config.js", () => ({
  default: {
    clients: {
      Graphql: class {
        request = graphqlRequest;
      },
    },
  },
}));
vi.mock("./shopify.service.js", () => ({ getShopifyInfo: vi.fn() }));
vi.mock("../../../utils/prisma.js", () => ({
  default: {
    loyaltyRedemption: { findUnique: vi.fn(), update: vi.fn() },
  },
}));

import prisma from "../../../utils/prisma.js";
import { getShopifyInfo } from "./shopify.service.js";
import { LoyaltyPointRewardSubType } from "../../../types/loyalty.js";
import {
  buildBasicCodeDiscountInput,
  buildDiscountValue,
  discountShareUrl,
  discountWindow,
  syncRedemptionToShopify,
} from "./shopifyDiscount.service.js";

type Mock = ReturnType<typeof vi.fn>;

const ISSUED = new Date("2026-09-17T09:00:00.000Z");

const redemption = (over: Record<string, unknown> = {}) => ({
  id: "red-1",
  redemptionCode: "RU-ABCDEFGHJK",
  createdAt: ISSUED,
  expiresAt: null,
  shopifyDiscountId: null,
  shopifyDiscountUrl: null,
  reward: {
    name: "10% off",
    rewardValue: { type: LoyaltyPointRewardSubType.DISCOUNT_PERCENTAGE, percentage: 10 },
    redemptionRules: { shopify: { enabled: true } },
  },
  account: { contact: { orgId: "org-1" } },
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  (prisma.loyaltyRedemption.update as Mock).mockResolvedValue({});
  (getShopifyInfo as Mock).mockResolvedValue({
    credential: { session: { shop: "demo.myshopify.com", accessToken: "t" } },
  });
  graphqlRequest.mockResolvedValue({
    data: {
      discountCodeBasicCreate: {
        codeDiscountNode: { id: "gid://shopify/DiscountCodeNode/1" },
        userErrors: [],
      },
    },
  });
});

describe("buildDiscountValue", () => {
  test("percentage is sent as a fraction, not a number out of 100", () => {
    expect(
      buildDiscountValue({ type: LoyaltyPointRewardSubType.DISCOUNT_PERCENTAGE, percentage: 10 }),
    ).toEqual({ percentage: 0.1 });
  });

  test("fixed amount is a two-decimal string applied to the order, not each item", () => {
    expect(
      buildDiscountValue({
        type: LoyaltyPointRewardSubType.DISCOUNT_FIXED,
        amount: 5,
        currency: "INR",
      }),
    ).toEqual({ discountAmount: { amount: "5.00", appliesOnEachItem: false } });
  });

  test("a free item has no basic-discount equivalent, so it is not synced", () => {
    expect(
      buildDiscountValue({ type: LoyaltyPointRewardSubType.FREE_ITEM, item_name: "Coffee" }),
    ).toBeNull();
  });

  test("reads the rewards dashboard's dialect, which most real rewards use", () => {
    expect(
      buildDiscountValue({ rewardType: "percentage-discount", discountPercentage: 25 }),
    ).toEqual({ percentage: 0.25 });
    expect(buildDiscountValue({ rewardType: "fixed-discount", cashbackAmount: 100 })).toEqual({
      discountAmount: { amount: "100.00", appliesOnEachItem: false },
    });
    expect(buildDiscountValue({ rewardType: "free-service", estimatedValue: 200 })).toBeNull();
  });

  test("reads the coupon tab's dialect", () => {
    expect(buildDiscountValue({ discountType: "fixed", discountValue: 50 })).toEqual({
      discountAmount: { amount: "50.00", appliesOnEachItem: false },
    });
    expect(buildDiscountValue({ discountType: "percentage", discountValue: 15 })).toEqual({
      percentage: 0.15,
    });
  });

  test("a points payout (no discount value) is not synced", () => {
    expect(buildDiscountValue({ points: 100 })).toBeNull();
    expect(buildDiscountValue(null)).toBeNull();
  });

  test("a zero or negative value is not synced", () => {
    expect(
      buildDiscountValue({
        type: LoyaltyPointRewardSubType.DISCOUNT_FIXED,
        amount: 0,
        currency: "INR",
      }),
    ).toBeNull();
  });
});

describe("buildBasicCodeDiscountInput", () => {
  test("the redemption code is the discount code, used once, by one customer", () => {
    const input = buildBasicCodeDiscountInput({
      code: "RU-ABCDEFGHJK",
      rewardName: "10% off",
      value: { type: LoyaltyPointRewardSubType.DISCOUNT_PERCENTAGE, percentage: 10 },
      rules: { shopify: { enabled: true } },
      issuedAt: ISSUED,
      expiresAt: null,
    })!;

    expect(input.code).toBe("RU-ABCDEFGHJK");
    expect(input.usageLimit).toBe(1);
    expect(input.appliesOncePerCustomer).toBe(true);
    expect(input.startsAt).toBe(ISSUED.toISOString());
    expect(input.endsAt).toBeUndefined();
    expect(input.combinesWith).toEqual({
      orderDiscounts: false,
      productDiscounts: false,
      shippingDiscounts: false,
    });
  });

  test("the redemption's own expiry wins over the reward's valid_for_days", () => {
    const expiresAt = new Date("2026-09-20T09:00:00.000Z");
    const input = buildBasicCodeDiscountInput({
      code: "RU-1",
      rewardName: "r",
      value: { type: LoyaltyPointRewardSubType.DISCOUNT_FIXED, amount: 5, currency: "INR" },
      rules: { shopify: { enabled: true, valid_for_days: 30 } },
      issuedAt: ISSUED,
      expiresAt,
    })!;
    expect(input.endsAt).toBe(expiresAt.toISOString());
  });

  test("valid_for_days is counted from issue when the redemption has no expiry", () => {
    const input = buildBasicCodeDiscountInput({
      code: "RU-1",
      rewardName: "r",
      value: { type: LoyaltyPointRewardSubType.DISCOUNT_FIXED, amount: 5, currency: "INR" },
      rules: { shopify: { enabled: true, valid_for_days: 7 } },
      issuedAt: ISSUED,
      expiresAt: null,
    })!;
    expect(input.endsAt).toBe("2026-09-24T09:00:00.000Z");
  });

  test("the reward's minimum spend becomes Shopify's subtotal requirement", () => {
    const input = buildBasicCodeDiscountInput({
      code: "RU-1",
      rewardName: "r",
      value: { type: LoyaltyPointRewardSubType.DISCOUNT_FIXED, amount: 5, currency: "INR" },
      rules: {
        spend_requirements: { enabled: true, minimum_spend: 500 },
        shopify: { enabled: true },
      },
      issuedAt: ISSUED,
      expiresAt: null,
    })!;
    expect(input.minimumRequirement).toEqual({
      subtotal: { greaterThanOrEqualToSubtotal: "500.00" },
    });
  });
});

describe("discountWindow", () => {
  const base = { issuedAt: ISSUED, expiresAt: null };

  test("no deadline anywhere means a code that does not expire", () => {
    expect(discountWindow({ ...base, rules: {} })).toEqual({ startsAt: ISSUED, endsAt: null });
  });

  test("the coupon's Valid To closes the code, not just the offer", () => {
    const window = discountWindow({
      ...base,
      rules: { time_restrictions: { enabled: true, valid_until: "2026-10-01T00:00:00.000Z" } },
    });
    expect(window?.endsAt?.toISOString()).toBe("2026-10-01T00:00:00.000Z");
  });

  test("the earliest deadline wins, whichever field it came from", () => {
    const window = discountWindow({
      ...base,
      rules: {
        time_restrictions: { enabled: true, valid_until: "2026-12-01T00:00:00.000Z" },
        shopify: { enabled: true, valid_for_days: 7 },
      },
    });
    // 7 days from issue beats a December end date.
    expect(window?.endsAt?.toISOString()).toBe("2026-09-24T09:00:00.000Z");
  });

  test("a code issued before the promotion opens starts when the promotion does", () => {
    const window = discountWindow({
      ...base,
      rules: { time_restrictions: { enabled: true, valid_from: "2026-10-01T00:00:00.000Z" } },
    });
    expect(window?.startsAt.toISOString()).toBe("2026-10-01T00:00:00.000Z");
  });

  test("a Valid From already past does not push the start backwards", () => {
    const window = discountWindow({
      ...base,
      rules: { time_restrictions: { enabled: true, valid_from: "2026-01-01T00:00:00.000Z" } },
    });
    expect(window?.startsAt).toBe(ISSUED);
  });

  test("a promotion that has already ended yields no window at all", () => {
    expect(
      discountWindow({
        ...base,
        rules: { time_restrictions: { enabled: true, valid_until: "2026-09-01T00:00:00.000Z" } },
      }),
    ).toBeNull();
  });

  test("an unparseable date is ignored rather than turned into an invalid window", () => {
    expect(
      discountWindow({ ...base, rules: { time_restrictions: { enabled: true, valid_until: "" } } }),
    ).toEqual({ startsAt: ISSUED, endsAt: null });
  });
});

describe("stock and per-customer limits", () => {
  test("are not sent to Shopify — each issued code is single-use regardless", () => {
    const input = buildBasicCodeDiscountInput({
      code: "RU-1",
      rewardName: "r",
      value: { type: LoyaltyPointRewardSubType.DISCOUNT_FIXED, amount: 5, currency: "INR" },
      rules: {
        quantity_restrictions: { max_redemptions_per_customer: 3 },
        shopify: { enabled: true },
      },
      issuedAt: ISSUED,
      expiresAt: null,
    })!;

    // A per-customer limit of 3 means three codes, not one code usable three times.
    expect(input.usageLimit).toBe(1);
    expect(input.appliesOncePerCustomer).toBe(true);
  });
});

describe("syncRedemptionToShopify", () => {
  test("creates the discount and records the share link on the redemption", async () => {
    (prisma.loyaltyRedemption.findUnique as Mock).mockResolvedValue(redemption());

    const outcome = await syncRedemptionToShopify("red-1");

    expect(outcome.status).toBe("created");
    expect(outcome.discountUrl).toBe("https://demo.myshopify.com/discount/RU-ABCDEFGHJK");
    expect(graphqlRequest).toHaveBeenCalledOnce();
    expect((prisma.loyaltyRedemption.update as Mock).mock.calls[0][0].data).toMatchObject({
      shopifyDiscountId: "gid://shopify/DiscountCodeNode/1",
      shopifyDiscountError: null,
    });
  });

  test("does nothing for a reward that has not opted in", async () => {
    (prisma.loyaltyRedemption.findUnique as Mock).mockResolvedValue(
      redemption({
        reward: { name: "r", rewardValue: {}, redemptionRules: {} },
      }),
    );

    expect(await syncRedemptionToShopify("red-1")).toEqual({
      status: "skipped",
      reason: "not_enabled",
    });
    expect(graphqlRequest).not.toHaveBeenCalled();
    expect(prisma.loyaltyRedemption.update).not.toHaveBeenCalled();
  });

  test("never creates a second discount for a redemption already synced", async () => {
    (prisma.loyaltyRedemption.findUnique as Mock).mockResolvedValue(
      redemption({
        shopifyDiscountId: "gid://shopify/DiscountCodeNode/9",
        shopifyDiscountUrl: "https://demo.myshopify.com/discount/RU-ABCDEFGHJK",
      }),
    );

    const outcome = await syncRedemptionToShopify("red-1");
    expect(outcome.status).toBe("skipped");
    expect(outcome.reason).toBe("already_synced");
    expect(graphqlRequest).not.toHaveBeenCalled();
  });

  test("a userErrors response is recorded, not thrown — the redemption still stands", async () => {
    (prisma.loyaltyRedemption.findUnique as Mock).mockResolvedValue(redemption());
    graphqlRequest.mockResolvedValue({
      data: {
        discountCodeBasicCreate: {
          codeDiscountNode: null,
          userErrors: [{ field: ["basicCodeDiscount", "code"], message: "Code must be unique" }],
        },
      },
    });

    const outcome = await syncRedemptionToShopify("red-1");

    expect(outcome.status).toBe("failed");
    expect(outcome.discountUrl).toBeUndefined();
    expect((prisma.loyaltyRedemption.update as Mock).mock.calls[0][0].data).toMatchObject({
      shopifyDiscountId: null,
      shopifyDiscountError: "basicCodeDiscount.code: Code must be unique",
    });
  });

  test("a shop without write_discounts fails soft", async () => {
    (prisma.loyaltyRedemption.findUnique as Mock).mockResolvedValue(redemption());
    graphqlRequest.mockRejectedValue(new Error("Required access: write_discounts"));

    const outcome = await syncRedemptionToShopify("red-1");

    expect(outcome.status).toBe("failed");
    expect(outcome.reason).toContain("write_discounts");
  });

  test("a disconnected shop is skipped without touching the row", async () => {
    (prisma.loyaltyRedemption.findUnique as Mock).mockResolvedValue(redemption());
    (getShopifyInfo as Mock).mockResolvedValue(null);

    expect(await syncRedemptionToShopify("red-1")).toEqual({
      status: "skipped",
      reason: "shop_not_connected",
    });
    expect(prisma.loyaltyRedemption.update).not.toHaveBeenCalled();
  });
});

test("the share link is what applies the code for the customer", () => {
  expect(discountShareUrl("demo.myshopify.com", "RU-1")).toBe(
    "https://demo.myshopify.com/discount/RU-1",
  );
});
