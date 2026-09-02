import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/prisma.js", () => {
  const client = {
    org: { findUnique: vi.fn() },
    loyaltyProgram: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    loyaltyEarningRule: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    loyaltyTier: { findMany: vi.fn(), create: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
    loyaltyReward: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
    },
    loyaltyRedemption: { findMany: vi.fn() },
    customerReward: { findMany: vi.fn() },
    loyaltyWaCommand: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn() },
    loyaltyEventTrigger: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn() },
    whatsappSettings: { count: vi.fn() },
    // Steps write through one transaction; handing the callback the same client keeps
    // the assertions below reading against a single set of mocks.
    $transaction: vi.fn((fn: (tx: unknown) => unknown) => fn(client)),
  };
  return { default: client };
});

vi.mock("../../whatsapp/automatedReply/wa_automatedReply.service.js", () => ({
  getAutomatedRepliesByKeyWeords: vi.fn(),
}));

vi.mock("../../whatsapp/messageTemplates/wa_templates.service.js", () => ({
  createTemplate: vi.fn(),
  saveTemplate: vi.fn(),
}));

import prisma from "../../../utils/prisma.js";
import { LoyaltyEventType, LoyaltyTemplateTypes } from "../../../types/enums.js";
import { LoyaltyRewardType } from "../../../types/loyalty.js";
import { getAutomatedRepliesByKeyWeords } from "../../whatsapp/automatedReply/wa_automatedReply.service.js";
import {
  createTemplate,
  saveTemplate,
} from "../../whatsapp/messageTemplates/wa_templates.service.js";
import { tiersStepSchema, earningStepSchema } from "./onboarding.schema.js";
import { LOYALTY_PRESETS, suggestPresetKey } from "./presets.js";
import {
  activateProgram,
  applyEarningStep,
  applyMessagesStep,
  applyRewardsStep,
  applyTiersStep,
  OnboardingError,
} from "./onboarding.service.js";

type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as Record<string, Record<string, Mock>>;

const ORG = "org-1";
const PROGRAM = {
  id: "prog-1",
  orgId: ORG,
  status: "draft",
  averageOrderValue: 250,
  tiersEnabled: false,
  signupBonus: 0,
  referralBonus: 0,
  refereeBonus: 0,
};

/** A default earning rule of 1 point per unit — the shape `activate` now selects. */
const DEFAULT_RULE = { id: "rule-1", pointsPerUnit: 1, multiplier: 1, bonusPoints: 0 };

/** 3% back: 150 of value for 5000 points, at 1 point per unit. Lands in the healthy band. */
const HEALTHY_REWARD = {
  name: "Free Coffee",
  pointsCost: 5000,
  rewardValue: { type: "free_item", item_name: "Coffee", item_value: 150 },
};

beforeEach(() => {
  vi.clearAllMocks();
  db.loyaltyProgram.findUnique.mockResolvedValue(PROGRAM);
  db.loyaltyProgram.update.mockResolvedValue(PROGRAM);
  for (const model of ["loyaltyEarningRule", "loyaltyTier", "loyaltyReward"]) {
    db[model].findMany.mockResolvedValue([]);
  }
  db.loyaltyTier.deleteMany.mockResolvedValue({ count: 0 });
  db.loyaltyReward.create.mockResolvedValue({ id: "new-reward" });
  db.loyaltyRedemption.findMany.mockResolvedValue([]);
  db.customerReward.findMany.mockResolvedValue([]);
});

describe("preset catalogue", () => {
  test("every preset's tier thresholds are unique, as LoyaltyTier requires", () => {
    for (const preset of Object.values(LOYALTY_PRESETS)) {
      const thresholds = preset.tiers.map((t) => t.threshold);
      expect(new Set(thresholds).size, `${preset.key} thresholds`).toBe(thresholds.length);

      const names = preset.tiers.map((t) => t.name.toLowerCase());
      expect(new Set(names).size, `${preset.key} names`).toBe(names.length);
    }
  });

  test("every preset has exactly one default earning rule, so activate cannot refuse it", () => {
    for (const preset of Object.values(LOYALTY_PRESETS)) {
      expect(
        preset.earningRules.filter((r) => r.isDefault),
        preset.key,
      ).toHaveLength(1);
    }
  });

  test("every preset reward carries a real reward value, not an empty object", () => {
    for (const preset of Object.values(LOYALTY_PRESETS)) {
      for (const reward of preset.rewards) {
        expect(
          Object.keys(reward.rewardValue).length,
          `${preset.key}/${reward.name}`,
        ).toBeGreaterThan(0);
        expect(reward.rewardValue).toHaveProperty("type");
      }
    }
  });

  test("only the command types the inbound switch dispatches are seeded", () => {
    const dispatched = new Set([
      LoyaltyTemplateTypes.CustomerRegistration,
      LoyaltyTemplateTypes.PointInformation,
      LoyaltyTemplateTypes.Referral,
      LoyaltyTemplateTypes.CustomerRemoval,
      LoyaltyTemplateTypes.RewardsIssued,
    ]);
    for (const preset of Object.values(LOYALTY_PRESETS)) {
      for (const command of preset.commands) {
        expect(dispatched.has(command.type), `${preset.key}/${command.type}`).toBe(true);
      }
    }
  });

  test("industry matching suggests a pack and falls back to generic", () => {
    expect(suggestPresetKey("Coffee Shop")).toBe("cafe");
    expect(suggestPresetKey("retail")).toBe("retail");
    expect(suggestPresetKey("Something we invented")).toBe("generic");
    expect(suggestPresetKey(undefined)).toBe("generic");
    expect(suggestPresetKey("")).toBe("generic");
  });
});

