import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.hoisted(() => {
  process.env.RAZORPAY_API_KEY = "rzp_key";
  process.env.RAZORPAY_API_SECRET = "rzp_secret";
});

vi.mock("axios", () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn() } }));

vi.mock("../../utils/prisma.js", () => ({
  default: {
    order: { update: vi.fn(), findUnique: vi.fn(), findMany: vi.fn() },
    subscription: { update: vi.fn(), findUnique: vi.fn(), findMany: vi.fn() },
    subscriptionAddon: { findUnique: vi.fn(), create: vi.fn() },
    payments: { create: vi.fn() },
    rateupPlan: { findUnique: vi.fn(), findFirst: vi.fn() },
    paymentPlans: { findFirst: vi.fn() },
    usageStats: { update: vi.fn() },
  },
}));

vi.mock("../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}));

vi.mock("../../workers/bullmq/queues/index.js", () => ({
  notificationQueue: { add: vi.fn() },
}));

vi.mock("../../utils/email/payments/subscriptionActivated.js", () => ({
  createEmailBodySubscriptionActivated: vi.fn().mockResolvedValue("<p>activated</p>"),
}));

vi.mock("../integrations/shopify/shopify.billing.js", () => ({
  getRecurringCharge: vi.fn(),
}));
vi.mock("../integrations/shopify/shopify.credential.js", () => ({
  getShopifyInfo: vi.fn(),
}));

import axios from "axios";

import prisma from "../../utils/prisma.js";
import { reconcileOrgPayments, sweepMissedPayments } from "./payment.service.js";

const ORG = "org-1";
const SUB = "sub_ABC";

/** A tier the subscription can resolve to, so `updateSubscription` gets that far. */
function stubPlanLookup() {
  vi.mocked(prisma.paymentPlans.findFirst).mockResolvedValue({ id: "pp-1" } as never);
  vi.mocked(prisma.rateupPlan.findFirst).mockResolvedValue({
    id: "plan-1",
    name: "PRO PLAN",
    displayName: "Pro",
    planType: "SUBSCRIPTION",
    features: {},
  } as never);
}

/** Razorpay's answers, in the order the reconcile asks for them. */
function stubRazorpay(subscriptionEntity: Record<string, unknown>) {
  vi.mocked(axios.get).mockImplementation((url: string) => {
    if (url.includes("/v1/subscriptions/")) return Promise.resolve({ data: subscriptionEntity });
    if (url.includes("/v1/invoices")) {
      return Promise.resolve({ data: { items: [{ payment_id: "pay_1", paid_at: 100 }] } });
    }
    if (url.includes("/v1/payments/")) {
      return Promise.resolve({ data: { email: "a@b.com", amount: 100000, currency: "INR" } });
    }
    return Promise.resolve({ data: {} });
  });
}

beforeEach(() => {
  vi.mocked(prisma.order.findMany).mockResolvedValue([] as never);
  vi.mocked(prisma.order.update).mockResolvedValue({ id: "order-1" } as never);
  vi.mocked(prisma.subscription.update).mockResolvedValue({ id: "s-1" } as never);
  vi.mocked(prisma.usageStats.update).mockResolvedValue({} as never);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("reconcileOrgPayments — subscriptions", () => {
  test("replays a charge Razorpay took that we never recorded", async () => {
    const chargedThrough = Math.floor(Date.UTC(2026, 8, 30) / 1000);
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
      subscriptionRef: SUB,
      // A month behind what Razorpay says it has billed through: the missed webhook.
      expiresAt: new Date(Date.UTC(2026, 7, 30)),
    } as never);
    stubRazorpay({
      id: SUB,
      status: "active",
      plan_id: "plan_rzp",
      current_end: chargedThrough,
      notes: { orgId: ORG },
    });
    stubPlanLookup();

    const result = await reconcileOrgPayments(ORG);

    expect(result.changed).toBe(true);
    // The entitlement is the point: the org's subscription must be carried forward.
    expect(prisma.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { orgId: ORG },
        data: expect.objectContaining({ expiresAt: new Date(chargedThrough * 1000) }),
      }),
    );
  });

  test("does not re-apply a charge that already landed", async () => {
    const chargedThrough = Math.floor(Date.UTC(2026, 8, 30) / 1000);
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
      subscriptionRef: SUB,
      // Already level with Razorpay — running it again must be a no-op.
      expiresAt: new Date(chargedThrough * 1000),
    } as never);
    stubRazorpay({
      id: SUB,
      status: "active",
      plan_id: "plan_rzp",
      current_end: chargedThrough,
      notes: { orgId: ORG },
    });
    vi.mocked(prisma.order.findUnique).mockResolvedValue({
      subscriptionStatus: "active",
    } as never);

    const result = await reconcileOrgPayments(ORG);

    expect(result.changed).toBe(false);
    expect(prisma.subscription.update).not.toHaveBeenCalled();
    expect(prisma.usageStats.update).not.toHaveBeenCalled();
  });

  test("corrects a lifecycle status that never reached us", async () => {
    const chargedThrough = Math.floor(Date.UTC(2026, 8, 30) / 1000);
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
      subscriptionRef: SUB,
      expiresAt: new Date(chargedThrough * 1000),
    } as never);
    stubRazorpay({ id: SUB, status: "cancelled", current_end: chargedThrough, notes: {} });
    vi.mocked(prisma.order.findUnique).mockResolvedValue({
      subscriptionStatus: "active",
    } as never);

    const result = await reconcileOrgPayments(ORG);

    expect(result.changed).toBe(true);
    expect(prisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { subscriptionId: SUB },
        data: expect.objectContaining({ subscriptionStatus: "cancelled" }),
      }),
    );
  });

  test("is a no-op for an org that never subscribed", async () => {
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue(null as never);

    const result = await reconcileOrgPayments(ORG);

    expect(result.changed).toBe(false);
    expect(result.subscriptionStatus).toBeNull();
    expect(axios.get).not.toHaveBeenCalled();
  });
});

