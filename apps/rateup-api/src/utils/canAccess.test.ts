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
