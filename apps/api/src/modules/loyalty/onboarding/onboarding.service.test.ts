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
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
    },
    loyaltyTier: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
    loyaltyTransaction: { findMany: vi.fn() },
    customerLoyaltyAccount: { count: vi.fn(), updateMany: vi.fn() },
    approvalRequest: { count: vi.fn() },
    waTemplate: { count: vi.fn() },
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
    loyaltyWaCommand: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    loyaltyEventTrigger: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
      count: vi.fn(),
    },
    whatsappSettings: { count: vi.fn() },
    // Steps write through one transaction; handing the callback the same client keeps
    // the assertions below reading against a single set of mocks.
    $transaction: vi.fn((fn: (tx: unknown) => unknown) => fn(client)),
  };
  return { default: client };
});

vi.mock("../tiers/tierReevaluation.service.js", () => ({
  reevaluateProgramTiers: vi.fn(async () => ({ evaluated: 0, promoted: 0, demoted: 0 })),
}));

vi.mock("../../whatsapp/automatedReply/wa_automatedReply.service.js", () => ({
  getAutomatedRepliesByKeyWeords: vi.fn(),
}));

vi.mock("../../whatsapp/messageTemplates/wa_templates.service.js", () => ({
  createTemplate: vi.fn(),
  saveTemplate: vi.fn(),
  getTemplateByNameAndOrgId: vi.fn(),
}));

