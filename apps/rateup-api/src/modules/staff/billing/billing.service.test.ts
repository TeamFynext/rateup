import { beforeEach, expect, test, vi } from "vitest";

const db = vi.hoisted(() => ({ order: { findMany: vi.fn(), count: vi.fn() } }));
vi.mock("../../../utils/prisma.js", () => ({ default: db }));
vi.mock("../../payment/payment.service.js", () => ({ getAllPaymentSubscriptions: vi.fn() }));
vi.mock("../../payment/stripe/stripe.service.js", () => ({ getAllStripeSubscriptions: vi.fn() }));

import { listOrders, orderListQuerySchema } from "./billing.service.js";

beforeEach(() => vi.clearAllMocks());

test("orders page, name their gateway and show payments in major units", async () => {
  db.order.findMany.mockResolvedValue([
    {
      id: "o1",
      name: "GROWTH monthly",
      createdAt: new Date("2026-09-01"),
      status: "COMPLETE",
      paymentStatus: "SUCCESS",
      planId: "plan_123",
      priceId: null,
      shopifyPlanId: null,
      subscriptionId: "sub_1",
      subscriptionStatus: "active",
      subscriptionChargeAt: null,
      subscriptionEndedAt: null,
      org: null,
      deletedOrgInfo: "Acme (deleted)",
      createdBy: null,
      RateupPlan: { id: "p1", name: "GROWTH", displayName: "Growth" },
      payment: {
        payId: "pay_1",
        amount: 299900,
        currency: "INR",
        method: "upi",
        createdAt: 1_788_000_000,
      },
    },
  ]);
  db.order.count.mockResolvedValue(41);

  const page = await listOrders(
    orderListQuerySchema.parse({ page: "3", pageSize: "20", gateway: "razorpay" }),
  );

  expect(db.order.findMany).toHaveBeenCalledWith(
    expect.objectContaining({ skip: 40, take: 20, where: { AND: [{ planId: { not: null } }] } }),
  );
  expect(page.total).toBe(41);
  expect(page.data[0]).toMatchObject({
    gateway: "razorpay",
    deletedOrgName: "Acme (deleted)",
    plan: { id: "p1", name: "Growth" },
    payment: { amount: 2999, currency: "INR", paidAt: new Date(1_788_000_000 * 1000) },
  });
});

test("a pasted id matches the order or the org exactly", async () => {
  db.order.findMany.mockResolvedValue([]);
  db.order.count.mockResolvedValue(0);
  const id = "0a5b8a7e-2f7c-4d2e-9a51-3c1f0e6b9d24";
  await listOrders(orderListQuerySchema.parse({ q: id }));
  expect(db.order.findMany.mock.calls[0][0].where).toEqual({
    AND: [{ OR: [{ id }, { orgId: id }] }],
  });
});
