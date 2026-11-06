import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

vi.hoisted(() => {
  process.env.RAZORPAY_API_KEY = "rzp_key";
  process.env.RAZORPAY_API_SECRET = "rzp_secret";
});

vi.mock("axios", () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn() } }));

vi.mock("../../utils/prisma.js", () => ({
  default: {
    order: { updateMany: vi.fn(), findMany: vi.fn() },
    paymentPlans: { findFirst: vi.fn() },
    stripeProducts: { findFirst: vi.fn() },
    rateupPlan: { findFirst: vi.fn(), findUnique: vi.fn() },
  },
}));

vi.mock("../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}));

vi.mock("../../workers/bullmq/queues/index.js", () => ({
  notificationQueue: { add: vi.fn() },
}));

vi.mock("../integrations/shopify/shopify.billing.js", () => ({
  getRecurringCharge: vi.fn(),
}));
vi.mock("../integrations/shopify/shopify.credential.js", () => ({
  getShopifyInfo: vi.fn(),
}));

import prisma from "../../utils/prisma.js";
import { getAllOrgOrders } from "./payment.service.js";

beforeEach(() => {
  vi.mocked(prisma.order.updateMany)
    .mockReset()
    .mockResolvedValue({ count: 0 } as never);
  vi.mocked(prisma.order.findMany)
    .mockReset()
    .mockResolvedValue([] as never);
});

describe("getAllOrgOrders", () => {
  test("expires stale pending orders of the caller's org only", async () => {
    await getAllOrgOrders("org-A");

    expect(prisma.order.updateMany).toHaveBeenCalledTimes(1);
    const { where } = vi.mocked(prisma.order.updateMany).mock.calls[0][0] as {
      where: {
        orgId: string;
        paymentStatus: string;
        createdAt: { lte: Date };
        NOT: unknown;
      };
    };
    expect(where.orgId).toBe("org-A");
    expect(where.paymentStatus).toBe("PENDING");
    // Only orders older than the 15-minute checkout window are expired.
    expect(Date.now() - where.createdAt.lte.getTime()).toBeGreaterThanOrEqual(
      15 * 60 * 1000 - 1000,
    );
    // Unpaid one-off pack orders stay PENDING for the missed-capture reconciler.
    expect(where.NOT).toEqual({ checkoutRefId: { startsWith: "order_" }, payment: { is: null } });
  });

  test("lists only the caller's org", async () => {
    await getAllOrgOrders("org-A");

    const args = vi.mocked(prisma.order.findMany).mock.calls[0][0] as { where: { orgId: string } };
    expect(args.where).toEqual({ orgId: "org-A" });
  });

  test("refuses to run without an org, rather than sweeping every org", async () => {
    await expect(getAllOrgOrders(undefined as unknown as string)).rejects.toThrow();
    await expect(getAllOrgOrders("")).rejects.toThrow();
    expect(prisma.order.updateMany).not.toHaveBeenCalled();
    expect(prisma.order.findMany).not.toHaveBeenCalled();
  });
});