import prisma from "../../../utils/prisma.js";
import { LoyaltyEventType, LoyaltyTemplateTypes } from "../../../types/enums.js";
import { LoyaltyRewardType } from "../../../types/loyalty.js";
import { getAutomatedRepliesByKeyWeords } from "../../whatsapp/automatedReply/wa_automatedReply.service.js";
import {
  createTemplate,
  getTemplateByNameAndOrgId,
  saveTemplate,
} from "../../whatsapp/messageTemplates/wa_templates.service.js";
import { reevaluateProgramTiers } from "../tiers/tierReevaluation.service.js";
import { tiersStepSchema, earningStepSchema, profileStepSchema } from "./onboarding.schema.js";
import { LOYALTY_PRESETS, suggestPresetKey } from "./presets.js";
import {
  activateProgram,
  applyProfileStep,
  applyEarningStep,
  applyMessagesStep,
  applyRewardsStep,
  applyTiersStep,
  getOnboardingState,
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
  db.loyaltyTransaction.findMany.mockResolvedValue([]);
  db.customerLoyaltyAccount.count.mockResolvedValue(0);
  db.loyaltyEarningRule.create.mockResolvedValue({ id: "new-rule" });
  db.loyaltyTier.create.mockResolvedValue({ id: "new-tier" });
  (getTemplateByNameAndOrgId as Mock).mockResolvedValue(null);
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

  // Bonus rules (weekends, midweek, check-ins) are the merchant's to add afterwards; a
  // preset that shipped one would switch it on for everyone who accepts the defaults.
  test("every preset has only its default earning rule, so activate cannot refuse it", () => {
    for (const preset of Object.values(LOYALTY_PRESETS)) {
      expect(preset.earningRules, preset.key).toHaveLength(1);
      expect(preset.earningRules[0].isDefault, preset.key).toBe(true);
    }
  });

  // "Variables can't be at the start or end of the template." — Meta refuses the
  // submission, so it is a hard requirement on `eventTemplates`, which become real
  // templates. The numbering must also ascend in order of appearance, so a trailing slot
  // cannot be fixed by swapping it with an earlier one. Command replies are held to the
  // same shape as house style rather than by Meta: their text is stored as reply content,
  // never submitted, but a reply that stops mid-value reads like it was cut off.
  test("no preset message opens or closes on a variable", () => {
    const opens = /^\s*\{\{\d+\}\}/;
    const closes = /\{\{\d+\}\}\s*$/;

    // The patterns against the bodies they were written for, so a pattern that stopped
    // matching cannot quietly pass the catalogue.
    expect(opens.test("{{1}}, {{2}} points expire on {{3}}.")).toBe(true);
    expect(closes.test("Send a friend this link: {{2}}")).toBe(true);

    for (const preset of Object.values(LOYALTY_PRESETS)) {
      const bodies = [
        ...preset.commands.map((c) => [`${preset.key}/${c.requestMessage}`, c.text] as const),
        ...preset.eventTemplates.map((e) => [`${preset.key}/${e.templateName}`, e.body] as const),
      ];
      for (const [where, body] of bodies) {
        expect(opens.test(body), `${where} opens on a variable`).toBe(false);
        expect(closes.test(body), `${where} closes on a variable`).toBe(false);

        const order = [...body.matchAll(/\{\{(\d+)\}\}/g)].map((m) => Number(m[1]));
        expect(order, `${where} numbering`).toEqual([...order].sort((a, b) => a - b));
      }
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
      LoyaltyTemplateTypes.MemberCard,
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

  test("profile no longer defaults the bonuses — they are the rewards step's to set", () => {
    const parsed = profileStepSchema.parse({ name: "Beans" });

    expect(parsed.signupBonus).toBeUndefined();
    expect(parsed.referralBonus).toBeUndefined();
    expect(parsed.refereeBonus).toBeUndefined();
    // The wizard no longer asks what kind of business this is.
    expect(parsed.presetKey).toBeUndefined();
  });

  test("a brand colour must be a six-digit hex", () => {
    expect(profileStepSchema.safeParse({ name: "Beans", brandColor: "#1C518E" }).success).toBe(
      true,
    );
    expect(profileStepSchema.safeParse({ name: "Beans", brandColor: "navy" }).success).toBe(false);
    expect(profileStepSchema.safeParse({ name: "Beans", brandColor: "#fff" }).success).toBe(false);
  });

  test("the tier qualification window is one to twenty-four months, or null for lifetime", () => {
    const base = { tiersEnabled: false, tiers: [] };
    expect(tiersStepSchema.safeParse({ ...base, qualificationWindowMonths: 6 }).success).toBe(true);
    expect(tiersStepSchema.safeParse({ ...base, qualificationWindowMonths: null }).success).toBe(
      true,
    );
    expect(tiersStepSchema.safeParse({ ...base, qualificationWindowMonths: 0 }).success).toBe(
      false,
    );
    expect(tiersStepSchema.safeParse({ ...base, qualificationWindowMonths: 36 }).success).toBe(
      false,
    );
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

  test("a tier at the same threshold under a new name is updated in place, keeping its members", async () => {
    db.loyaltyTier.findMany.mockResolvedValueOnce([
      { id: "tier-0", name: "Bronze", threshold: 0 },
      { id: "tier-1", name: "Silver", threshold: 1000 },
    ]);

    await applyTiersStep(ORG, {
      tiersEnabled: true,
      tiers: [
        {
          name: "Member",
          threshold: 0,
          pointsMultiplier: 1,
          color: "#5a8cc6",
          benefitsDescription: null,
        },
        {
          name: "Local",
          threshold: 1000,
          pointsMultiplier: 1,
          color: "#94A3B8",
          benefitsDescription: null,
        },
      ],
    });

    // @@unique([programId, threshold]) used to be satisfied by deleting the old row, which
    // silently set every member's currentTierId to null. Both rows are renamed in place.
    expect(db.loyaltyTier.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "tier-0" },
        data: expect.objectContaining({ name: "Member" }),
      }),
    );
    expect(db.loyaltyTier.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "tier-1" },
        data: expect.objectContaining({ name: "Local" }),
      }),
    );
    expect(db.loyaltyTier.create).not.toHaveBeenCalled();
    expect(db.loyaltyTier.deleteMany).not.toHaveBeenCalled();
  });

  test("a payload without a 0-threshold tier gets a Member base tier added", async () => {
    await applyTiersStep(ORG, {
      tiersEnabled: true,
      tiers: [
        {
          name: "VIP",
          threshold: 5000,
          pointsMultiplier: 1,
          color: "#f8951d",
          benefitsDescription: null,
        },
      ],
    });

    const created = db.loyaltyTier.create.mock.calls.map((c) => c[0].data);
    expect(created).toEqual([
      expect.objectContaining({ name: "Member", threshold: 0, priority: 1 }),
      expect.objectContaining({ name: "VIP", threshold: 5000, priority: 2 }),
    ]);
  });

  test("qualificationWindowMonths is written to the programme, and null clears it", async () => {
    const vip = {
      name: "VIP",
      threshold: 5000,
      pointsMultiplier: 1,
      color: "#f8951d",
      benefitsDescription: null,
    };

    await applyTiersStep(ORG, { tiersEnabled: true, tiers: [vip], qualificationWindowMonths: 6 });
    expect(db.loyaltyProgram.update.mock.calls.at(-1)?.[0].data).toMatchObject({
      tierQualificationWindowMonths: 6,
    });

    await applyTiersStep(ORG, {
      tiersEnabled: true,
      tiers: [vip],
      qualificationWindowMonths: null,
    });
    expect(db.loyaltyProgram.update.mock.calls.at(-1)?.[0].data).toMatchObject({
      tierQualificationWindowMonths: null,
    });

    await applyTiersStep(ORG, { tiersEnabled: true, tiers: [vip] });
    expect(db.loyaltyProgram.update.mock.calls.at(-1)?.[0].data).not.toHaveProperty(
      "tierQualificationWindowMonths",
    );
  });

  test("re-places every member on the new ladder once it is saved, and reports the moves", async () => {
    db.loyaltyTier.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([
      { id: "tier-1", name: "Member", threshold: 0 },
      { id: "tier-2", name: "VIP", threshold: 5000 },
    ]);
    (reevaluateProgramTiers as Mock).mockResolvedValueOnce({
      evaluated: 40,
      promoted: 3,
      demoted: 1,
    });

    const result = await applyTiersStep(ORG, {
      tiersEnabled: true,
      tiers: [
        {
          name: "VIP",
          threshold: 5000,
          pointsMultiplier: 1,
          color: "#f8951d",
          benefitsDescription: null,
        },
      ],
      qualificationWindowMonths: 6,
    });

    expect(reevaluateProgramTiers).toHaveBeenCalledWith({
      id: "prog-1",
      orgId: ORG,
      windowMonths: 6,
      // Highest threshold first — the order `pickQualifiedTier` reads.
      tiers: [
        { id: "tier-2", name: "VIP", threshold: 5000 },
        { id: "tier-1", name: "Member", threshold: 0 },
      ],
    });
    expect(result.moves).toEqual({ evaluated: 40, promoted: 3, demoted: 1 });
  });

  test("the step accepts three tiers and refuses a fourth", () => {
    const tier = (name: string, threshold: number) => ({ name, threshold, pointsMultiplier: 1 });
    expect(
      tiersStepSchema.safeParse({
        tiers: [tier("Member", 0), tier("Silver", 2000), tier("Gold", 8000)],
      }).success,
    ).toBe(true);
    expect(
      tiersStepSchema.safeParse({
        tiers: [
          tier("Member", 0),
          tier("Silver", 2000),
          tier("Gold", 8000),
          tier("Platinum", 20000),
        ],
      }).success,
    ).toBe(false);
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

describe("profile", () => {
  const profile = {
    name: "Beans",
    currencyName: "Beans",
    currencyCode: "INR",
    currencySymbol: "\u20b9",
  };

  test("a payload without bonuses does not reset the stored ones to zero", async () => {
    await applyProfileStep(ORG, { presetKey: "cafe", ...profile });

    const data = db.loyaltyProgram.update.mock.calls.at(-1)?.[0].data;
    expect(data).not.toHaveProperty("signupBonus");
    expect(data).not.toHaveProperty("referralBonus");
    expect(data).not.toHaveProperty("refereeBonus");
  });

  test("a programme created here still starts with zeroed bonuses", async () => {
    db.loyaltyProgram.findUnique.mockResolvedValueOnce(null);
    db.loyaltyProgram.create.mockResolvedValueOnce(PROGRAM);

    await applyProfileStep(ORG, { presetKey: "cafe", ...profile });

    expect(db.loyaltyProgram.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ signupBonus: 0, referralBonus: 0, refereeBonus: 0 }),
      }),
    );
  });

  test("infers the preset from the org's industry when the payload sends none", async () => {
    db.loyaltyProgram.findUnique.mockResolvedValueOnce(null);
    db.loyaltyProgram.create.mockResolvedValueOnce(PROGRAM);
    db.org.findUnique.mockResolvedValueOnce({ onboarding: { industry: "Hair salon" } });

    await applyProfileStep(ORG, profile);

    expect(db.loyaltyProgram.create.mock.calls[0][0].data).toMatchObject({
      onboardingPresetKey: "salon",
      onboardingStep: "profile",
    });
  });

  test("an explicit presetKey still wins over the inferred one", async () => {
    db.loyaltyProgram.findUnique.mockResolvedValueOnce(null);
    db.loyaltyProgram.create.mockResolvedValueOnce(PROGRAM);
    db.org.findUnique.mockResolvedValueOnce({ onboarding: { industry: "Hair salon" } });

    await applyProfileStep(ORG, { presetKey: "gym", ...profile });

    expect(db.loyaltyProgram.create.mock.calls[0][0].data).toMatchObject({
      onboardingPresetKey: "gym",
    });
  });

  test("re-running the profile without a preset keeps the one the programme was seeded from", async () => {
    await applyProfileStep(ORG, profile);

    expect(db.loyaltyProgram.update.mock.calls.at(-1)?.[0].data).not.toHaveProperty(
      "onboardingPresetKey",
    );
  });

  test("a payload without branding fields leaves the stored branding alone", async () => {
    await applyProfileStep(ORG, profile);

    const data = db.loyaltyProgram.update.mock.calls.at(-1)?.[0].data;
    for (const key of [
      "logoUrl",
      "brandColor",
      "heroImageUrl",
      "timezone",
      "contactName",
      "businessName",
    ]) {
      expect(data).not.toHaveProperty(key);
    }
  });

  test("branding is written through, and a null clears", async () => {
    await applyProfileStep(ORG, {
      ...profile,
      businessName: "Kettle & Co",
      timezone: "Asia/Kolkata",
      brandColor: null,
      logoUrl: "https://cdn.example.com/logo.png",
      contactEmail: "owner@example.com",
    });

    expect(db.loyaltyProgram.update.mock.calls.at(-1)?.[0].data).toMatchObject({
      businessName: "Kettle & Co",
      timezone: "Asia/Kolkata",
      brandColor: null,
      logoUrl: "https://cdn.example.com/logo.png",
      contactEmail: "owner@example.com",
    });
  });
});

