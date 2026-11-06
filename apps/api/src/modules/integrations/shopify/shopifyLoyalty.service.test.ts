import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), trace: vi.fn() },
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

import { ShopifyEvents } from "../../../types/enums.js";
import { awardPoints } from "../../loyalty/accounts/account.service.js";
import { resolveProgramMember } from "../../loyalty/accounts/memberLookup.js";
import { reversePurchasePoints } from "../../loyalty/accounts/pointsReversal.service.js";
import { getLoyaltyProgramByOrg } from "../../loyalty/program/program.service.js";
import { shopifyLoyaltyQueue } from "../../../workers/bullmq/queues/webhook.queue.js";
import { applyRedemption } from "../../loyalty/redemptions/redemption.service.js";
import { LoyaltyError } from "../../loyalty/loyalty.errors.js";
import {
  enqueueShopifyOrderLoyalty,
  extractDiscountCodes,
  extractOrderIdentity,
  extractPurchaseAmount,
  processShopifyOrderLoyalty,
} from "./shopifyLoyalty.service.js";
import type { ShopifyBody } from "./shopify.types.js";

type Mock = ReturnType<typeof vi.fn>;
const body = (o: Record<string, unknown>) => o as unknown as ShopifyBody;

const SHOP = "demo.myshopify.com";
const job = (over: Record<string, unknown> = {}) => ({
  shop: SHOP,
  topic: ShopifyEvents.ORDERS_PAID,
  orgId: "org-1",
  orderId: "5551",
  phone: "919000000001",
  email: "ann@example.com",
  amount: 5000,
  ...over,
});

const account = { id: "acct-1", contactId: "contact-1" };

beforeEach(() => {
  vi.clearAllMocks();
  (getLoyaltyProgramByOrg as Mock).mockResolvedValue({
    id: "prog-1",
    status: "active",
    enableShopifyOrderPoints: true,
    defaultCountryCode: "IN",
  });
  (resolveProgramMember as Mock).mockResolvedValue({
    status: "matched",
    account,
    matchedBy: "phone",
  });
  (awardPoints as Mock).mockResolvedValue({ replayed: false, pointsAwarded: 100 });
  (reversePurchasePoints as Mock).mockResolvedValue({ status: "reversed" });
});

// ===========================================================================
// The pure half — no mocks needed, which is the point of extracting it
// ===========================================================================

describe("extractPurchaseAmount", () => {
  test("uses the shop's own currency, not the buyer's", () => {
    // presentment_money is what the customer saw. Awarding on it means a store selling
    // internationally prices points against rules written in a different currency.
    const amount = extractPurchaseAmount(
      body({
        current_subtotal_price_set: {
          shop_money: { amount: "4000.00", currency_code: "INR" },
          presentment_money: { amount: "48.00", currency_code: "USD" },
        },
        total_price: "4000.00",
      }),
    );

    expect(amount).toBe(4000);
  });

  test("uses the post-discount subtotal", () => {
    // total_line_items_price is the price *before* discounts, so reading it made a
    // fully-discounted order earn as if it had been paid for in full.
    const amount = extractPurchaseAmount(
      body({
        total_line_items_price_set: { shop_money: { amount: "5000.00" } },
        current_subtotal_price_set: { shop_money: { amount: "0.00" } },
        total_price: "0.00",
      }),
    );

    expect(amount).toBe(0);
  });

  test("falls back through the older fields", () => {
    expect(extractPurchaseAmount(body({ total_price: "250.50" }))).toBe(250.5);
    expect(extractPurchaseAmount(body({ subtotal_price: "99" }))).toBe(99);
  });

  test("an unreadable amount is null, not zero", () => {
    // Zero would book a real purchase worth nothing; null lets the caller say it could not
    // read the order and award nothing at all.
    expect(extractPurchaseAmount(body({ total_price: "not-a-number" }))).toBeNull();
    expect(extractPurchaseAmount(body({}))).toBeNull();
  });
});

