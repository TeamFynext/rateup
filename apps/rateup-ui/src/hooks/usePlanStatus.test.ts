import { beforeEach, describe, expect, test, vi } from "vitest";

const subscriptionQuery = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));
const statsQuery = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));

vi.mock("@/backend/subscription/subscription.query", () => ({
  useSubscription: () => subscriptionQuery.current,
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
    whatsapp: { conversation: { count: { max: 1000 } } },
    ai: { count: { promptTokens: 500, completionTokens: 500 } },
    ...overrides,
  };
}

function setup(sub: Record<string, unknown> | undefined, stats: Record<string, unknown>) {
  subscriptionQuery.current = { data: sub, isPending: false };
  statsQuery.current = { data: stats, isPending: false };
}

describe("usePlanStatus", () => {
  beforeEach(() => {
    subscriptionQuery.current = { data: undefined, isPending: false };
    statsQuery.current = { data: undefined, isPending: false };
  });

  test("reports nothing exhausted while usage is under every allowance", () => {
    setup(
      { basePlan: { name: "PRO PLAN" }, features: features() },
      { monthlyMeteredConversationsCount: 10, monthlySurveyResponses: 3, teamsCount: 1 },
    );

    expect(usePlanStatus().exhausted).toEqual([]);
  });

  test("flags an allowance that has been fully spent", () => {
    setup(
      { basePlan: { name: "PRO PLAN" }, features: features() },
      { monthlyMeteredConversationsCount: 1000 },
    );

    expect(usePlanStatus().exhausted.map((m) => m.key)).toEqual(["conversations"]);
  });

  test("counts an annual allowance across the year, not the month", () => {
    // The server meters an annual plan against max × 12; reading it as a monthly cap
    // would tell a customer they are out of conversations eleven months early.
    setup(
      {
        basePlan: { name: "PRO PLAN" },
        features: features(),
        isAnnualMessageLimit: true,
      },
      { annualMeteredConversationsCount: 5000 },
    );

    expect(usePlanStatus().exhausted).toEqual([]);
  });

  test("never meters an uncapped plan, however much it uses", () => {
    // Enterprise is invoiced on actual usage, so its stored allowance is a sentinel
    // (10,000,000), not a ceiling. Measuring against it would eventually tell a
    // contracted customer they had run out — and point them at an upgrade above the
    // top of the ladder.
    setup(
      {
        basePlan: { name: "ENTERPRISE PLAN" },
        features: features({
          team: { count: { max: 10_000_000 }, teamMember: { count: { max: 10_000_000 } } },
          whatsapp: { conversation: { count: { max: 10_000_000 } } },
          webSurvey: { count: { monthlyResponseLimit: 10_000_000 } },
        }),
      },
      {
        monthlyMeteredConversationsCount: 9_999_999,
        monthlySurveyResponses: 9_999_999,
        teamsCount: 9_999_999,
      },
    );

    const status = usePlanStatus();
    expect(status.exhausted).toEqual([]);
    expect(status.nearlySpent).toEqual([]);
  });

  test("never flags an allowance the plan does not meter", () => {
    // Enterprise stores no number. Treating a missing or zero limit as "none left" would
    // put a permanent limit banner in front of every contracted customer.
    setup(
      { basePlan: { name: "ENTERPRISE PLAN" }, features: { team: {}, whatsapp: {}, ai: {} } },
      { monthlyMeteredConversationsCount: 999_999, teamsCount: 500 },
    );

    expect(usePlanStatus().exhausted).toEqual([]);
  });

  test("does not treat a full seat or team cap as an outage", () => {
    // Free allows one team and one seat, so every free org sits at 1/1 from the moment it
    // creates its first team. Those caps never refill, so flagging them would pin an
    // undismissable "you have used all your teams for this billing period" to the top of
    // the dashboard forever — for a state that is entirely normal.
    setup(
      { basePlan: { name: "FREE PLAN" }, features: features() },
      { teamsCount: 2, teamMembersCount: 10 },
    );

    expect(usePlanStatus().exhausted).toEqual([]);
  });

  test("still flags a refilling allowance alongside a full cap", () => {
    setup(
      { basePlan: { name: "FREE PLAN" }, features: features() },
      { teamsCount: 2, teamMembersCount: 10, monthlyMeteredConversationsCount: 1000 },
    );

    expect(usePlanStatus().exhausted.map((m) => m.key)).toEqual(["conversations"]);
  });

  test("says nothing is running low while there is plenty left", () => {
    // 2 of 100,000 is not "running short". An upsell shown at that point is an advert,
    // and it teaches people to ignore the banner before it ever matters.
    setup(
      {
        basePlan: { name: "PRO PLAN" },
        features: features({ whatsapp: { conversation: { count: { max: 100_000 } } } }),
      },
      { monthlyMeteredConversationsCount: 2 },
    );

    const status = usePlanStatus();
    expect(status.nearlySpent).toEqual([]);
    expect(status.exhausted).toEqual([]);
  });

  test("flags an allowance once most of it is gone", () => {
    setup(
      { basePlan: { name: "PRO PLAN" }, features: features() },
      { monthlyMeteredConversationsCount: 850 },
    );

    expect(usePlanStatus().nearlySpent.map((m) => m.key)).toEqual(["conversations"]);
  });

  test("a spent allowance is exhausted, not merely low", () => {
    // The two lists are disjoint, so the banner never has to choose between them.
    setup(
      { basePlan: { name: "PRO PLAN" }, features: features() },
      { monthlyMeteredConversationsCount: 1000 },
    );

    const status = usePlanStatus();
    expect(status.exhausted.map((m) => m.key)).toEqual(["conversations"]);
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

  test("sums AI prompt and completion tokens against the combined allowance", () => {
    setup(
      { basePlan: { name: "PRO PLAN" }, features: features() },
      { aiPromptTokensCount: 600, aiCompletionTokensCount: 400 },
    );

    expect(usePlanStatus().exhausted.map((m) => m.key)).toEqual(["ai"]);
  });
});
