import { beforeEach, describe, expect, test, vi } from "vitest";

const subscriptionQuery = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));
const usageQuery = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));
const statsQuery = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));

vi.mock("@/backend/subscription/subscription.query", () => ({
  useSubscription: () => subscriptionQuery.current,
  useSubscriptionUsage: () => usageQuery.current,
}));
vi.mock("@/backend/stats/stats.query", () => ({
  useUsageStats: () => statsQuery.current,
}));

// The hook's only React dependency is useMemo, which outside a render just calls through.
vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return { ...actual, useMemo: (factory: () => unknown) => factory() };
});

import { usePlanStatus } from "./usePlanStatus";

function features(overrides: Record<string, unknown> = {}) {
  return {
    team: { count: { max: 2 }, teamMember: { count: { max: 10 } } },
    webSurvey: { count: { monthlyResponseLimit: 100 } },
    ...overrides,
  };
}

function contacts(used: number, max = 1000) {
  return {
    metered: true,
    used,
    max,
    planMax: max,
    addonContacts: 0,
    remaining: Math.max(0, max - used),
    exhausted: used >= max,
  };
}

function credits(planUsed: number, planMax = 10_000, packRemaining = 0) {
  const remaining = Math.max(0, planMax - planUsed) + packRemaining;
  return { metered: true, planMax, planUsed, packRemaining, remaining, exhausted: remaining <= 0 };
}

const UNMETERED = { metered: false, used: 0, exhausted: false };

function setup(
  sub: Record<string, unknown> | undefined,
  usage: { activeContacts?: unknown; campaignCredits?: unknown },
  stats: Record<string, unknown> = {},
) {
  subscriptionQuery.current = { data: sub, isPending: false };
  usageQuery.current = {
    data: {
      activeContacts: usage.activeContacts ?? contacts(0),
      campaignCredits: usage.campaignCredits ?? credits(0),
    },
    isPending: false,
  };
  statsQuery.current = { data: stats, isPending: false };
}

const PRO = { basePlan: { name: "PRO PLAN" }, features: features() };

describe("usePlanStatus", () => {
  beforeEach(() => {
    subscriptionQuery.current = { data: undefined, isPending: false };
    usageQuery.current = { data: undefined, isPending: false };
    statsQuery.current = { data: undefined, isPending: false };
  });

  test("reports nothing exhausted while usage is under every allowance", () => {
    setup(PRO, { activeContacts: contacts(10) }, { monthlySurveyResponses: 3, teamsCount: 1 });

    expect(usePlanStatus().exhausted).toEqual([]);
  });

  test("flags spent active contacts", () => {
    setup(PRO, { activeContacts: contacts(1000) });

    expect(usePlanStatus().exhausted.map((m) => m.key)).toEqual(["activeContacts"]);
  });

  test("flags spent campaign credits", () => {
    setup(PRO, { campaignCredits: credits(10_000) });

    expect(usePlanStatus().exhausted.map((m) => m.key)).toEqual(["campaignCredits"]);
  });

  test("counts pack credits before calling campaign credits spent", () => {
    // Plan credits are gone but a pack still has some, so campaigns keep sending.
    setup(PRO, { campaignCredits: credits(10_000, 10_000, 4_200) });

    const status = usePlanStatus();
    expect(status.exhausted).toEqual([]);
    expect(status.nearlySpent).toEqual([]);
  });

  test("never meters an uncapped plan, however much it uses", () => {
    // Enterprise stores a sentinel, not a ceiling; the usage endpoint reports it unmetered.
    setup(
      {
        basePlan: { name: "ENTERPRISE PLAN" },
        features: features({
          team: { count: { max: 10_000_000 }, teamMember: { count: { max: 10_000_000 } } },
          webSurvey: { count: { monthlyResponseLimit: 10_000_000 } },
        }),
      },
      { activeContacts: UNMETERED, campaignCredits: UNMETERED },
      { monthlySurveyResponses: 9_999_999, teamsCount: 9_999_999 },
    );

    const status = usePlanStatus();
    expect(status.exhausted).toEqual([]);
    expect(status.nearlySpent).toEqual([]);
  });

  test("never flags an allowance the plan does not meter", () => {
    setup(
      { basePlan: { name: "ENTERPRISE PLAN" }, features: { team: {}, whatsapp: {} } },
      { activeContacts: UNMETERED, campaignCredits: UNMETERED },
      { teamsCount: 500 },
    );

    expect(usePlanStatus().exhausted).toEqual([]);
  });

  test("does not treat a full seat or team cap as an outage", () => {
    // Free allows one team and one seat, so every free org sits at 1/1 from the moment it
    // creates its first team. Those caps never refill, so flagging them would pin an
    // undismissable banner to the dashboard for an entirely normal state.
    setup(
      { basePlan: { name: "FREE PLAN" }, features: features() },
      {},
      { teamsCount: 2, teamMembersCount: 10 },
    );

    expect(usePlanStatus().exhausted).toEqual([]);
  });

  test("still flags a refilling allowance alongside a full cap", () => {
    setup(
      { basePlan: { name: "FREE PLAN" }, features: features() },
      { activeContacts: contacts(100, 100) },
      { teamsCount: 2, teamMembersCount: 10 },
    );

    expect(usePlanStatus().exhausted.map((m) => m.key)).toEqual(["activeContacts"]);
  });

  test("says nothing is running low while there is plenty left", () => {
    setup(PRO, { activeContacts: contacts(2, 100_000) });

    const status = usePlanStatus();
    expect(status.nearlySpent).toEqual([]);
    expect(status.exhausted).toEqual([]);
  });

  test("flags an allowance once most of it is gone", () => {
    setup(PRO, { activeContacts: contacts(850), campaignCredits: credits(9_000) });

    expect(usePlanStatus().nearlySpent.map((m) => m.key)).toEqual([
      "activeContacts",
      "campaignCredits",
    ]);
  });

  test("a spent allowance is exhausted, not merely low", () => {
    // The two lists are disjoint, so the banner never has to choose between them.
    setup(PRO, { activeContacts: contacts(1000) });

    const status = usePlanStatus();
    expect(status.exhausted.map((m) => m.key)).toEqual(["activeContacts"]);
    expect(status.nearlySpent).toEqual([]);
  });

  test("recognises the free plan", () => {
    setup({ basePlan: { name: "FREE PLAN" }, features: features() }, {});

    expect(usePlanStatus().isFreePlan).toBe(true);
  });

  test("does not mistake a paid plan for the free one", () => {
    setup({ basePlan: { name: "STARTER PLAN" }, features: features() }, {});

    expect(usePlanStatus().isFreePlan).toBe(false);
  });
});
