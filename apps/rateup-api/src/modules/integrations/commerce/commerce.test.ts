import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}));
vi.mock("../../../utils/prisma.js", () => ({
  default: { loyaltyRedemption: { findUnique: vi.fn(), update: vi.fn() } },
}));
vi.mock("../../../workers/bullmq/queues/webhook.queue.js", () => ({
  shopifyLoyaltyQueue: { add: vi.fn() },
}));
vi.mock("../../loyalty/accounts/account.service.js", () => ({ awardPoints: vi.fn() }));
vi.mock("../../loyalty/accounts/memberLookup.js", () => ({ resolveProgramMember: vi.fn() }));
vi.mock("../../loyalty/accounts/pointsReversal.service.js", () => ({
  reversePurchasePoints: vi.fn(),
}));
vi.mock("../../loyalty/program/program.service.js", () => ({ getLoyaltyProgramByOrg: vi.fn() }));
vi.mock("../../loyalty/redemptions/redemption.service.js", () => ({ applyRedemption: vi.fn() }));
vi.mock("../events/emitIntegrationEvent.js", () => ({ emitIntegrationEvent: vi.fn() }));
vi.mock("./surveys.js", () => ({ scheduleOrderSurvey: vi.fn() }));
// The real registry would pull in Shopify; these tests pass their own providers.
vi.mock("./registry.js", () => ({ COMMERCE_PROVIDERS: [], getCommerceProvider: vi.fn() }));

import prisma from "../../../utils/prisma.js";
import { shopifyLoyaltyQueue } from "../../../workers/bullmq/queues/webhook.queue.js";
import { awardPoints } from "../../loyalty/accounts/account.service.js";
import { resolveProgramMember } from "../../loyalty/accounts/memberLookup.js";
import { reversePurchasePoints } from "../../loyalty/accounts/pointsReversal.service.js";
import { getLoyaltyProgramByOrg } from "../../loyalty/program/program.service.js";
import { applyRedemption } from "../../loyalty/redemptions/redemption.service.js";
import { emitIntegrationEvent } from "../events/emitIntegrationEvent.js";
import { toCommerceLoyaltyJob } from "../shopify/shopifyLoyalty.service.js";
import type { CommerceOrder, CommerceProvider, CommerceStore } from "./commerce.types.js";
import { syncRedemptionDiscount } from "./discounts.js";
import {
  commerceAwardKey,
  processCommerceOrderLoyalty,
  type CommerceLoyaltyJobData,
} from "./loyalty.js";
import { onOrderEvent } from "./orders.js";
import { scheduleOrderSurvey } from "./surveys.js";

type Mock = ReturnType<typeof vi.fn>;
const db = prisma as unknown as Record<string, Record<string, Mock>>;

const WOO = "https://shop.example.com";

function provider(over: Partial<CommerceProvider> = {}): CommerceProvider {
  return {
    name: "woocommerce",
    label: "WooCommerce",
    surveysField: "orderSurveys",
    saveSurveys: vi.fn(),
    resolveTemplateValue: vi.fn(() => ""),
    loyaltyEnabled: (program) => Boolean(program.enableWooOrderPoints),
    discountRulesKey: "woocommerce",
    createDiscountCode: vi.fn(async () => ({ status: "created" as const, discountId: "c-1" })),
    deactivateDiscountCode: vi.fn(async () => true),
    ...over,
  };
}

const job = (over: Partial<CommerceLoyaltyJobData> = {}): CommerceLoyaltyJobData => ({
  provider: "woocommerce",
  storeId: WOO,
  status: "paid",
  eventKey: "completed",
  orgId: "org-1",
  orderId: "901",
  phone: "919000000001",
  email: null,
  amount: 1200,
  discountCodes: [],
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  (getLoyaltyProgramByOrg as Mock).mockResolvedValue({
    id: "prog-1",
    status: "active",
    enableWooOrderPoints: true,
    defaultCountryCode: "IN",
  });
  (resolveProgramMember as Mock).mockResolvedValue({
    status: "matched",
    account: { id: "acct-1", contactId: "contact-1" },
    matchedBy: "phone",
  });
  (awardPoints as Mock).mockResolvedValue({ replayed: false, pointsAwarded: 12 });
  (reversePurchasePoints as Mock).mockResolvedValue({ status: "reversed" });
});

