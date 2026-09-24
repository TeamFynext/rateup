import { beforeEach, describe, expect, test, vi } from "vitest";

const db = vi.hoisted(() => {
  const client = {
    org: { findUnique: vi.fn() },
    rateupPlan: { findUnique: vi.fn(), findFirst: vi.fn() },
    subscription: { upsert: vi.fn(), update: vi.fn() },
    subscriptionAddon: { create: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
    staffAuditLog: { create: vi.fn() },
    $transaction: vi.fn(),
  };
  client.$transaction.mockImplementation((run: (tx: typeof client) => unknown) => run(client));
  return client;
});
vi.mock("../../../utils/prisma.js", () => ({ default: db }));
vi.mock("../../../utils/logger.js", () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import type { FastifyRequest } from "fastify";
import { UNLIMITED_COUNT } from "../../subscription/subscription.data.js";
import { planChangeSchema, subscriptionFeaturesSchema } from "./subscription.schema.js";
import {
  changeOrgPlan,
  grantAddonPacks,
  overrideOrgFeatures,
  revokeAddonPack,
} from "./subscription.service.js";

const ORG_ID = "0a5b8a7e-2f7c-4d2e-9a51-3c1f0e6b9d24";
const PLAN_ID = "5d7c3b1a-8e2f-4c6d-9b0a-1f2e3d4c5b6a";
const NOW = new Date("2026-09-22T10:00:00Z");
const LATER = new Date("2027-09-22T10:00:00Z");

const request = {
  staff: { id: "staff-1", email: "ann@rateup.app" },
  method: "PUT",
  url: "/api/staff/orgs/x",
  routeOptions: { url: "/api/staff/orgs/:id/subscription/plan" },
  headers: {},
  ip: "127.0.0.1",
  body: {},
} as unknown as FastifyRequest;

function features(conversations: number) {
  return {
    team: { active: true, count: { max: 5 }, teamMember: { active: true, count: { max: 10 } } },
    webSurvey: {
      active: true,
      encryption: { active: true },
      googleReview: { active: true },
      emailNotification: { active: true },
      htmlCodePage: { active: true },
      webhook: { active: true },
      count: { monthlyResponseLimit: conversations },
    },
    whatsapp: { active: true, conversation: { active: true, count: { max: conversations } } },
    ai: { active: false, count: { completionTokens: 0, promptTokens: 0 } },
  };
}

function orgWith(subscriptionFeatures: unknown) {
  return {
    id: ORG_ID,
    name: "Acme",
    Subscription: {
      features: subscriptionFeatures,
      expiresAt: NOW,
      subscriptionRef: null,
      basePlan: { id: "old", name: "PLUS", displayName: "Plus", features: features(5000) },
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  db.staffAuditLog.create.mockResolvedValue({});
});

describe("changeOrgPlan", () => {
  test("copies the tier's features and records before, after and the reason", async () => {
    db.rateupPlan.findUnique.mockResolvedValue({
      id: PLAN_ID,
      name: "PRO",
      displayName: "Pro",
      planType: "BASE",
      features: features(20000),
    });
    db.org.findUnique.mockResolvedValue(orgWith(features(5000)));

    await changeOrgPlan(request, ORG_ID, {
      rateupPlanId: PLAN_ID,
      expiresAt: LATER,
      preserveContractedCaps: true,
      reason: "Upgraded on a sales call",
    });

    const upsert = db.subscription.upsert.mock.calls[0][0];
    expect(upsert.update.basePlanId).toBe(PLAN_ID);
    expect(upsert.update.features.whatsapp.conversation.count.max).toBe(20000);
    expect(upsert.update.expiresAt).toEqual(LATER);
    const audit = db.staffAuditLog.create.mock.calls[0][0].data;
    expect(audit).toMatchObject({
      action: "subscription.plan_change",
      targetOrgId: ORG_ID,
      reason: "Upgraded on a sales call",
      before: { plan: "Plus" },
    });
  });

  test("keeps an Enterprise deal's contracted cap unless told not to", async () => {
    db.rateupPlan.findUnique.mockResolvedValue({
      id: PLAN_ID,
      name: "ENTERPRISE",
      displayName: null,
      planType: "BASE",
      features: features(UNLIMITED_COUNT),
    });
    db.org.findUnique.mockResolvedValue(orgWith(features(80000)));
    const input = { rateupPlanId: PLAN_ID, expiresAt: LATER, reason: "Contract renewal" };

    await changeOrgPlan(request, ORG_ID, { ...input, preserveContractedCaps: true });
    expect(
      db.subscription.upsert.mock.calls[0][0].update.features.whatsapp.conversation.count.max,
    ).toBe(80000);

    await changeOrgPlan(request, ORG_ID, { ...input, preserveContractedCaps: false });
    expect(
      db.subscription.upsert.mock.calls[1][0].update.features.whatsapp.conversation.count.max,
    ).toBe(UNLIMITED_COUNT);
  });

  test("an add-on is not a plan", async () => {
    db.rateupPlan.findUnique.mockResolvedValue({ id: PLAN_ID, planType: "ADDON" });
    await expect(
      changeOrgPlan(request, ORG_ID, {
        rateupPlanId: PLAN_ID,
        expiresAt: LATER,
        preserveContractedCaps: true,
        reason: "A reason",
      }),
    ).rejects.toMatchObject({ code: "NOT_A_BASE_PLAN" });
    expect(db.subscription.upsert).not.toHaveBeenCalled();
  });

  test("a reason is required, and the expiry must be in the future", () => {
    const base = { rateupPlanId: PLAN_ID, expiresAt: LATER.toISOString(), reason: "Because" };
    expect(planChangeSchema.safeParse(base).success).toBe(true);
    expect(planChangeSchema.safeParse({ ...base, reason: "  ok " }).success).toBe(false);
    expect(planChangeSchema.safeParse({ ...base, expiresAt: "2020-01-01" }).success).toBe(false);
  });
});

describe("overrideOrgFeatures", () => {
  test("the features editor only accepts the typed shape", () => {
    expect(subscriptionFeaturesSchema.safeParse(features(100)).success).toBe(true);
    const negative = features(100);
    negative.team.count.max = -1;
    expect(subscriptionFeaturesSchema.safeParse(negative).success).toBe(false);
    expect(subscriptionFeaturesSchema.safeParse({ team: "all" }).success).toBe(false);
  });

  test("keeps keys the editor does not know about", async () => {
    db.org.findUnique.mockResolvedValue(orgWith({ ...features(100), legacyFlag: { on: true } }));
    await overrideOrgFeatures(request, ORG_ID, {
      features: features(250),
      reason: "Goodwill bump",
    });
    const saved = db.subscription.update.mock.calls[0][0].data.features;
    expect(saved.legacyFlag).toEqual({ on: true });
    expect(saved.whatsapp.conversation.count.max).toBe(250);
  });
});

describe("add-on packs", () => {
  test("a granted pack carries its audit row's id instead of a payment", async () => {
    db.rateupPlan.findFirst.mockResolvedValue({ id: "addon-plan" });
    db.org.findUnique.mockResolvedValue(orgWith(features(5000)));
    db.subscriptionAddon.create.mockImplementation(({ data }) =>
      Promise.resolve({ id: "pack-1", quantity: data.quantity, expiresAt: data.expiresAt }),
    );

    await grantAddonPacks(request, ORG_ID, { quantity: 2, reason: "Outage credit" }, NOW);

    const pack = db.subscriptionAddon.create.mock.calls[0][0].data;
    const audit = db.staffAuditLog.create.mock.calls[0][0].data;
    expect(pack.paymentRef).toBe(`staff:${audit.id}`);
    expect(pack.expiresAt).toEqual(new Date("2026-10-22T10:00:00Z"));
    expect(audit.after.conversations).toBe(10000);
  });

  test("refused on an uncapped plan, where it would count for nothing", async () => {
    db.rateupPlan.findFirst.mockResolvedValue({ id: "addon-plan" });
    db.org.findUnique.mockResolvedValue(orgWith(features(UNLIMITED_COUNT)));
    await expect(
      grantAddonPacks(request, ORG_ID, { quantity: 1, reason: "Outage credit" }, NOW),
    ).rejects.toMatchObject({ code: "ADDON_NOT_APPLICABLE" });
    expect(db.subscriptionAddon.create).not.toHaveBeenCalled();
  });

  test("only a staff-granted pack can be revoked here", async () => {
    db.org.findUnique.mockResolvedValue(orgWith(features(5000)));
    db.subscriptionAddon.findFirst.mockResolvedValue({
      id: "pack-1",
      quantity: 1,
      expiresAt: LATER,
      paymentRef: "pay_Razorpay123",
    });
    await expect(
      revokeAddonPack(request, ORG_ID, "pack-1", { reason: "Granted by mistake" }, NOW),
    ).rejects.toMatchObject({ code: "ADDON_PAID" });

    db.subscriptionAddon.findFirst.mockResolvedValue({
      id: "pack-1",
      quantity: 1,
      expiresAt: LATER,
      paymentRef: "staff:abc",
    });
    await revokeAddonPack(request, ORG_ID, "pack-1", { reason: "Granted by mistake" }, NOW);
    expect(db.subscriptionAddon.update).toHaveBeenCalledWith({
      where: { id: "pack-1" },
      data: { expiresAt: NOW },
    });
  });
});