describe("reconcileOrgPayments — one-off orders", () => {
  beforeEach(() => {
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue(null as never);
  });

  test("records a captured payment the webhook never delivered", async () => {
    vi.mocked(prisma.order.findMany).mockResolvedValue([
      { id: "order-1", checkoutRefId: "order_rzp1", name: "Conversation pack" },
    ] as never);
    vi.mocked(axios.get).mockResolvedValue({
      data: {
        items: [
          { id: "pay_failed", status: "failed", amount: 100 },
          {
            id: "pay_ok",
            status: "captured",
            amount: 100000,
            currency: "INR",
            method: "card",
            created_at: 123,
            notes: { rateupOrderId: "order-1", addonQuantity: "2" },
          },
        ],
      },
    } as never);
    vi.mocked(prisma.payments.create).mockResolvedValue({ id: "p-1" } as never);
    vi.mocked(prisma.order.findUnique).mockResolvedValue({
      orgId: ORG,
      RateupPlan: { id: "addon-1", name: "PACK", planType: "ADDON" },
    } as never);
    vi.mocked(prisma.subscriptionAddon.findUnique).mockResolvedValue(null as never);
    vi.mocked(prisma.subscriptionAddon.create).mockResolvedValue({
      expiresAt: new Date(),
    } as never);

    const result = await reconcileOrgPayments(ORG);

    expect(result.changed).toBe(true);
    // The captured payment, not the failed attempt beside it.
    expect(prisma.payments.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ payId: "pay_ok" }) }),
    );
    expect(prisma.subscriptionAddon.create).toHaveBeenCalled();
  });

  test("leaves an order with no captured payment alone", async () => {
    vi.mocked(prisma.order.findMany).mockResolvedValue([
      { id: "order-1", checkoutRefId: "order_rzp1", name: "Conversation pack" },
    ] as never);
    // An abandoned checkout: writing FAILED over it would be worse than leaving it.
    vi.mocked(axios.get).mockResolvedValue({
      data: { items: [{ id: "pay_failed", status: "failed" }] },
    } as never);

    const result = await reconcileOrgPayments(ORG);

    expect(result.changed).toBe(false);
    expect(prisma.payments.create).not.toHaveBeenCalled();
  });
});

describe("sweepMissedPayments", () => {
  beforeEach(() => {
    vi.mocked(prisma.subscription.findMany).mockResolvedValue([] as never);
  });

  test("makes no provider calls when nothing looks stuck", async () => {
    vi.mocked(prisma.order.findMany).mockResolvedValue([] as never);

    const result = await sweepMissedPayments();

    expect(result).toEqual({ scanned: 0, repaired: 0, failed: 0 });
    expect(axios.get).not.toHaveBeenCalled();
  });

  test("only chases subscriptions Razorpay should still be billing", async () => {
    vi.mocked(prisma.order.findMany).mockResolvedValue([] as never);

    await sweepMissedPayments();

    // A customer who genuinely cancelled must never be reconciled back to life.
    const where = vi.mocked(prisma.subscription.findMany).mock.calls[0][0]?.where;
    expect(where?.org?.Order?.some?.subscriptionStatus).toEqual({
      in: ["active", "authenticated", "pending"],
    });
  });

  test("one unreachable org does not stop the others", async () => {
    vi.mocked(prisma.order.findMany)
      // The candidate query, then the per-org one-off lookup for each.
      .mockResolvedValueOnce([{ orgId: "org-a" }, { orgId: "org-b" }] as never)
      .mockResolvedValue([] as never);
    vi.mocked(prisma.subscription.findUnique)
      .mockRejectedValueOnce(new Error("Razorpay unreachable"))
      .mockResolvedValue(null as never);

    const result = await sweepMissedPayments();

    expect(result).toEqual({ scanned: 2, repaired: 0, failed: 1 });
    // The second org was still attempted after the first blew up.
    expect(prisma.subscription.findUnique).toHaveBeenCalledTimes(2);
  });

  test("counts an org whose missed charge it repaired", async () => {
    const chargedThrough = Math.floor(Date.UTC(2026, 8, 30) / 1000);
    vi.mocked(prisma.order.findMany)
      .mockResolvedValueOnce([{ orgId: ORG }] as never)
      .mockResolvedValue([] as never);
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
      subscriptionRef: SUB,
      expiresAt: new Date(Date.UTC(2026, 7, 30)),
    } as never);
    stubRazorpay({
      id: SUB,
      status: "active",
      plan_id: "plan_rzp",
      current_end: chargedThrough,
      notes: { orgId: ORG },
    });
    stubPlanLookup();

    const result = await sweepMissedPayments();

    expect(result).toEqual({ scanned: 1, repaired: 1, failed: 0 });
  });
});
