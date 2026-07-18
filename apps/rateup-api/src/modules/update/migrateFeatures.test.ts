import { describe, expect, test, vi } from "vitest";

// The module imports prisma + queue-adjacent helpers at load time; stub prisma so
// importing the pure transform never touches a database.
vi.mock("../../utils/prisma.js", () => ({ default: {} }));
vi.mock("../../utils/redisConnection.ts", () => ({}));

import { migrateFeaturesToCurrentSchema } from "./update.service.js";

// A representative LEGACY feature blob (menu/ticket/loyalty + message-based whatsapp).
const legacy = {
  ai: { count: { promptTokens: 111, completionTokens: 222 }, active: false },
  menu: { count: { max: 1, monthlyViewLimit: 50 }, active: false },
  team: { count: { max: 3 }, active: true, teamMember: { count: { max: 4 }, active: true } },
  ticket: { count: { max: 0 }, active: false },
  loyalty: { active: false, action: { count: { max: 0 }, active: true } },
  whatsapp: {
    flow: { count: { max: 1 }, active: true },
    count: { max: 0, monthlyMessageLimit: 1000 },
    active: true,
    survey: { count: { max: 0 }, active: true },
    campaign: { count: { max: 1 }, active: true },
    template: { count: { max: 1 }, active: true },
    automation: { count: { max: 1 }, active: true },
  },
  webSurvey: {
    count: { max: 7, monthlyResponseLimit: 900 },
    active: true,
    webhook: { active: false },
    encryption: { active: true },
    googleReview: { active: true },
    htmlCodePage: { active: false },
    emailNotification: { active: true },
  },
  reputationManagement: { count: { max: 5 }, active: true },
};

describe("migrateFeaturesToCurrentSchema", () => {
  const migrated = migrateFeaturesToCurrentSchema(legacy) as any;

  test("preserves surviving feature values verbatim", () => {
    expect(migrated.team.count.max).toBe(3);
    expect(migrated.team.teamMember.count.max).toBe(4);
    expect(migrated.webSurvey.count.max).toBe(7);
    expect(migrated.webSurvey.count.monthlyResponseLimit).toBe(900);
    expect(migrated.webSurvey.encryption.active).toBe(true);
    expect(migrated.webSurvey.googleReview.active).toBe(true);
    expect(migrated.webSurvey.emailNotification.active).toBe(true);
    expect(migrated.webSurvey.htmlCodePage.active).toBe(false);
    expect(migrated.reputationManagement.count.max).toBe(5);
    expect(migrated.ai.count.promptTokens).toBe(111);
    expect(migrated.ai.count.completionTokens).toBe(222);
  });

  test("rebuilds WhatsApp around conversation pooled at 1,000,000", () => {
    expect(migrated.whatsapp.active).toBe(true);
    expect(migrated.whatsapp.conversation.active).toBe(true);
    expect(migrated.whatsapp.conversation.count.max).toBe(1_000_000);
    // legacy message-based count and sub-features are gone
    expect(migrated.whatsapp.count).toBeUndefined();
    expect(migrated.whatsapp.flow).toBeUndefined();
    expect(migrated.whatsapp.template).toBeUndefined();
    expect(migrated.whatsapp.automation).toBeUndefined();
  });

  test("drops retired top-level features", () => {
    expect("menu" in migrated).toBe(false);
    expect("ticket" in migrated).toBe(false);
    expect("loyalty" in migrated).toBe(false);
  });

  test("only emits the current schema's top-level keys", () => {
    expect(Object.keys(migrated).sort()).toEqual(
      ["ai", "reputationManagement", "team", "webSurvey", "whatsapp"].sort(),
    );
  });

  test("falls back to safe defaults for a missing/empty blob", () => {
    const fromEmpty = migrateFeaturesToCurrentSchema(undefined) as any;
    expect(fromEmpty.team.count.max).toBe(1);
    expect(fromEmpty.whatsapp.conversation.count.max).toBe(1_000_000);
    expect(fromEmpty.webSurvey.active).toBe(false);
  });
});