describe("extractOrderIdentity", () => {
  test("finds the phone wherever the checkout put it", () => {
    expect(
      extractOrderIdentity(body({ id: 1, customer: { phone: "+91 90000 00001" } })).phone,
    ).toBe("+91 90000 00001");
    expect(extractOrderIdentity(body({ id: 1, billing_address: { phone: "9000" } })).phone).toBe(
      "9000",
    );
  });

  test("finds the email, which most orders actually carry", () => {
    expect(extractOrderIdentity(body({ id: 1, email: "ann@example.com" })).email).toBe(
      "ann@example.com",
    );
    expect(extractOrderIdentity(body({ id: 1, customer: { email: "c@example.com" } })).email).toBe(
      "c@example.com",
    );
  });

  test("an order with neither is reported as such rather than guessed at", () => {
    const id = extractOrderIdentity(body({ id: 42 }));
    expect(id).toEqual({ orderId: "42", phone: null, email: null });
  });
});

// ===========================================================================
// Queueing
// ===========================================================================

describe("enqueueing", () => {
  test("the job id is keyed on the order, not the webhook", async () => {
    // Shopify redelivers orders/paid with a *fresh* webhook id, which is why the webhook
    // queue's own dedupe never caught it. Keying on the order is what collapses them.
    await enqueueShopifyOrderLoyalty(job() as never);

    const [, , opts] = (shopifyLoyaltyQueue.add as Mock).mock.calls[0];
    expect(opts.jobId).toBe(`loyalty-${SHOP}-ORDERS_PAID-5551`);
    // BullMQ 6 throws "Custom Id cannot contain :" at add() time, which failed
    // the whole order webhook job.
    expect(opts.jobId).not.toContain(":");
    expect(opts.attempts).toBe(5);
  });
});

// ===========================================================================
// The bridge
// ===========================================================================

describe("awarding", () => {
  test("a paid order awards once, keyed on the order", async () => {
    const outcome = await processShopifyOrderLoyalty(job() as never);

    expect(outcome).toBe("awarded");
    expect(awardPoints).toHaveBeenCalledWith("prog-1", "contact-1", 5000, {
      channel: "shopify",
      orderId: "5551",
      notes: "Shopify order auto-points (paid)",
      idempotencyKey: `shopify:${SHOP}:5551`,
    });
  });

  test("a redelivery of the same order awards nothing further", async () => {
    (awardPoints as Mock).mockResolvedValue({ replayed: true, pointsAwarded: 100 });

    expect(await processShopifyOrderLoyalty(job() as never)).toBe("duplicate");
  });

  test("an email-only customer still earns", async () => {
    (resolveProgramMember as Mock).mockResolvedValue({
      status: "matched",
      account,
      matchedBy: "email",
    });

    expect(await processShopifyOrderLoyalty(job({ phone: null }) as never)).toBe("awarded");
  });

  test("an unreadable amount awards nothing rather than zero points", async () => {
    expect(await processShopifyOrderLoyalty(job({ amount: null }) as never)).toBe("no_amount");
    expect(awardPoints).not.toHaveBeenCalled();
  });

  test("a shared email awards nobody", async () => {
    (resolveProgramMember as Mock).mockResolvedValue({
      status: "ambiguous",
      matchedBy: "email",
      candidateAccountIds: ["a", "b"],
    });

    expect(await processShopifyOrderLoyalty(job() as never)).toBe("ambiguous_email");
    expect(awardPoints).not.toHaveBeenCalled();
  });

  test("a non-member ordering is ordinary traffic, not an error", async () => {
    (resolveProgramMember as Mock).mockResolvedValue({
      status: "not_found",
      reason: "not_enrolled",
    });

    expect(await processShopifyOrderLoyalty(job() as never)).toBe("no_match");
  });
});

