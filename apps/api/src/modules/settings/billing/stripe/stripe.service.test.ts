import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

vi.hoisted(() => {
  process.env.STRIPE_SECRET_KEY = "sk_test_x";
});

vi.mock("stripe", () => ({ default: class {} }));
vi.mock("axios", () => ({ default: { get: vi.fn() } }));
vi.mock("../../../../utils/prisma.js", () => ({
  default: {
    stripeProducts: { findFirst: vi.fn() },
    order: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    payments: { create: vi.fn() },
    subscription: { update: vi.fn() },
  },
}));
vi.mock("../../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));
vi.mock("../../../../workers/bullmq/queues/index.js", () => ({
  notificationQueue: { add: vi.fn() },
}));
vi.mock("../../subscription/subscription.service.js", () => ({ bustSubscriptionGate: vi.fn() }));
vi.mock("../../../../utils/email/payments/subscriptionActivated.js", () => ({
  createEmailBodySubscriptionActivated: vi.fn(),
}));
vi.mock("../../../../utils/email/payments/paymentFailed.js", () => ({ paymentFailed: vi.fn() }));
vi.mock("../../../../utils/email/payments/subscriptionPurchasedAlert.js", () => ({
  sendSubscriptionPurchasedAlert: vi.fn(),
}));

import axios from "axios";
import prisma from "../../../../utils/prisma.js";
import { createOrder, createStripePayment, UnsellableStripePriceError } from "./stripe.service.js";

const PRODUCT = {
  id: "sp-1",
  priceId: "price_pro",
  amount: 49,
  currency: "usd",
  RateupPlan: { id: "pro", name: "PRO PLAN", displayName: "Pro", planType: "BASE" },
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.order.create).mockImplementation((async (args: { data: object }) => ({
    id: "o-1",
    ...args.data,
  })) as never);
});

describe("createOrder (Stripe checkout)", () => {
  test("derives the tier, name and amount from the price and uses the given org", async () => {
    vi.mocked(prisma.stripeProducts.findFirst).mockResolvedValue(PRODUCT as never);

    await createOrder("price_pro", "org-me", "user-1");

    expect(vi.mocked(prisma.order.create).mock.calls[0][0].data).toMatchObject({
      orgId: "org-me",
      rateupPlanId: "pro",
      name: "Pro",
      priceId: "price_pro",
      amountMinor: 4900,
      currency: "usd",
    });
  });

  test("refuses a price no tier links", async () => {
    vi.mocked(prisma.stripeProducts.findFirst).mockResolvedValue({
      ...PRODUCT,
      RateupPlan: null,
    } as never);

    await expect(createOrder("price_orphan", "org-me", "u")).rejects.toBeInstanceOf(
      UnsellableStripePriceError,
    );
    expect(prisma.order.create).not.toHaveBeenCalled();
  });

  test("refuses an unknown price", async () => {
    vi.mocked(prisma.stripeProducts.findFirst).mockResolvedValue(null as never);

    await expect(createOrder("price_x", "org-me", "u")).rejects.toBeInstanceOf(
      UnsellableStripePriceError,
    );
  });
});

describe("invoice.paid for a first invoice", () => {
  const invoice = (amount_paid: number, currency = "usd") => ({
    billing_reason: "subscription_create",
    payment_intent: "pi_1",
    subscription: "sub_1",
    subscription_details: { metadata: { rateupOrderId: "o-1" } },
    amount_paid,
    currency,
    status_transitions: { paid_at: 1 },
  });

  function orderFor(order: Record<string, unknown>) {
    vi.mocked(prisma.order.findUnique).mockResolvedValue({
      priceId: "price_pro",
      amountMinor: 4900,
      currency: "usd",
      RateupPlan: { stripeProduct: { priceId: "price_pro", amount: 49, currency: "usd" } },
      ...order,
    } as never);
  }

  test("an invoice that paid less than the plan grants nothing", async () => {
    orderFor({});

    const result = await createStripePayment(invoice(100));

    expect(result).toBeNull();
    expect(prisma.payments.create).not.toHaveBeenCalled();
    expect(prisma.subscription.update).not.toHaveBeenCalled();
  });

  test("an invoice in another currency grants nothing", async () => {
    orderFor({});

    expect(await createStripePayment(invoice(4900, "inr"))).toBeNull();
    expect(prisma.subscription.update).not.toHaveBeenCalled();
  });

  test("an old order whose tier is not the one its price sells grants nothing", async () => {
    // Before the fix the order named its tier freely: cheap price, Enterprise rateupPlanId.
    orderFor({
      amountMinor: null,
      currency: null,
      RateupPlan: { stripeProduct: { priceId: "price_enterprise", amount: 999, currency: "usd" } },
    });

    expect(await createStripePayment(invoice(4900))).toBeNull();
    expect(prisma.subscription.update).not.toHaveBeenCalled();
  });

  test("a full payment for the linked price updates the order's org", async () => {
    orderFor({});
    vi.mocked(axios.get).mockImplementation((async (url: string) =>
      url.includes("payment_intents")
        ? { data: { payment_method_types: ["card"] } }
        : { data: { current_period_end: 2_000_000_000 } }) as never);
    vi.mocked(prisma.payments.create).mockResolvedValue({ id: "pay-row" } as never);
    vi.mocked(prisma.order.update).mockResolvedValue({
      id: "o-1",
      orgId: "org-me",
      rateupPlanId: "pro",
      RateupPlan: { features: {}, name: "PRO" },
    } as never);

    await createStripePayment(invoice(4900));

    expect(prisma.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { orgId: "org-me" } }),
    );
  });
});