describe("controller step aliases", () => {
  test("the legacy 'basics' step id is routed to the profile step", async () => {
    const { applyStepHandler } = await import("./onboarding.controller.js");
    const rep: Record<string, Mock> = { code: vi.fn(() => rep), send: vi.fn(() => rep) };

    await applyStepHandler(
      { user: { orgId: ORG }, params: { step: "basics" }, body: { name: "Beans" } } as never,
      rep as never,
    );

    expect(rep.code).toHaveBeenCalledWith(200);
    expect(db.loyaltyProgram.update.mock.calls.at(-1)?.[0].data).toMatchObject({
      onboardingStep: "profile",
    });
  });
});

describe("earning — typical order value", () => {
  const rule = {
    name: "Standard Earning",
    description: null,
    pointsPerUnit: 1,
    multiplier: 1,
    bonusPoints: 0,
    allowedDays: [],
    minPurchaseAmount: null,
    isDefault: true,
    priority: 0,
  };

  test("is written to the programme when the payload carries it", async () => {
    await applyEarningStep(ORG, { rules: [rule], averageOrderValue: 320 });

    expect(db.loyaltyProgram.update.mock.calls.at(-1)?.[0].data).toMatchObject({
      onboardingStep: "earning",
      averageOrderValue: 320,
    });
  });

  test("is left alone when the payload says nothing about it", async () => {
    await applyEarningStep(ORG, { rules: [rule] });

    const data = db.loyaltyProgram.update.mock.calls.at(-1)?.[0].data;
    expect(data).not.toHaveProperty("averageOrderValue");
    expect(data).not.toHaveProperty("currencyName");
  });

  test("renames the points when the payload carries a name", async () => {
    await applyEarningStep(ORG, { rules: [rule], currencyName: "Stars" });

    expect(db.loyaltyProgram.update.mock.calls.at(-1)?.[0].data).toMatchObject({
      currencyName: "Stars",
    });
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

  test("the join and referral bonuses are written from this step", async () => {
    await applyRewardsStep(ORG, {
      rewards: [reward()],
      signupBonus: 100,
      referralBonus: 250,
      refereeBonus: 50,
    });

    expect(db.loyaltyProgram.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ signupBonus: 100, referralBonus: 250, refereeBonus: 50 }),
      }),
    );
  });

  test("a payload without bonuses leaves the stored ones alone", async () => {
    await applyRewardsStep(ORG, { rewards: [reward()] });

    const data = db.loyaltyProgram.update.mock.calls.at(-1)?.[0].data;
    expect(data).not.toHaveProperty("signupBonus");
    expect(data).not.toHaveProperty("referralBonus");
    expect(data).not.toHaveProperty("refereeBonus");
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
    // The words outlive the refusal: inside an open window they are all a send needs.
    expect(db.loyaltyEventTrigger.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: { body: "Hi {{1}}" } }),
    );
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