describe("store loyalty", () => {
  test("a paid order awards under a key naming the store and the order", async () => {
    await expect(processCommerceOrderLoyalty(job(), provider())).resolves.toBe("awarded");

    expect(awardPoints).toHaveBeenCalledWith("prog-1", "contact-1", 1200, {
      channel: "woocommerce",
      orderId: "901",
      notes: "WooCommerce order auto-points (paid)",
      idempotencyKey: `woocommerce:${WOO}:901`,
    });
  });

  test("a refund reverses the award, as a refund", async () => {
    await expect(
      processCommerceOrderLoyalty(job({ status: "refunded" }), provider()),
    ).resolves.toBe("reversed");

    expect(reversePurchasePoints).toHaveBeenCalledWith(
      expect.objectContaining({
        originalIdempotencyKey: `woocommerce:${WOO}:901`,
        idempotencyKey: `woocommerce:${WOO}:901:reversal`,
        source: "order_refunded",
        reason: "WooCommerce order refunded",
      }),
    );
  });

  test("each store has its own points switch", async () => {
    (getLoyaltyProgramByOrg as Mock).mockResolvedValue({
      id: "prog-1",
      status: "active",
      enableShopifyOrderPoints: true,
    });

    await expect(processCommerceOrderLoyalty(job(), provider())).resolves.toBe("program_off");
    expect(awardPoints).not.toHaveBeenCalled();
  });

  test("vouchers are marked used by the store that took them", async () => {
    await processCommerceOrderLoyalty(
      job({ status: "created", discountCodes: ["RU-1"] }),
      provider(),
    );

    expect(applyRedemption).toHaveBeenCalledWith(
      { redemptionCode: "RU-1", appliedBy: "woocommerce", notes: "WooCommerce order 901" },
      "org-1",
    );
  });

  test("a store that awards on completion earns nothing on payment, and the points on completion", async () => {
    const completing = provider({ awardStatus: "fulfilled" });

    await expect(processCommerceOrderLoyalty(job(), completing)).resolves.toBe("ignored");
    expect(awardPoints).not.toHaveBeenCalled();

    await expect(
      processCommerceOrderLoyalty(job({ status: "fulfilled" }), completing),
    ).resolves.toBe("awarded");
    expect(awardPoints).toHaveBeenCalledWith("prog-1", "contact-1", 1200, {
      channel: "woocommerce",
      orderId: "901",
      notes: "WooCommerce order auto-points (completed)",
      idempotencyKey: `woocommerce:${WOO}:901`,
    });
  });

  test("a fulfilment status neither awards nor reverses", async () => {
    await expect(
      processCommerceOrderLoyalty(job({ status: "fulfilled" }), provider()),
    ).resolves.toBe("ignored");
    expect(awardPoints).not.toHaveBeenCalled();
    expect(reversePurchasePoints).not.toHaveBeenCalled();
  });
});

describe("a Shopify job queued before the commerce layer", () => {
  test("reads as the same store, order and key it always had", () => {
    const converted = toCommerceLoyaltyJob({
      shop: "demo.myshopify.com",
      topic: "ORDERS_PAID" as never,
      orgId: "org-1",
      orderId: "5551",
      phone: null,
      email: "a@b.c",
      amount: 10,
    });

    expect(converted).toMatchObject({
      provider: "shopify",
      storeId: "demo.myshopify.com",
      status: "paid",
      eventKey: "ORDERS_PAID",
    });
    expect(commerceAwardKey(converted.provider, converted.storeId, converted.orderId)).toBe(
      "shopify:demo.myshopify.com:5551",
    );
  });
});