describe("step validation", () => {
  test("tiers sharing a threshold are rejected, not sent to Prisma", () => {
    const result = tiersStepSchema.safeParse({
      tiersEnabled: true,
      tiers: [
        { name: "Silver", threshold: 1000 },
        { name: "Gold", threshold: 1000 },
      ],
    });

    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toContain("different threshold");
  });

  test("tiers sharing a name are rejected", () => {
    const result = tiersStepSchema.safeParse({
      tiersEnabled: true,
      tiers: [
        { name: "Gold", threshold: 100 },
        { name: "gold", threshold: 200 },
      ],
    });

    expect(result.success).toBe(false);
  });

  test("turning tiers off makes an empty tier list valid", () => {
    expect(tiersStepSchema.safeParse({ tiersEnabled: false, tiers: [] }).success).toBe(true);
    expect(tiersStepSchema.safeParse({ tiersEnabled: true, tiers: [] }).success).toBe(false);
  });

  test("a rule set without exactly one default is rejected", () => {
    const rule = { name: "A", pointsPerUnit: 1, isDefault: false };
    expect(earningStepSchema.safeParse({ rules: [rule] }).success).toBe(false);
    expect(earningStepSchema.safeParse({ rules: [{ ...rule, isDefault: true }] }).success).toBe(
      true,
    );
    expect(
      earningStepSchema.safeParse({
        rules: [
          { ...rule, name: "A", isDefault: true },
          { ...rule, name: "B", isDefault: true },
        ],
      }).success,
    ).toBe(false);
  });
});

describe("controller error mapping", () => {
  // The step schemas are parsed inside the handler rather than declared on the route, so
  // they bypass Fastify's own validation path. Without the ZodError branch in `fail()` a
  // duplicate tier threshold came back as a 500 carrying a raw ZodError JSON string.
  test("a body that fails its step schema is a 400 with a readable message", async () => {
    const Fastify = (await import("fastify")).default;
    const { serializerCompiler, validatorCompiler } = await import("fastify-type-provider-zod");
    const { loyaltyOnboardingRoutes } = await import("./onboarding.route.js");

    const app = Fastify({ logger: false });
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);
    app.addHook("preHandler", async (req) => {
      (req as unknown as { user: unknown }).user = { orgId: ORG, userId: "u", role: "SUPER_ADMIN" };
    });
    app.register(loyaltyOnboardingRoutes, { prefix: "/onboarding" });
    await app.ready();

    const res = await app.inject({
      method: "POST",
      url: "/onboarding/steps/tiers",
      payload: {
        tiersEnabled: true,
        tiers: [
          { name: "A", threshold: 1 },
          { name: "B", threshold: 1 },
        ],
      },
    });

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toContain("different threshold");

    await app.close();
  });
});