describe("section editing — the steps reused on a live programme", () => {
  const rule = (over: Record<string, unknown> = {}) => ({
    name: "Standard Earning",
    description: null,
    pointsPerUnit: 1,
    multiplier: 1,
    bonusPoints: 0,
    allowedDays: [],
    minPurchaseAmount: null,
    isDefault: true,
    priority: 0,
    ...over,
  });

  test("a rule's tier restriction is left alone unless the payload speaks to it", async () => {
    db.loyaltyEarningRule.findMany.mockResolvedValueOnce([
      { id: "rule-1", name: "Standard Earning" },
    ]);

    await applyEarningStep(ORG, { rules: [rule()] });

    expect(db.loyaltyEarningRule.update.mock.calls[0][0].data).not.toHaveProperty(
      "applicableToTiers",
    );

    db.loyaltyEarningRule.findMany.mockResolvedValueOnce([
      { id: "rule-1", name: "Standard Earning" },
    ]);
    await applyEarningStep(ORG, { rules: [rule({ applicableToTiers: ["gold"] })] });

    expect(db.loyaltyEarningRule.update.mock.calls[1][0].data.applicableToTiers).toEqual(["gold"]);
  });

  test("a rule switched off stays off, but the default rule is always active", async () => {
    db.loyaltyEarningRule.findMany.mockResolvedValueOnce([
      { id: "rule-1", name: "Standard Earning" },
      { id: "rule-2", name: "Happy hour" },
    ]);

    await applyEarningStep(ORG, {
      rules: [
        rule({ id: "rule-1", status: "inactive" }),
        rule({ id: "rule-2", name: "Happy hour", isDefault: false, status: "inactive" }),
      ],
    });

    expect(db.loyaltyEarningRule.update.mock.calls[0][0].data.status).toBe("active");
    expect(db.loyaltyEarningRule.update.mock.calls[1][0].data.status).toBe("inactive");
  });

  test("a rule is matched on its id before its name, so a rename sticks", async () => {
    db.loyaltyEarningRule.findMany.mockResolvedValueOnce([
      { id: "rule-1", name: "Standard Earning" },
    ]);

    await applyEarningStep(ORG, {
      rules: [rule({ id: "rule-1", name: "Every purchase" })],
    });

    expect(db.loyaltyEarningRule.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "rule-1" },
        data: expect.objectContaining({ name: "Every purchase" }),
      }),
    );
    expect(db.loyaltyEarningRule.create).not.toHaveBeenCalled();
  });

  test("a rule missing from the payload survives unless deleteMissing is set", async () => {
    db.loyaltyEarningRule.findMany.mockResolvedValueOnce([
      { id: "rule-1", name: "Standard Earning" },
      { id: "rule-2", name: "Happy hour" },
    ]);

    await applyEarningStep(ORG, { rules: [rule({ id: "rule-1" })] });

    expect(db.loyaltyEarningRule.deleteMany).not.toHaveBeenCalled();
    expect(db.loyaltyEarningRule.updateMany).not.toHaveBeenCalled();
  });

  test("with deleteMissing, an unused rule goes and a rule the ledger cites is switched off", async () => {
    db.loyaltyEarningRule.findMany.mockResolvedValueOnce([
      { id: "rule-1", name: "Standard Earning" },
      { id: "rule-2", name: "Happy hour" },
      { id: "rule-3", name: "Monsoon" },
    ]);
    db.loyaltyTransaction.findMany.mockResolvedValueOnce([{ earningRuleId: "rule-2" }]);

    await applyEarningStep(ORG, { rules: [rule({ id: "rule-1" })], deleteMissing: true });

    expect(db.loyaltyEarningRule.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["rule-2"] } },
      data: { status: "inactive" },
    });
    expect(db.loyaltyEarningRule.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["rule-3"] } },
    });
  });

  const tier = (over: Record<string, unknown> = {}) => ({
    name: "Bronze",
    threshold: 0,
    pointsMultiplier: 1,
    color: "#CD7F32",
    benefitsDescription: null,
    ...over,
  });

  test("a tier missing from the payload survives unless deleteMissing is set", async () => {
    db.loyaltyTier.findMany.mockResolvedValueOnce([
      { id: "tier-1", name: "Bronze" },
      { id: "tier-2", name: "Gold" },
    ]);

    await applyTiersStep(ORG, { tiersEnabled: true, tiers: [tier({ id: "tier-1" })] });

    expect(db.loyaltyTier.deleteMany).not.toHaveBeenCalled();
  });

  test("a two-row payload against a four-tier programme with deleteMissing refuses until the downgrade is confirmed", async () => {
    db.loyaltyTier.findMany.mockResolvedValueOnce([
      { id: "tier-1", name: "Bronze", threshold: 0 },
      { id: "tier-2", name: "Silver", threshold: 5000 },
      { id: "tier-3", name: "Gold", threshold: 15000 },
      { id: "tier-4", name: "Platinum", threshold: 50000 },
    ]);
    db.customerLoyaltyAccount.count.mockResolvedValueOnce(0).mockResolvedValueOnce(7);

    await expect(
      applyTiersStep(ORG, {
        tiersEnabled: true,
        tiers: [
          tier({ name: "Member", threshold: 0 }),
          tier({ name: "VIP", threshold: 15000, color: "#f8951d" }),
        ],
        deleteMissing: true,
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
      message: expect.stringContaining("7 members sit in Platinum"),
    });

    // Bronze@0 became Member and Gold@15000 became VIP, both in place; Silver (empty) and
    // Platinum (7 members) were the removed rows, and Platinum is what stops the step.
    expect(db.loyaltyTier.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "tier-1" } }),
    );
    expect(db.loyaltyTier.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "tier-3" } }),
    );
    expect(db.loyaltyTier.create).not.toHaveBeenCalled();
  });

  test("with deleteMissing, an empty tier is removed outright", async () => {
    db.loyaltyTier.findMany.mockResolvedValueOnce([
      { id: "tier-1", name: "Bronze" },
      { id: "tier-2", name: "Gold" },
    ]);

    await applyTiersStep(ORG, {
      tiersEnabled: true,
      tiers: [tier({ id: "tier-1" })],
      deleteMissing: true,
    });

    expect(db.loyaltyTier.deleteMany).toHaveBeenCalledWith({ where: { id: "tier-2" } });
    expect(db.customerLoyaltyAccount.updateMany).not.toHaveBeenCalled();
  });

  test("a removed tier with members is refused until the downgrade is confirmed", async () => {
    db.loyaltyTier.findMany.mockResolvedValueOnce([
      { id: "tier-1", name: "Bronze" },
      { id: "tier-2", name: "Gold" },
    ]);
    db.customerLoyaltyAccount.count.mockResolvedValueOnce(2);

    await expect(
      applyTiersStep(ORG, {
        tiersEnabled: true,
        tiers: [tier({ id: "tier-1" })],
        deleteMissing: true,
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
      message: expect.stringContaining("2 members sit in Gold"),
    });
    expect(db.loyaltyTier.deleteMany).not.toHaveBeenCalledWith({ where: { id: "tier-2" } });
  });

  test("with the downgrade confirmed, members move to the nearest surviving tier below", async () => {
    db.loyaltyTier.findMany
      .mockResolvedValueOnce([
        { id: "tier-1", name: "Bronze" },
        { id: "tier-2", name: "Silver" },
        { id: "tier-3", name: "Gold" },
      ])
      // survivors, ascending by threshold
      .mockResolvedValueOnce([
        { id: "tier-1", threshold: 0 },
        { id: "tier-3", threshold: 15000 },
      ]);
    db.loyaltyTier.findUnique.mockResolvedValueOnce({ threshold: 5000 });
    db.customerLoyaltyAccount.count.mockResolvedValueOnce(143);

    await applyTiersStep(ORG, {
      tiersEnabled: true,
      tiers: [tier({ id: "tier-1" }), tier({ id: "tier-3", name: "Gold", threshold: 15000 })],
      deleteMissing: true,
      downgradeCustomers: true,
    });

    expect(db.customerLoyaltyAccount.updateMany).toHaveBeenCalledWith({
      where: { currentTierId: "tier-2" },
      data: { currentTierId: "tier-1" },
    });
    expect(db.loyaltyTier.deleteMany).toHaveBeenCalledWith({ where: { id: "tier-2" } });
  });

  const reward = (over: Record<string, unknown> = {}) => ({
    name: "Free Coffee",
    description: null,
    pointsCost: 5000,
    rewardType: LoyaltyRewardType.POINT,
    rewardValue: { type: "free_item", item_name: "Regular hot drink", item_value: 150 },
    ...over,
  });

  test("updating a reward leaves stock and tier restriction alone unless the payload sets them", async () => {
    db.loyaltyReward.findMany.mockResolvedValueOnce([{ id: "reward-1", name: "Free Coffee" }]);

    await applyRewardsStep(ORG, { rewards: [reward({ id: "reward-1", pointsCost: 4500 })] });

    const written = db.loyaltyReward.update.mock.calls[0][0].data;
    expect(written).not.toHaveProperty("stockQuantity");
    expect(written).not.toHaveProperty("availableForTiers");
    expect(written).not.toHaveProperty("redemptionRules");
    expect(written.pointsCost).toBe(4500);
  });

  test("an explicit null stock means unlimited, and a tier list is written through", async () => {
    db.loyaltyReward.findMany.mockResolvedValueOnce([{ id: "reward-1", name: "Free Coffee" }]);

    await applyRewardsStep(ORG, {
      rewards: [
        reward({ id: "reward-1", stockQuantity: null, availableForTiers: ["silver", "gold"] }),
      ],
    });

    expect(db.loyaltyReward.update.mock.calls[0][0].data).toMatchObject({
      stockQuantity: null,
      availableForTiers: ["silver", "gold"],
    });
  });

  test("a new reward still defaults to unlimited stock for every tier", async () => {
    await applyRewardsStep(ORG, { rewards: [reward()] });

    expect(db.loyaltyReward.create.mock.calls[0][0].data).toMatchObject({
      stockQuantity: null,
      availableForTiers: [],
      redemptionRules: {},
    });
  });

  test("a template Meta already has by that name is pointed at, not submitted again", async () => {
    (getAutomatedRepliesByKeyWeords as Mock).mockResolvedValue(null);
    (getTemplateByNameAndOrgId as Mock).mockResolvedValue({
      id: "tpl-existing",
      data: { name: "loyalty_birthday", status: "APPROVED" },
    });
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

    expect(createTemplate).not.toHaveBeenCalled();
    expect(saveTemplate).not.toHaveBeenCalled();
    expect(db.loyaltyEventTrigger.update).toHaveBeenCalledWith({
      where: { id: "trigger-1" },
      data: { waTemplateId: "tpl-existing", enabled: true },
    });
    expect(result.eventTemplates[0]).toEqual({
      eventType: LoyaltyEventType.BIRTHDAY,
      templateName: "loyalty_birthday",
      status: "approved",
      templateId: "tpl-existing",
      reused: true,
    });
  });

  test("an empty template list touches neither Meta nor the triggers", async () => {
    await applyMessagesStep(ORG, { commands: [], eventTemplates: [] });

    expect(createTemplate).not.toHaveBeenCalled();
    expect(db.loyaltyEventTrigger.update).not.toHaveBeenCalled();
    expect(db.loyaltyEventTrigger.create).not.toHaveBeenCalled();
  });
});