describe("the programme gate", () => {
  const cases: Array<[string, { status: string; enableShopifyOrderPoints: boolean } | null]> = [
    ["a programme that is not live", { status: "draft", enableShopifyOrderPoints: true }],
    ["the toggle switched off", { status: "active", enableShopifyOrderPoints: false }],
    ["no programme at all", null],
  ];

  test.each(cases)("awards nothing with %s", async (_label, program) => {
    (getLoyaltyProgramByOrg as Mock).mockResolvedValue(
      program ? { id: "prog-1", defaultCountryCode: "IN", ...program } : null,
    );

    expect(await processShopifyOrderLoyalty(job() as never)).toBe("program_off");
    expect(awardPoints).not.toHaveBeenCalled();
  });
});

describe("cancelling", () => {
  test("a cancelled order reverses through the shared service", async () => {
    const outcome = await processShopifyOrderLoyalty(
      job({ topic: ShopifyEvents.ORDERS_CANCELLED }) as never,
    );

    expect(outcome).toBe("reversed");
    expect(reversePurchasePoints).toHaveBeenCalledWith(
      expect.objectContaining({
        originalIdempotencyKey: `shopify:${SHOP}:5551`,
        idempotencyKey: `shopify:${SHOP}:5551:reversal`,
        source: "order_cancelled",
        orgId: "org-1",
      }),
    );
  });

  test("a redelivered cancellation reverses once", async () => {
    (reversePurchasePoints as Mock).mockResolvedValue({ status: "already_reversed" });

    expect(
      await processShopifyOrderLoyalty(job({ topic: ShopifyEvents.ORDERS_CANCELLED }) as never),
    ).toBe("already_reversed");
  });

  test("a cancelled fulfillment never takes points away", async () => {
    // It means the warehouse job was cancelled, not the sale — and the order is routinely
    // re-fulfilled moments later. Revoking here would rob a customer who kept their goods.
    const outcome = await processShopifyOrderLoyalty(
      job({ topic: ShopifyEvents.FULFILLMENT_ORDERS_CANCELLED }) as never,
    );

    expect(outcome).toBe("ignored");
    expect(reversePurchasePoints).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// Vouchers applied at Shopify checkout
// ===========================================================================

describe("vouchers used at Shopify checkout", () => {
  test("extracts the applied codes from the order", () => {
    expect(
      extractDiscountCodes(
        body({ discount_codes: [{ code: " RU-RQLHC2KGXV ", amount: "10.00" }, { code: "" }] }),
      ),
    ).toEqual(["RU-RQLHC2KGXV"]);
    expect(extractDiscountCodes(body({ discount_codes: null }))).toEqual([]);
  });

  test("marks the voucher used, the same way the cashier button does", async () => {
    await processShopifyOrderLoyalty(
      job({ topic: ShopifyEvents.ORDERS_CREATE, discountCodes: ["RU-RQLHC2KGXV"] }),
    );

    expect(applyRedemption).toHaveBeenCalledWith(
      { redemptionCode: "RU-RQLHC2KGXV", appliedBy: "shopify", notes: "Shopify order 5551" },
      "org-1",
    );
  });

  test("still marks it used when Shopify orders earn no points", async () => {
    (getLoyaltyProgramByOrg as Mock).mockResolvedValue({
      id: "prog-1",
      status: "active",
      enableShopifyOrderPoints: false,
    });

    await processShopifyOrderLoyalty(job({ discountCodes: ["RU-RQLHC2KGXV"] }));

    expect(applyRedemption).toHaveBeenCalled();
  });

  test("a code that isn't a RateUp voucher, or is already used, doesn't cost the points", async () => {
    (applyRedemption as Mock).mockRejectedValue(
      new LoyaltyError("VOUCHER_ALREADY_USED", "Redemption already applied"),
    );

    const outcome = await processShopifyOrderLoyalty(job({ discountCodes: ["SUMMER10"] }));

    expect(outcome).toBe("awarded");
  });

  test("a cancellation does not touch vouchers", async () => {
    await processShopifyOrderLoyalty(
      job({ topic: ShopifyEvents.ORDERS_CANCELLED, discountCodes: ["RU-RQLHC2KGXV"] }),
    );

    expect(applyRedemption).not.toHaveBeenCalled();
  });
});