describe("idempotency", () => {
  test("re-running earning updates the matching rule instead of creating a second", async () => {
    db.loyaltyEarningRule.findMany.mockResolvedValueOnce([
      { id: "rule-1", name: "Standard Earning" },
    ]);

    await applyEarningStep(ORG, {
      rules: [
        {
          name: "Standard Earning",
          description: null,
          pointsPerUnit: 2,
          multiplier: 1,
          bonusPoints: 0,
          allowedDays: [],
          minPurchaseAmount: null,
          isDefault: true,
          priority: 0,
        },
      ],
    });

    expect(db.loyaltyEarningRule.update).toHaveBeenCalledTimes(1);
    expect(db.loyaltyEarningRule.create).not.toHaveBeenCalled();
  });

  test("re-running tiers updates by name instead of creating duplicates", async () => {
    db.loyaltyTier.findMany.mockResolvedValueOnce([{ id: "tier-1", name: "Bronze" }]);

    await applyTiersStep(ORG, {
      tiersEnabled: true,
      tiers: [
        {
          name: "Bronze",
          threshold: 0,
          pointsMultiplier: 1,
          color: "#CD7F32",
          benefitsDescription: null,
        },
      ],
    });

    expect(db.loyaltyTier.update).toHaveBeenCalledTimes(1);
    expect(db.loyaltyTier.create).not.toHaveBeenCalled();
  });

  test("a tier renamed onto an existing threshold clears the old row first", async () => {
    db.loyaltyTier.findMany.mockResolvedValueOnce([{ id: "tier-1", name: "Silver" }]);

    await applyTiersStep(ORG, {
      tiersEnabled: true,
      tiers: [
        {
          name: "Local",
          threshold: 1000,
          pointsMultiplier: 1,
          color: "#94A3B8",
          benefitsDescription: null,
        },
      ],
    });

    // Without this delete the create would violate @@unique([programId, threshold]).
    expect(db.loyaltyTier.deleteMany).toHaveBeenCalledWith({
      where: {
        programId: "prog-1",
        threshold: { in: [1000] },
        name: { notIn: ["Local"] },
      },
    });
    expect(db.loyaltyTier.create).toHaveBeenCalledTimes(1);
  });

  test("turning tiers off writes no tiers", async () => {
    await applyTiersStep(ORG, { tiersEnabled: false, tiers: [] });

    expect(db.loyaltyTier.create).not.toHaveBeenCalled();
    expect(db.loyaltyTier.update).not.toHaveBeenCalled();
    expect(db.loyaltyProgram.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ tiersEnabled: false }) }),
    );
  });
});

describe("rewards", () => {
  test("rewards are written as ACTIVE, the casing the read paths filter on", async () => {
    await applyRewardsStep(ORG, {
      rewards: [
        {
          name: "10% Off",
          description: null,
          pointsCost: 100,
          rewardType: LoyaltyRewardType.POINT,
          rewardValue: { type: "discount_percentage", percentage: 10 },
          stockQuantity: null,
        },
      ],
    });

    expect(db.loyaltyReward.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "ACTIVE" }) }),
    );
  });

  const reward = (overrides: Record<string, unknown> = {}) => ({
    name: "Free Coffee",
    description: null,
    pointsCost: 5000,
    rewardType: LoyaltyRewardType.POINT,
    rewardValue: { type: "free_item", item_name: "Regular hot drink", item_value: 150 },
    stockQuantity: null,
    ...overrides,
  });

  test("renaming updates the same reward instead of forking a second one", async () => {
    db.loyaltyReward.findMany.mockResolvedValueOnce([{ id: "reward-1", name: "Free Coffee" }]);

    await applyRewardsStep(ORG, {
      rewards: [reward({ id: "reward-1", name: "Free Flat White" })],
    });

    expect(db.loyaltyReward.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "reward-1" },
        data: expect.objectContaining({ name: "Free Flat White" }),
      }),
    );
    expect(db.loyaltyReward.create).not.toHaveBeenCalled();
    expect(db.loyaltyReward.deleteMany).not.toHaveBeenCalled();
  });

  test("a reward dropped from the payload is deleted, not left live", async () => {
    db.loyaltyReward.findMany.mockResolvedValueOnce([
      { id: "reward-1", name: "Free Coffee" },
      { id: "reward-2", name: "10% Off" },
    ]);

    await applyRewardsStep(ORG, { rewards: [reward({ id: "reward-1" })] });

    expect(db.loyaltyReward.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["reward-2"] } },
    });
  });

  test("a dropped reward customers already hold is retired, not deleted", async () => {
    db.loyaltyReward.findMany.mockResolvedValueOnce([
      { id: "reward-1", name: "Free Coffee" },
      { id: "reward-2", name: "10% Off" },
    ]);
    db.customerReward.findMany.mockResolvedValueOnce([{ rewardId: "reward-2" }]);

    await applyRewardsStep(ORG, { rewards: [reward({ id: "reward-1" })] });

    expect(db.loyaltyReward.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["reward-2"] } },
      data: { status: "INACTIVE" },
    });
    expect(db.loyaltyReward.deleteMany).not.toHaveBeenCalled();
  });

  test("a dropped reward with a redemption against it is retired too", async () => {
    db.loyaltyReward.findMany.mockResolvedValueOnce([{ id: "reward-1", name: "Free Coffee" }]);
    db.loyaltyRedemption.findMany.mockResolvedValueOnce([{ rewardId: "reward-1" }]);

    await applyRewardsStep(ORG, { rewards: [] });

    expect(db.loyaltyReward.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["reward-1"] } },
      data: { status: "INACTIVE" },
    });
    expect(db.loyaltyReward.deleteMany).not.toHaveBeenCalled();
  });

  test("falls back to matching on name when the client sends no id", async () => {
    db.loyaltyReward.findMany.mockResolvedValueOnce([{ id: "reward-1", name: "Free Coffee" }]);

    await applyRewardsStep(ORG, { rewards: [reward({ pointsCost: 4000 })] });

    expect(db.loyaltyReward.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "reward-1" } }),
    );
    expect(db.loyaltyReward.create).not.toHaveBeenCalled();
  });

  test("an unknown id creates rather than throwing — a stale client cannot wedge the step", async () => {
    db.loyaltyReward.findMany.mockResolvedValueOnce([]);

    await applyRewardsStep(ORG, {
      rewards: [reward({ id: "00000000-0000-4000-8000-000000000000" })],
    });

    expect(db.loyaltyReward.create).toHaveBeenCalled();
    expect(db.loyaltyReward.update).not.toHaveBeenCalled();
  });
});

