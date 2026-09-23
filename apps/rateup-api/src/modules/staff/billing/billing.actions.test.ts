import { beforeEach, describe, expect, test, vi } from "vitest";

const db = vi.hoisted(() => {
  const client = {
    rateupPlan: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
    paymentPlans: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
    stripeProducts: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn() },
    staffAuditLog: { create: vi.fn() },
    $transaction: vi.fn(),
  };
  client.$transaction.mockImplementation((run: (tx: typeof client) => unknown) => run(client));
  return client;
});
const syncPlans = vi.hoisted(() => vi.fn());
vi.mock("../../../utils/prisma.js", () => ({ default: db }));
vi.mock("../../../utils/logger.js", () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock("../../payment/payment.service.js", () => ({ syncPaymentPlans: syncPlans }));
vi.mock("../../payment/stripe/stripe.service.js", () => ({ syncStripeProducts: vi.fn() }));

import type { FastifyRequest } from "fastify";
import {
  createTier,
  deleteRazorpayPlan,
  deleteTier,
  syncRazorpay,
  updateTier,
} from "./billing.actions.js";

const TIER = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const GW = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const GW2 = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const request = {
  staff: { id: "staff-1", email: "ann@rateup.app" },
  method: "POST",
  url: "/api/staff/billing/plans",
  routeOptions: { url: "/api/staff/billing/plans" },
  headers: {},
  ip: "127.0.0.1",
  body: {},
} as unknown as FastifyRequest;

const base = {
  name: "Growth",
  displayName: "Growth",
  planType: "BASE" as const,
  description: ["Everything in Starter"],
  reason: "New tier for Q4",
};
const audit = () => db.staffAuditLog.create.mock.calls[0][0].data;

beforeEach(() => {
  vi.clearAllMocks();
  db.staffAuditLog.create.mockResolvedValue({});
  db.rateupPlan.findFirst.mockResolvedValue(null);
  db.rateupPlan.updateMany.mockResolvedValue({ count: 0 });
});

describe("createTier", () => {
  test("creates the tier and audits it", async () => {
    db.rateupPlan.create.mockResolvedValue({ id: TIER, name: "Growth", planType: "BASE" });
    await createTier(request, { ...base, monthlyPaymentPlanId: GW });
    expect(db.rateupPlan.create.mock.calls[0][0].data).toMatchObject({
      name: "Growth",
      monthlyPaymentPlanId: GW,
    });
    expect(audit()).toMatchObject({ action: "catalog.tier_create", reason: base.reason });
  });

  test("the same Razorpay plan cannot fill two slots", async () => {
    await expect(
      createTier(request, { ...base, monthlyPaymentPlanId: GW, yearlyPaymentPlanId: GW }),
    ).rejects.toMatchObject({ code: "DUPLICATE_LINK" });
  });

  test("a Razorpay plan another tier sells is refused by name", async () => {
    db.rateupPlan.findFirst.mockResolvedValue({ name: "Starter" });
    await expect(createTier(request, { ...base, monthlyPaymentPlanId: GW })).rejects.toMatchObject({
      code: "LINK_TAKEN",
      message: expect.stringContaining("Starter"),
    });
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  test("pointing the widget at this tier unpoints it from any other", async () => {
    db.rateupPlan.create.mockResolvedValue({ id: TIER, name: "Growth", planType: "BASE" });
    await createTier(request, { ...base, displayWidgetId: "pricing-widget" });
    expect(db.rateupPlan.updateMany.mock.calls[0][0]).toEqual({
      where: { displayWidgetId: "pricing-widget" },
      data: { displayWidgetId: null },
    });
  });
});

describe("updateTier", () => {
  test("a tier keeping its own links is not in conflict with itself", async () => {
    db.rateupPlan.findUnique.mockResolvedValue({ id: TIER, name: "Growth" });
    db.rateupPlan.update.mockResolvedValue({ id: TIER, name: "Growth Plus" });
    await updateTier(request, TIER, {
      name: "Growth Plus",
      monthlyPaymentPlanId: GW2,
      reason: "Rename",
    });
    expect(db.rateupPlan.findFirst.mock.calls[0][0].where).toMatchObject({ id: { not: TIER } });
    expect(audit().action).toBe("catalog.tier_update");
  });
});

describe("deleteTier", () => {
  test("refuses while organisations are on it", async () => {
    db.rateupPlan.findUnique.mockResolvedValue({
      id: TIER,
      name: "Growth",
      _count: { Subscription: 3, addons: 0, orders: 0 },
    });
    await expect(deleteTier(request, TIER, { reason: "Retiring" })).rejects.toMatchObject({
      code: "PLAN_IN_USE",
      message: expect.stringContaining("3 organisation"),
    });
    expect(db.rateupPlan.delete).not.toHaveBeenCalled();
  });

  test("refuses when orders or packs reference it", async () => {
    db.rateupPlan.findUnique.mockResolvedValue({
      id: TIER,
      _count: { Subscription: 0, addons: 0, orders: 2 },
    });
    await expect(deleteTier(request, TIER, { reason: "Retiring" })).rejects.toMatchObject({
      code: "PLAN_HAS_HISTORY",
    });
  });

  test("deletes an unused tier, keeping its row on the audit log", async () => {
    db.rateupPlan.findUnique.mockResolvedValue({
      id: TIER,
      name: "Draft tier",
      _count: { Subscription: 0, addons: 0, orders: 0 },
    });
    await deleteTier(request, TIER, { reason: "Never launched" });
    expect(db.rateupPlan.delete).toHaveBeenCalledWith({ where: { id: TIER } });
    expect(audit()).toMatchObject({
      action: "catalog.tier_delete",
      before: { id: TIER, name: "Draft tier" },
    });
    expect(audit().before).not.toHaveProperty("_count");
  });
});

describe("deleteRazorpayPlan", () => {
  const plan = (overrides: Record<string, unknown> = {}) => ({
    id: GW,
    planId: "plan_x",
    name: "Growth monthly",
    status: "INACTIVE",
    RateupPlan: null,
    monthlyRateupPlan: null,
    yearlyRateupPlan: null,
    usdMonthlyRateupPlan: null,
    usdYearlyRateupPlan: null,
    ...overrides,
  });

  test("a plan a tier sells through stays", async () => {
    db.paymentPlans.findUnique.mockResolvedValue(plan({ yearlyRateupPlan: { name: "Growth" } }));
    await expect(deleteRazorpayPlan(request, GW, { reason: "Clean-up" })).rejects.toMatchObject({
      code: "LINKED",
      message: expect.stringContaining("Growth"),
    });
  });

  test("a plan on sale must be switched off first", async () => {
    db.paymentPlans.findUnique.mockResolvedValue(plan({ status: "ACTIVE" }));
    await expect(deleteRazorpayPlan(request, GW, { reason: "Clean-up" })).rejects.toMatchObject({
      code: "ON_SALE",
    });
  });

  test("an unlinked, switched-off plan goes", async () => {
    db.paymentPlans.findUnique.mockResolvedValue(plan());
    await deleteRazorpayPlan(request, GW, { reason: "Clean-up" });
    expect(db.paymentPlans.delete).toHaveBeenCalledWith({ where: { id: GW } });
    expect(audit().action).toBe("catalog.razorpay_delete");
  });
});

describe("syncRazorpay", () => {
  test("a gateway failure is a 502, not a silent success", async () => {
    syncPlans.mockResolvedValue({ success: false, error: "timeout" });
    await expect(syncRazorpay(request, { reason: "Weekly sync" })).rejects.toMatchObject({
      statusCode: 502,
      code: "GATEWAY_ERROR",
    });
    expect(db.staffAuditLog.create).not.toHaveBeenCalled();
  });

  test("the counts land on the audit row", async () => {
    syncPlans.mockResolvedValue({
      success: true,
      data: { created: 2, deactivated: 1, skipped: 0, seen: 9 },
    });
    const result = await syncRazorpay(request, { reason: "Weekly sync" });
    expect(result).toEqual({ created: 2, deactivated: 1, skipped: 0, seen: 9 });
    expect(audit()).toMatchObject({ action: "catalog.razorpay_sync", after: { created: 2 } });
  });
});
