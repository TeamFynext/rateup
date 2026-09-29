import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}));
vi.mock("../../../utils/prisma.js", () => ({
  default: { integration: { findUnique: vi.fn() } },
}));

// The store's coupon endpoint, behind axios.
const store = vi.hoisted(() => ({
  post: vi.fn(),
  put: vi.fn(),
}));
vi.mock("axios", () => {
  const axios = {
    create: vi.fn(() => ({ post: store.post, put: store.put })),
    isAxiosError: (error: unknown) => (error as { isAxiosError?: boolean })?.isAxiosError === true,
  };
  return { default: axios, ...axios };
});

import prisma from "../../../utils/prisma.js";
import type { CommerceDiscountInput } from "../commerce/commerce.types.js";
import {
  createWooDiscountCode,
  deactivateWooDiscountCode,
  toWooCoupon,
} from "./woocommerce.coupons.js";

type Mock = ReturnType<typeof vi.fn>;
const findIntegration = prisma.integration.findUnique as unknown as Mock;

const NOW = new Date("2026-09-28T10:00:00Z");

const input = (over: Partial<CommerceDiscountInput> = {}): CommerceDiscountInput => ({
  code: "RU-ABCDEFGHJK",
  title: "Loyalty reward: 10% off (RU-ABCDEFGHJK)",
  startsAt: NOW,
  endsAt: new Date("2026-10-28T10:00:00Z"),
  value: { kind: "percentage", percentage: 10 },
  minimumSpend: null,
  combinesWith: { order: false, product: false, shipping: false },
  ...over,
});

const connected = {
  id: "int-1",
  active: true,
  credential: {
    storeUrl: "https://shop.example.com",
    consumerKey: "ck",
    consumerSecret: "cs",
    webhookSecret: "secret",
    webhooks: [],
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  findIntegration.mockResolvedValue(connected);
  store.post.mockResolvedValue({ data: { id: 4321, code: "ru-abcdefghjk" } });
  store.put.mockResolvedValue({ data: { id: 4321 } });
});

describe("a reward as a WooCommerce coupon", () => {
  test("single use, expiring with the reward, standing alone", () => {
    expect(toWooCoupon(input(), NOW)).toEqual({
      coupon: {
        code: "RU-ABCDEFGHJK",
        description: "Loyalty reward: 10% off (RU-ABCDEFGHJK)",
        discount_type: "percent",
        amount: "10.00",
        date_expires_gmt: "2026-10-28T10:00:00",
        individual_use: true,
        usage_limit: 1,
        usage_limit_per_user: 1,
      },
    });
  });

  test("a fixed amount comes off the cart, with the reward's minimum spend", () => {
    const built = toWooCoupon(
      input({ value: { kind: "fixed", amount: 150 }, minimumSpend: 999.5, endsAt: null }),
      NOW,
    );

    expect(built).toMatchObject({
      coupon: {
        discount_type: "fixed_cart",
        amount: "150.00",
        minimum_amount: "999.50",
        date_expires_gmt: null,
      },
    });
  });

  test("a reward that combines with other discounts is not individual use", () => {
    const built = toWooCoupon(
      input({ combinesWith: { order: false, product: true, shipping: false } }),
      NOW,
    );
    expect(built).toMatchObject({ coupon: { individual_use: false } });
  });

  test("a promotion that opens later is refused: WooCommerce coupons cannot start later", () => {
    expect(toWooCoupon(input({ startsAt: new Date("2026-10-01T00:00:00Z") }), NOW)).toEqual({
      reason: "woocommerce_coupons_cannot_start_later",
    });
  });
});

describe("creating the coupon", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  test("posts it and records WooCommerce's id; there is no share link", async () => {
    await expect(createWooDiscountCode("org-1", input())).resolves.toEqual({
      status: "created",
      discountId: "4321",
    });
    expect(store.post).toHaveBeenCalledWith(
      "/coupons",
      expect.objectContaining({ code: "RU-ABCDEFGHJK", usage_limit: 1 }),
    );
  });

  test("a store that is not connected is never reached", async () => {
    findIntegration.mockResolvedValue({ ...connected, active: false });

    await expect(createWooDiscountCode("org-1", input())).resolves.toEqual({
      status: "skipped",
      reason: "store_not_connected",
    });
    expect(store.post).not.toHaveBeenCalled();
  });

  test("a refusal is recorded in WooCommerce's own words, never thrown", async () => {
    store.post.mockRejectedValue(
      Object.assign(new Error("HTTP 400"), {
        isAxiosError: true,
        response: {
          status: 400,
          data: {
            code: "woocommerce_rest_coupon_code_already_exists",
            message: "The coupon code already exists",
          },
        },
      }),
    );

    await expect(createWooDiscountCode("org-1", input())).resolves.toEqual({
      status: "failed",
      reason: "woocommerce_rest_coupon_code_already_exists: The coupon code already exists",
    });
  });
});

describe("deactivating the coupon", () => {
  test("expires it now, which keeps it in the merchant's coupon list", async () => {
    await expect(deactivateWooDiscountCode("org-1", "4321")).resolves.toBe(true);
    expect(store.put).toHaveBeenCalledWith("/coupons/4321", {
      date_expires_gmt: expect.stringMatching(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d$/),
    });
  });

  test("a failure is reported, not thrown", async () => {
    store.put.mockRejectedValue(new Error("down"));
    await expect(deactivateWooDiscountCode("org-1", "4321")).resolves.toBe(false);
  });
});