describe("messages", () => {
  const command = {
    type: LoyaltyTemplateTypes.PointInformation,
    requestMessage: "points",
    text: "You have {{1}} points.",
  };

  test("a keyword owned by an automated reply is skipped and reported, not fatal", async () => {
    (getAutomatedRepliesByKeyWeords as Mock).mockResolvedValue({ id: "auto-1" });

    const result = await applyMessagesStep(ORG, {
      commands: [command],
      eventTemplates: [],
    });

    expect(result.skipped).toEqual([
      { requestMessage: "points", reason: "keyword_taken_by_automation" },
    ]);
    expect(db.loyaltyWaCommand.create).not.toHaveBeenCalled();
  });

  test("a keyword already used by a different command type is skipped", async () => {
    (getAutomatedRepliesByKeyWeords as Mock).mockResolvedValue(null);
    db.loyaltyWaCommand.findFirst.mockResolvedValue({
      id: "cmd-1",
      type: LoyaltyTemplateTypes.Referral,
    });

    const result = await applyMessagesStep(ORG, { commands: [command], eventTemplates: [] });

    expect(result.skipped[0].reason).toBe("keyword_taken_by_command");
    expect(db.loyaltyWaCommand.create).not.toHaveBeenCalled();
  });

  test("a free keyword is stored as a Text reply carrying a rich-text document", async () => {
    (getAutomatedRepliesByKeyWeords as Mock).mockResolvedValue(null);
    db.loyaltyWaCommand.findFirst.mockResolvedValue(null);

    await applyMessagesStep(ORG, { commands: [command], eventTemplates: [] });

    const written = db.loyaltyWaCommand.create.mock.calls[0][0].data;
    expect(written.responseType).toBe("Text");
    expect(written.content.type).toBe("doc");
    expect(JSON.stringify(written.content)).toContain("{{1}}");
  });

  test("a Meta failure is reported per template and does not fail the step", async () => {
    (getAutomatedRepliesByKeyWeords as Mock).mockResolvedValue(null);
    (createTemplate as Mock).mockRejectedValue(new Error("Error creating template in whatsapp"));

    const result = await applyMessagesStep(ORG, {
      commands: [],
      eventTemplates: [
        {
          eventType: LoyaltyEventType.POINTS_ISSUED,
          templateName: "loyalty_points_issued",
          body: "Hi {{1}}",
        },
      ],
    });

    expect(result.eventTemplates).toEqual([
      {
        eventType: LoyaltyEventType.POINTS_ISSUED,
        templateName: "loyalty_points_issued",
        status: "failed",
        error: "Error creating template in whatsapp",
      },
    ]);
  });

  test("an existing trigger is updated rather than duplicated", async () => {
    (getAutomatedRepliesByKeyWeords as Mock).mockResolvedValue(null);
    (createTemplate as Mock).mockResolvedValue({ name: "loyalty_birthday" });
    (saveTemplate as Mock).mockResolvedValue({ id: "tpl-1" });
    db.loyaltyEventTrigger.findFirst.mockResolvedValue({ id: "trigger-1" });

    const result = await applyMessagesStep(ORG, {
      commands: [],
      eventTemplates: [
        {
          eventType: LoyaltyEventType.BIRTHDAY,
          templateName: "loyalty_birthday",
          body: "Happy birthday {{1}}",
        },
      ],
    });

    // LoyaltyEventTrigger has no unique on [programId, eventType], so this is the only
    // thing stopping two enabled triggers racing for the same event.
    expect(db.loyaltyEventTrigger.update).toHaveBeenCalledTimes(1);
    expect(db.loyaltyEventTrigger.create).not.toHaveBeenCalled();
    expect(result.eventTemplates[0].status).toBe("pending");
  });

  test("a body's sample values match its distinct placeholder count", async () => {
    (getAutomatedRepliesByKeyWeords as Mock).mockResolvedValue(null);
    (createTemplate as Mock).mockResolvedValue({});
    (saveTemplate as Mock).mockResolvedValue({ id: "tpl-1" });
    db.loyaltyEventTrigger.findFirst.mockResolvedValue(null);

    await applyMessagesStep(ORG, {
      commands: [],
      eventTemplates: [
        {
          eventType: LoyaltyEventType.REWARD_REDEEMED,
          templateName: "loyalty_reward_redeemed",
          body: "Hi {{1}}, reward {{2}} code {{3}} for {{4}} points",
        },
      ],
    });

    const sent = (createTemplate as Mock).mock.calls[0][1];
    expect(sent.components[0].example.body_text[0]).toHaveLength(4);
  });
});

