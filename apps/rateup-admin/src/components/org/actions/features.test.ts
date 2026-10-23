import { describe, expect, test } from "vitest";

import { UNLIMITED_COUNT, type SubscriptionFeatures } from "@/api/org-actions.api";

import { completeFeatures, formatLimit, isUnlimited, LIMITS, SWITCHES } from "./features";

/**
 * The keys rateup-api's staff schema requires (`subscriptionFeaturesSchema` in
 * src/modules/staff/orgs/subscription.schema.ts). Every save sends a whole blob, so one
 * missing key here makes every override and plan edit fail validation.
 */
const REQUIRED_SHAPE = {
  team: ["active", "count", "teamMember"],
  webSurvey: [
    "active",
    "encryption",
    "googleReview",
    "emailNotification",
    "htmlCodePage",
    "webhook",
    "count",
  ],
  whatsapp: [
    "active",
    "activeContacts",
    "campaignCredits",
    "campaign",
    "loyalty",
    "referrals",
    "catalog",
  ],
  ai: ["active", "count"],
} as const;

const stored: Partial<SubscriptionFeatures> = {
  team: { active: true, count: { max: 2 }, teamMember: { active: true, count: { max: 5 } } },
  webSurvey: {
    active: true,
    encryption: { active: false },
    googleReview: { active: true },
    emailNotification: { active: false },
    htmlCodePage: { active: false },
    webhook: { active: true },
    count: { monthlyResponseLimit: 1000 },
  },
  whatsapp: {
    active: true,
    activeContacts: { active: true, count: { max: 1000 } },
    campaignCredits: { active: true, count: { max: 10_000 } },
    campaign: { active: true },
    loyalty: { active: true },
    referrals: { active: false },
    catalog: { active: false },
  },
  ai: { active: false, count: { completionTokens: 0, promptTokens: 0 } },
};

describe("completeFeatures", () => {
  test("builds every key the API's staff schema requires", () => {
    const blob = completeFeatures(stored) as unknown as Record<string, Record<string, unknown>>;
    for (const [section, keys] of Object.entries(REQUIRED_SHAPE)) {
      expect(Object.keys(blob[section]).sort()).toEqual([...keys].sort());
    }
  });

  test("never sends the retired conversation allowance", () => {
    const whatsapp = completeFeatures(stored).whatsapp as unknown as Record<string, unknown>;
    expect(whatsapp).not.toHaveProperty("conversation");
  });

  test("keeps the stored values", () => {
    const blob = completeFeatures(stored);
    expect(blob.whatsapp.activeContacts).toEqual({ active: true, count: { max: 1000 } });
    expect(blob.whatsapp.campaignCredits.count.max).toBe(10_000);
    expect(blob.team.teamMember.count.max).toBe(5);
    expect(blob.webSurvey.webhook.active).toBe(true);
  });

  test("an empty or legacy blob starts every switch off and every count at zero", () => {
    for (const input of [null, undefined, {}]) {
      const blob = completeFeatures(input);
      expect(blob.whatsapp.catalog).toEqual({ active: false });
      expect(blob.whatsapp.loyalty).toEqual({ active: false });
      expect(blob.whatsapp.activeContacts).toEqual({ active: false, count: { max: 0 } });
      expect(blob.ai.active).toBe(false);
    }
  });

  test("does not share objects with the stored blob", () => {
    const blob = completeFeatures(stored);
    blob.whatsapp.activeContacts.count.max = 1;
    expect(stored.whatsapp?.activeContacts.count.max).toBe(1000);
  });
});

describe("switches", () => {
  const byKey = (key: string) => SWITCHES.find((s) => s.key === key)!;

  test("the Commerce switch is the catalog gate the shop uses", () => {
    const commerce = byKey("catalog");
    expect(commerce.label).toMatch(/commerce/i);
    const blob = completeFeatures(stored);
    commerce.set(blob, true);
    expect(blob.whatsapp.catalog).toEqual({ active: true });
    expect(commerce.get(blob)).toBe(true);
  });

  test("each switch reads back what it wrote", () => {
    for (const gate of SWITCHES) {
      const blob = completeFeatures(null);
      gate.set(blob, true);
      expect(gate.get(blob), gate.key).toBe(true);
      gate.set(blob, false);
      expect(gate.get(blob), gate.key).toBe(false);
    }
  });

  test("a switch only touches its own key", () => {
    const blob = completeFeatures(stored);
    byKey("loyalty").set(blob, false);
    expect(blob.whatsapp.campaign).toEqual({ active: true });
    expect(blob.whatsapp.activeContacts.count.max).toBe(1000);
  });
});

describe("limits", () => {
  test("each limit reads back what it wrote", () => {
    for (const limit of LIMITS) {
      const blob = completeFeatures(null);
      limit.set(blob, 42);
      expect(limit.get(blob), limit.key).toBe(42);
    }
  });

  test("lists active contacts and campaign credits, not conversations", () => {
    const keys = LIMITS.map((l) => l.key as string);
    expect(keys).toContain("activeContacts");
    expect(keys).toContain("campaignCredits");
    expect(keys).not.toContain("conversations");
  });

  test("a blob stored before the order cap stays uncapped rather than gaining a 0", () => {
    expect(completeFeatures({}).whatsapp.shopOrders).toBeUndefined();
    const capped = completeFeatures({
      whatsapp: { shopOrders: { active: true, count: { max: 50 } } },
    } as never);
    expect(capped.whatsapp.shopOrders).toEqual({ active: true, count: { max: 50 } });
  });

  test("shop orders read as not metered when absent or 0, and 0 removes the cap", () => {
    const orders = LIMITS.find((limit) => limit.key === "orders")!;
    expect(formatLimit(undefined, orders)).toBe("Not metered");
    expect(formatLimit(0, orders)).toBe("Not metered");
    expect(formatLimit(50, orders)).toBe("50");
    const features = completeFeatures({
      whatsapp: { shopOrders: { active: true, count: { max: 50 } } },
    } as never);
    orders.set(features, 0);
    expect(features.whatsapp.shopOrders).toBeUndefined();
  });

  test("reads from a partial or missing blob without throwing", () => {
    for (const limit of LIMITS) expect(limit.get(null)).toBeUndefined();
  });
});

describe("unlimited", () => {
  test("the sentinel and anything above it is unlimited", () => {
    expect(isUnlimited(UNLIMITED_COUNT)).toBe(true);
    expect(isUnlimited(UNLIMITED_COUNT + 1)).toBe(true);
    expect(isUnlimited(UNLIMITED_COUNT - 1)).toBe(false);
    expect(isUnlimited(undefined)).toBe(false);
  });

  test("formatLimit spells the sentinel and a missing value", () => {
    expect(formatLimit(UNLIMITED_COUNT)).toBe("Unlimited");
    expect(formatLimit(undefined)).toBe("—");
    expect(formatLimit(1500)).toBe("1,500");
  });
});