describe("the order pipeline", () => {
  const store = (p: CommerceProvider): CommerceStore => ({
    provider: p,
    storeId: WOO,
    orgId: "org-1",
    integration: { id: "int-1" } as never,
  });
  const order = (over: Partial<CommerceOrder> = {}): CommerceOrder => ({
    orderId: "901",
    status: "paid",
    eventKey: "completed",
    customer: { phone: "919000000001", email: null },
    amount: 1200,
    productIds: ["p-1"],
    discountCodes: [],
    raw: { id: 901 },
    ...over,
  });

  test("queues loyalty, tells integrations, schedules the survey and runs automation", async () => {
    const runOrderAutomation = vi.fn();
    const p = provider({ runOrderAutomation });

    await onOrderEvent(store(p), order());

    expect(shopifyLoyaltyQueue.add).toHaveBeenCalledWith(
      "order-loyalty",
      expect.objectContaining({ provider: "woocommerce", storeId: WOO, status: "paid" }),
      expect.objectContaining({ jobId: `loyalty-${WOO}-completed-901` }),
    );
    expect(emitIntegrationEvent).toHaveBeenCalledWith(
      "org-1",
      expect.objectContaining({ type: "order.paid" }),
    );
    expect(scheduleOrderSurvey).toHaveBeenCalled();
    expect(runOrderAutomation).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      "919000000001",
    );
  });

  test("no phone: loyalty and integrations still hear about it, WhatsApp paths do not", async () => {
    const runOrderAutomation = vi.fn();

    await onOrderEvent(
      store(provider({ runOrderAutomation })),
      order({ customer: { phone: null, email: "a@b.c" } }),
    );

    expect(shopifyLoyaltyQueue.add).toHaveBeenCalled();
    expect(emitIntegrationEvent).toHaveBeenCalled();
    expect(scheduleOrderSurvey).not.toHaveBeenCalled();
    expect(runOrderAutomation).not.toHaveBeenCalled();
  });

  test("an order with no id cannot earn points, but is still news", async () => {
    await onOrderEvent(store(provider()), order({ orderId: null }));

    expect(shopifyLoyaltyQueue.add).not.toHaveBeenCalled();
    expect(emitIntegrationEvent).toHaveBeenCalled();
  });
});

describe("syncing a redemption's discount code", () => {
  const redemption = (rules: Record<string, unknown>) => ({
    id: "red-1",
    redemptionCode: "RU-ABC",
    createdAt: new Date("2026-09-17T09:00:00Z"),
    expiresAt: null,
    rewardId: "rw-1",
    storeDiscountId: null,
    reward: {
      name: "10% off",
      rewardValue: { type: "discount_percentage", percentage: 10 },
      redemptionRules: rules,
    },
    account: { contact: { orgId: "org-1" } },
  });

  test("goes to the store whose settings the reward opted into", async () => {
    const shopify = provider({ name: "shopify", discountRulesKey: "shopify" });
    const woo = provider();
    db.loyaltyRedemption.findUnique.mockResolvedValue(
      redemption({ woocommerce: { enabled: true } }),
    );

    await syncRedemptionDiscount("red-1", [shopify, woo]);

    expect(shopify.createDiscountCode).not.toHaveBeenCalled();
    expect(woo.createDiscountCode).toHaveBeenCalledWith(
      "org-1",
      expect.objectContaining({
        code: "RU-ABC",
        value: { kind: "percentage", percentage: 10 },
        combinesWith: { order: false, product: false, shipping: false },
      }),
    );
    expect(db.loyaltyRedemption.update).toHaveBeenCalledWith({
      where: { id: "red-1" },
      data: {
        storeDiscountId: "c-1",
        storeDiscountUrl: null,
        storeDiscountError: null,
        storeSyncedAt: expect.any(Date),
      },
    });
  });

  test("a store that was never reached leaves the redemption untouched", async () => {
    const woo = provider({
      createDiscountCode: vi.fn(async () => ({
        status: "skipped" as const,
        reason: "not_connected",
      })),
    });
    db.loyaltyRedemption.findUnique.mockResolvedValue(
      redemption({ woocommerce: { enabled: true } }),
    );

    await expect(syncRedemptionDiscount("red-1", [woo])).resolves.toMatchObject({
      status: "skipped",
    });
    expect(db.loyaltyRedemption.update).not.toHaveBeenCalled();
  });

  test("a reward that opted into no store is skipped", async () => {
    db.loyaltyRedemption.findUnique.mockResolvedValue(redemption({}));

    await expect(syncRedemptionDiscount("red-1", [provider()])).resolves.toEqual({
      status: "skipped",
      reason: "not_enabled",
    });
  });
});