describe("activate", () => {
  test("refuses a programme with no default earning rule", async () => {
    db.loyaltyEarningRule.findFirst.mockResolvedValue(null);

    await expect(activateProgram(ORG)).rejects.toBeInstanceOf(OnboardingError);
    expect(db.loyaltyProgram.update).not.toHaveBeenCalled();
  });

  test("activates and warns about soft gaps without blocking", async () => {
    db.loyaltyEarningRule.findFirst.mockResolvedValue(DEFAULT_RULE);
    db.loyaltyReward.findMany.mockResolvedValue([]);
    db.whatsappSettings.count.mockResolvedValue(0);

    const result = await activateProgram(ORG);

    expect(db.loyaltyProgram.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "active" }) }),
    );
    expect(result.warnings).toHaveLength(2);
  });

  test("a complete programme activates with no warnings", async () => {
    db.loyaltyEarningRule.findFirst.mockResolvedValue(DEFAULT_RULE);
    db.loyaltyReward.findMany.mockResolvedValue([HEALTHY_REWARD]);
    db.whatsappSettings.count.mockResolvedValue(1);

    expect((await activateProgram(ORG)).warnings).toEqual([]);
  });

  test("warns, without blocking, when the programme gives back more than a margin", async () => {
    db.loyaltyEarningRule.findFirst.mockResolvedValue(DEFAULT_RULE);
    // 150 of value for 100 points at 1 point per unit: spend 100, get 150 back.
    db.loyaltyReward.findMany.mockResolvedValue([{ ...HEALTHY_REWARD, pointsCost: 100 }]);
    db.whatsappSettings.count.mockResolvedValue(1);

    const result = await activateProgram(ORG);

    expect(result.warnings).toContainEqual(expect.stringContaining("150% of revenue"));
    expect(db.loyaltyProgram.update).toHaveBeenCalled();
  });

  test("warns when the default rule awards nothing — the hard guard only checks it exists", async () => {
    db.loyaltyEarningRule.findFirst.mockResolvedValue({
      ...DEFAULT_RULE,
      pointsPerUnit: 0,
      bonusPoints: 0,
    });
    db.loyaltyReward.findMany.mockResolvedValue([HEALTHY_REWARD]);
    db.whatsappSettings.count.mockResolvedValue(1);

    expect((await activateProgram(ORG)).warnings).toContainEqual(
      expect.stringContaining("awards no points"),
    );
  });

  test("says so when there is no order value to estimate against", async () => {
    db.loyaltyProgram.findUnique.mockResolvedValue({ ...PROGRAM, averageOrderValue: null });
    db.loyaltyEarningRule.findFirst.mockResolvedValue(DEFAULT_RULE);
    db.loyaltyReward.findMany.mockResolvedValue([
      {
        name: "10% Off",
        pointsCost: 500,
        rewardValue: { type: "discount_percentage", percentage: 10 },
      },
    ]);
    db.whatsappSettings.count.mockResolvedValue(1);

    expect((await activateProgram(ORG)).warnings).toContainEqual(
      expect.stringContaining("could not estimate"),
    );
  });

  test("a missing programme is a 409, not a crash", async () => {
    db.loyaltyProgram.findUnique.mockResolvedValue(null);

    await expect(activateProgram(ORG)).rejects.toMatchObject({ statusCode: 409 });
  });
});
