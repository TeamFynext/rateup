import { describe, expect, test } from "vitest";

import { canAccess, subscriptionGates, TeamFeature } from "./canAccess.js";

// canAccess = subscription gate (if any) AND team/RBAC permission.
const withTeam = (...features: TeamFeature[]) => new Set<TeamFeature>(features);

describe("subscriptionGates", () => {
  test("tickets are free with NO subscription gate", () => {
    expect(subscriptionGates[TeamFeature.tickets]).toBeNull();
  });

  test("gated features still map to their subscription feature", () => {
    expect(subscriptionGates[TeamFeature.inbox]).toBe("whatsapp");
    expect(subscriptionGates[TeamFeature.web_forms]).toBe("webSurvey");
  });
});

describe("canAccess — tickets (ungated)", () => {
  test("granted regardless of subscription features when the team is allowed", () => {
    // Empty features (no `ticket` key at all) must NOT block tickets anymore.
    expect(canAccess({} as any, withTeam(TeamFeature.tickets), TeamFeature.tickets)).toBe(true);
  });

  test("still respects team/RBAC permission", () => {
    expect(canAccess({} as any, withTeam(), TeamFeature.tickets)).toBe(false);
  });
});

describe("canAccess — subscription-gated features", () => {
  test("inbox requires an active whatsapp subscription", () => {
    const features = { whatsapp: { active: true } } as any;
    expect(canAccess(features, withTeam(TeamFeature.inbox), TeamFeature.inbox)).toBe(true);
  });

  test("inbox denied when the whatsapp feature is inactive", () => {
    const features = { whatsapp: { active: false } } as any;
    expect(canAccess(features, withTeam(TeamFeature.inbox), TeamFeature.inbox)).toBe(false);
  });

  test("inbox denied when the whatsapp feature is missing", () => {
    expect(canAccess({} as any, withTeam(TeamFeature.inbox), TeamFeature.inbox)).toBe(false);
  });

  test("web_forms requires an active webSurvey subscription", () => {
    const features = { webSurvey: { active: true } } as any;
    expect(canAccess(features, withTeam(TeamFeature.web_forms), TeamFeature.web_forms)).toBe(true);
  });
});

describe("canAccess — WhatsApp tier gates", () => {
  const free = {
    whatsapp: {
      active: true,
      campaign: { active: false },
      loyalty: { active: false },
    },
  } as any;
  const starter = {
    whatsapp: {
      active: true,
      campaign: { active: true },
      loyalty: { active: true },
    },
  } as any;

  test("campaigns and loyalty gate on their own keys, not on whatsapp.active", () => {
    expect(subscriptionGates[TeamFeature.campaigns]).toBe("whatsapp.campaign");
    expect(subscriptionGates[TeamFeature.loyalty]).toBe("whatsapp.loyalty");
  });

  test("Free keeps the inbox but loses campaigns and loyalty", () => {
    // The whole point of the split: whatsapp.active stays true for every tier, so
    // gating campaigns on it could never express "inbox yes, campaigns no".
    expect(canAccess(free, withTeam(TeamFeature.inbox), TeamFeature.inbox)).toBe(true);
    expect(canAccess(free, withTeam(TeamFeature.campaigns), TeamFeature.campaigns)).toBe(false);
    expect(canAccess(free, withTeam(TeamFeature.loyalty), TeamFeature.loyalty)).toBe(false);
  });

  test("Starter and above get campaigns and loyalty", () => {
    expect(canAccess(starter, withTeam(TeamFeature.campaigns), TeamFeature.campaigns)).toBe(true);
    expect(canAccess(starter, withTeam(TeamFeature.loyalty), TeamFeature.loyalty)).toBe(true);
  });

  test("a subscription stored before the split inherits whatsapp.active", () => {
    // The regression guard: every existing paying org has no `whatsapp.campaign` key.
    // Reading absent-as-false would revoke campaigns from all of them on deploy.
    const legacy = { whatsapp: { active: true } } as any;
    expect(canAccess(legacy, withTeam(TeamFeature.campaigns), TeamFeature.campaigns)).toBe(true);
    expect(canAccess(legacy, withTeam(TeamFeature.loyalty), TeamFeature.loyalty)).toBe(true);
  });

  test("inheritance does not resurrect a deactivated channel", () => {
    const off = { whatsapp: { active: false } } as any;
    expect(canAccess(off, withTeam(TeamFeature.campaigns), TeamFeature.campaigns)).toBe(false);
  });

  test("an explicit false is honoured over the parent", () => {
    expect(canAccess(free, withTeam(TeamFeature.campaigns), TeamFeature.campaigns)).toBe(false);
  });

  test("the Meta Business Agent still rides ai.active — no new key needed", () => {
    expect(subscriptionGates[TeamFeature.ai_chatbot]).toBe("ai");
    const pro = { ai: { active: true } } as any;
    const starterNoAi = { ai: { active: false } } as any;
    expect(canAccess(pro, withTeam(TeamFeature.ai_chatbot), TeamFeature.ai_chatbot)).toBe(true);
    expect(canAccess(starterNoAi, withTeam(TeamFeature.ai_chatbot), TeamFeature.ai_chatbot)).toBe(
      false,
    );
  });
});