describe("state", () => {
  test("carries row ids, each trigger's Meta status, and the counts the sidebar shows", async () => {
    db.loyaltyProgram.findUnique.mockResolvedValue({
      ...PROGRAM,
      tiers: [{ id: "tier-1", name: "Bronze" }],
      onboardingPresetKey: "cafe",
      onboardingStep: "rewards",
    });
    db.loyaltyEarningRule.findMany.mockResolvedValue([{ id: "rule-1", name: "Standard" }]);
    db.loyaltyReward.findMany.mockResolvedValue([{ id: "reward-1", name: "Free Coffee" }]);
    db.loyaltyWaCommand.findMany.mockResolvedValue([{ id: "cmd-1" }]);
    db.loyaltyEventTrigger.findMany.mockResolvedValue([
      {
        id: "trigger-1",
        eventType: LoyaltyEventType.BIRTHDAY,
        enabled: true,
        waTemplateId: "tpl-1",
        waTemplate: { id: "tpl-1", data: { name: "loyalty_birthday", status: "PENDING" } },
      },
      {
        id: "trigger-2",
        eventType: LoyaltyEventType.POINTS_ISSUED,
        enabled: false,
        waTemplateId: null,
        waTemplate: null,
      },
    ]);
    db.customerLoyaltyAccount.count.mockResolvedValue(957);
    db.approvalRequest.count.mockResolvedValue(3);
    db.waTemplate.count.mockResolvedValue(2);

    const state = await getOnboardingState(ORG);

    expect(state.saved.rules[0]).toHaveProperty("id", "rule-1");
    expect(state.saved.tiers[0]).toHaveProperty("id", "tier-1");
    expect(state.saved.triggers).toEqual([
      expect.objectContaining({
        id: "trigger-1",
        templateName: "loyalty_birthday",
        templateStatus: "PENDING",
      }),
      expect.objectContaining({ id: "trigger-2", templateName: null, templateStatus: null }),
    ]);
    expect(state.saved.triggers[0]).not.toHaveProperty("waTemplate");
    expect(state.counts).toEqual({
      tiers: 1,
      rules: 1,
      rewards: 1,
      commands: 1,
      triggers: 2,
      members: 957,
      pendingApprovals: 3,
      templatesPending: 2,
    });
    expect(db.approvalRequest.count).toHaveBeenCalledWith({
      where: { status: "PENDING", account: { programId: "prog-1" } },
    });
    expect(db.waTemplate.count.mock.calls[0][0].where).toMatchObject({
      orgId: ORG,
      templateType: "LOYALTY",
      data: { path: ["status"], equals: "PENDING" },
    });
  });

  test("an org with no programme gets zero counts, not nulls", async () => {
    db.loyaltyProgram.findUnique.mockResolvedValue(null);

    const state = await getOnboardingState(ORG);

    expect(state.program).toBeNull();
    expect(state.counts).toMatchObject({ members: 0, pendingApprovals: 0, templatesPending: 0 });
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

  test("warns when tiers run on a window but the ladder has no rung above Member", async () => {
    db.loyaltyProgram.findUnique.mockResolvedValue({
      ...PROGRAM,
      tiersEnabled: true,
      tierQualificationWindowMonths: 6,
    });
    db.loyaltyEarningRule.findFirst.mockResolvedValue(DEFAULT_RULE);
    db.loyaltyReward.findMany.mockResolvedValue([HEALTHY_REWARD]);
    db.loyaltyTier.findMany.mockResolvedValue([
      { id: "t0", name: "Member", threshold: 0, pointsMultiplier: 1 },
    ]);
    db.whatsappSettings.count.mockResolvedValue(1);

    const result = await activateProgram(ORG);

    expect(result.warnings).toContainEqual(expect.stringContaining("no VIP tier above Member"));
    expect(db.loyaltyProgram.update).toHaveBeenCalled();
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
