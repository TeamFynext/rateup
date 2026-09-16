import { beforeEach, describe, expect, test, vi } from "vitest";
import Fastify from "fastify";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";

vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), trace: vi.fn() },
}));
vi.mock("../../../utils/rateLimit.js", () => ({ rateLimit: () => async () => {} }));
vi.mock("../idempotency.js", () => ({
  idempotencyPreHandler: async () => {},
  idempotencyOnSend: async (_r: unknown, _y: unknown, p: unknown) => p,
}));
vi.mock("./guards.js", async () => {
  const actual = await vi.importActual<typeof import("./guards.js")>("./guards.js");
  return { ...actual, requireLoyaltySubscription: async () => {}, loadProgram: vi.fn() };
});

vi.mock("../../../modules/loyalty/accounts/account.service.js", () => ({
  getCustomerAccountsPaged: vi.fn(),
  getCustomerAccountByPhone: vi.fn(),
  getCustomerAccountByCardCode: vi.fn(),
  assignRewardToCustomer: vi.fn(),
  awardPoints: vi.fn(),
  createCustomerAccount: vi.fn(),
  getRewardByShortCode: vi.fn(),
  lookupContactByPhone: vi.fn(),
  markRewardAsRedeemed: vi.fn(),
  updateCustomerAccount: vi.fn(),
}));
vi.mock("../../../modules/loyalty/accounts/account.controller.js", () => ({
  buildCashierCustomerPayload: vi.fn(),
}));
vi.mock("../../../modules/loyalty/accounts/memberCard.service.js", () => ({
  sendMemberCard: vi.fn(),
}));
vi.mock("../../../modules/loyalty/tiers/tier.service.js", () => ({ getLoyaltyTiers: vi.fn() }));
vi.mock("../../../modules/loyalty/earningRules/earningRule.service.js", () => ({
  getLoyaltyEarningRules: vi.fn(),
}));
vi.mock("../../../modules/loyalty/rewards/reward.service.js", () => ({
  getActiveLoyaltyRewards: vi.fn(),
  getLoyaltyRewardByCode: vi.fn(),
}));
vi.mock("../../../modules/loyalty/redemptions/redemption.service.js", () => ({
  applyRedemption: vi.fn(),
  getTransactions: vi.fn(),
  redeemReward: vi.fn(),
  verifyRedemption: vi.fn(),
}));
vi.mock("../../../modules/loyalty/approvals/approval.service.js", () => ({
  createApprovalRequest: vi.fn(),
}));

import { getCustomerAccountsPaged } from "../../../modules/loyalty/accounts/account.service.js";
import { getLoyaltyTiers } from "../../../modules/loyalty/tiers/tier.service.js";
import { loadProgram } from "./guards.js";
import { externalErrorHandler } from "../errors.js";
import { externalLoyaltyRoutes } from "./loyalty.external.route.js";

type Mock = ReturnType<typeof vi.fn>;

const PROGRAM = {
  id: "prog-1",
  status: "active",
  defaultCountryCode: "IN",
  currencyName: "points",
  currencySymbol: "₹",
  signupBonus: 50,
  tiersEnabled: true,
  tierQualificationWindowMonths: null,
  businessName: "Demo Cafe",
};

async function buildApp() {
  const app = Fastify();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.setErrorHandler(externalErrorHandler);
  app.addHook("preHandler", async (request) => {
    (request as { user?: unknown }).user = { orgId: "org-1", role: "SUPER_ADMIN" };
  });
  await app.register(externalLoyaltyRoutes);
  await app.ready();
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
  (loadProgram as Mock).mockResolvedValue(PROGRAM);
  (getLoyaltyTiers as Mock).mockResolvedValue([]);
});

describe("the response schemas are a boundary, not documentation", () => {
  /**
   * The behaviour this replaced: not one loyalty route declared a `response` schema, so
   * handlers sent Prisma rows back whole. A partner asking for a customer list received
   * every inbox column hanging off Contact — `chatbotId`, `lastReceivedMetadata`,
   * `lifecycleId`, the lot — plus internal ids.
   */
  test("internal columns do not survive serialisation", async () => {
    (getCustomerAccountsPaged as Mock).mockResolvedValue({
      rows: [
        {
          id: "acct-1",
          programId: "prog-1",
          contactId: "contact-1",
          currentPoints: 120,
          lifetimePoints: 300,
          totalSpend: "1500.00",
          status: "active",
          cardCode: "ABCDEFGHJKLM",
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          pendingBonuses: { joining: 50 },
          verifiedAt: null,
          contact: {
            id: "contact-1",
            name: "Ann",
            phone: "919000000001",
            email: "ann@example.com",
            chatbotId: "bot-9",
            lifecycleId: "lc-1",
            lastReceivedMetadata: { secret: true },
            blockedOnWhatsApp: false,
            waMessageAssignStatus: "OPEN",
          },
        },
      ],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });

    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: "/members" });
    const raw = res.payload;

    expect(res.statusCode).toBe(200);
    for (const leaked of [
      "chatbotId",
      "lifecycleId",
      "lastReceivedMetadata",
      "blockedOnWhatsApp",
      "waMessageAssignStatus",
      "pendingBonuses",
      "verifiedAt",
      "contactId",
      "programId",
      "acct-1",
    ]) {
      expect(raw).not.toContain(leaked);
    }

    // And the things a partner does need are there, as numbers rather than Decimals.
    const body = JSON.parse(raw);
    expect(body.data[0]).toMatchObject({
      name: "Ann",
      phone: "919000000001",
      cardCode: "ABCDEFGHJKLM",
      points: { current: 120, lifetime: 300 },
      totalSpend: 1500,
    });
  });

  test("every route declares what it returns", async () => {
    // A single assertion that stops the original defect coming back one new endpoint at a
    // time: a route with no response schema is a route that serialises whatever it is
    // handed.
    const missing: string[] = [];
    let count = 0;

    const probe = Fastify();
    probe.setValidatorCompiler(validatorCompiler);
    probe.setSerializerCompiler(serializerCompiler);
    probe.addHook("onRoute", (opts) => {
      count++;
      const response = (opts.schema?.response ?? {}) as Record<string, unknown>;
      if (!response["200"] && !response["201"]) missing.push(`${opts.method} ${opts.url}`);
    });
    await probe.register(externalLoyaltyRoutes);
    await probe.ready();

    expect(missing).toEqual([]);
    expect(count).toBeGreaterThan(10);
  });
});

describe("errors reach the caller as the envelope", () => {
  test("a business failure is not a 500", async () => {
    const { LoyaltyError } = await import("../../../modules/loyalty/loyalty.errors.js");
    (getCustomerAccountsPaged as Mock).mockRejectedValue(
      new LoyaltyError("INSUFFICIENT_POINTS", "Insufficient points", { required: 500 }),
    );

    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: "/members" });

    expect(res.statusCode).toBe(422);
    expect(JSON.parse(res.payload).error).toMatchObject({
      code: "insufficient_points",
      details: { required: 500 },
    });
  });

  test("a bad member ref is refused before any lookup", async () => {
    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: "/members/lookup" });

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.payload).error.code).toBe("validation_failed");
  });

  test("both identifiers at once is a validation error, not a guess", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "GET",
      url: "/members/lookup?phone=919000000001&cardCode=ABCDEFGHJKLM",
    });

    expect(res.statusCode).toBe(400);
  });
});
