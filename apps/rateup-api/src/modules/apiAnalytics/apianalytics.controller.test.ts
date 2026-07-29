import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("./apianalytics.service.js", () => ({
  getDeliveredFailedTrend: vi.fn(),
  getDeliveredFailedWeekTrend: vi.fn(),
  getTeamPerformanceStats: vi.fn(),
  getTemplateCategoryOverview: vi.fn(),
  getTemplatePerformanceStats: vi.fn(),
  getWaMessageOverviewByTeamAndOrg: vi.fn(),
}));
vi.mock("../../utils/logger.js", () => ({
  log: { error: vi.fn(), fatal: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}));

import {
  getDeliveredFailedTrend,
  getDeliveredFailedWeekTrend,
  getTeamPerformanceStats,
  getTemplateCategoryOverview,
  getTemplatePerformanceStats,
  getWaMessageOverviewByTeamAndOrg,
} from "./apianalytics.service.js";
import {
  getApiAnalyticsHandler,
  getDeliveredFailedTrendHandler,
  getTeamPerformanceStatsHandler,
  getTemplateCategoryHandler,
} from "./apianalytics.controller.js";

type Mock = ReturnType<typeof vi.fn>;

const m = {
  overview: getWaMessageOverviewByTeamAndOrg as unknown as Mock,
  trend: getDeliveredFailedTrend as unknown as Mock,
  weekTrend: getDeliveredFailedWeekTrend as unknown as Mock,
  categoryOverview: getTemplateCategoryOverview as unknown as Mock,
  templatePerformance: getTemplatePerformanceStats as unknown as Mock,
  teamPerformance: getTeamPerformanceStats as unknown as Mock,
};

const ORG = "org-1";

function request(query: Record<string, unknown> = {}): any {
  return { user: { orgId: ORG, userId: "user-1", role: "ADMIN" }, userId: "user-1", query };
}

function reply() {
  const rep: any = { code: vi.fn(() => rep), status: vi.fn(() => rep), send: vi.fn(() => rep) };
  return rep;
}

function sent(rep: any, index = 0) {
  return rep.send.mock.calls[index][0];
}

beforeEach(() => {
  vi.clearAllMocks();
  m.overview.mockResolvedValue({ totalMessages: 10 });
  m.trend.mockResolvedValue([{ time: "2026-03-01T00:00:00.000Z" }]);
  m.weekTrend.mockResolvedValue([{ time: "2026-03-02T00:00:00.000Z" }]);
  m.categoryOverview.mockResolvedValue({ totalTemplates: 3, byCategory: [] });
  m.templatePerformance.mockResolvedValue([{ templateName: "order_update" }]);
  m.teamPerformance.mockResolvedValue([{ teamId: "team-1" }]);
});

describe("getApiAnalyticsHandler", () => {
  test("returns the overview for the caller's org", async () => {
    const rep = reply();

    await getApiAnalyticsHandler(request({ teamId: "team-1" }), rep);

    expect(m.overview).toHaveBeenCalledWith("team-1", ORG, [], "all");
    expect(sent(rep)).toEqual({ totalMessages: 10 });
  });

  test("splits a comma-separated date range into its two ends", async () => {
    await getApiAnalyticsHandler(
      request({ dateRange: "2026-03-01,2026-03-07", teamId: "team-1" }),
      reply(),
    );

    expect(m.overview.mock.calls[0][2]).toEqual(["2026-03-01", "2026-03-07"]);
  });

  test("passes an empty range when the caller named none", async () => {
    await getApiAnalyticsHandler(request(), reply());

    expect(m.overview.mock.calls[0][2]).toEqual([]);
  });

  test("counts both API sources unless told otherwise", async () => {
    await getApiAnalyticsHandler(request(), reply());

    expect(m.overview.mock.calls[0][3]).toBe("all");
  });

  test("carries the API source the caller asked for", async () => {
    await getApiAnalyticsHandler(request({ apiType: "external" }), reply());

    expect(m.overview.mock.calls[0][3]).toBe("external");
  });

  test("answers 500 when the overview cannot be built", async () => {
    m.overview.mockRejectedValue(new Error("db down"));
    const rep = reply();

    await getApiAnalyticsHandler(request(), rep);

    expect(rep.status).toHaveBeenCalledWith(500);
    expect(sent(rep)).toEqual({
      error: "An error occurred while fetching the api analytics.",
    });
  });

  // NOTE: pins current behaviour. The two halves of dateRange are split on a comma
  // and passed on verbatim; nothing checks they parse. The service then hands
  // `new Date("last tuesday")` — an Invalid Date — straight to Prisma, which fails
  // at query time, so a typo in a query string surfaces as a 500 rather than a 400.
  // The querystring schema types dateRange as a plain optional string.
  // See issues.txt 15.7.
  test("passes a date range that is not a date through unchecked", async () => {
    await getApiAnalyticsHandler(request({ dateRange: "not-a-date,also-not" }), reply());

    expect(m.overview.mock.calls[0][2]).toEqual(["not-a-date", "also-not"]);
  });

  // NOTE: pins current behaviour. teamId is a filter the caller chooses, not a
  // boundary the server enforces — nothing consults the caller's team memberships
  // or channel scope. So a user restricted to one team can ask for "all" and read
  // the whole org's message volumes, delivery rates and per-team breakdown. Compare
  // getAccessibleWaSettings, which narrows the channel list by team for exactly
  // this reason. See issues.txt 15.7.
  test("gives any member the whole org's numbers when they ask for all teams", async () => {
    await getApiAnalyticsHandler(
      request({ teamId: "all", user: { orgId: ORG, role: "AGENT" } }),
      reply(),
    );

    expect(m.overview.mock.calls[0][0]).toBe("all");
  });

  // NOTE: same gap from the other direction — a team id is taken from the query
  // with no check that it belongs to the caller's org. Harmless in practice because
  // every query also filters on orgId, so a foreign team id simply matches nothing.
  // See issues.txt 15.7.
  test("passes a team id through without checking it belongs to the org", async () => {
    await getApiAnalyticsHandler(request({ teamId: "another-orgs-team" }), reply());

    expect(m.overview.mock.calls[0][0]).toBe("another-orgs-team");
    expect(m.overview.mock.calls[0][1]).toBe(ORG);
  });
});

describe("getDeliveredFailedTrendHandler", () => {
  test("returns both trends together", async () => {
    const rep = reply();

    await getDeliveredFailedTrendHandler(request(), rep);

    expect(sent(rep)).toEqual({
      trend: [{ time: "2026-03-01T00:00:00.000Z" }],
      weekTrend: [{ time: "2026-03-02T00:00:00.000Z" }],
    });
  });

  test("looks at every team unless one is named", async () => {
    await getDeliveredFailedTrendHandler(request(), reply());

    expect(m.trend.mock.calls[0][1]).toBe("all");
    expect(m.weekTrend.mock.calls[0][1]).toBe("all");
  });

  test("buckets by day unless the hour was asked for", async () => {
    await getDeliveredFailedTrendHandler(request(), reply());
    expect(m.trend.mock.calls[0][2]).toBe("day");

    await getDeliveredFailedTrendHandler(request({ granularity: "hour" }), reply());
    expect(m.trend.mock.calls[1][2]).toBe("hour");
  });

  test("treats an unrecognised granularity as a day", async () => {
    await getDeliveredFailedTrendHandler(request({ granularity: "week" }), reply());

    expect(m.trend.mock.calls[0][2]).toBe("day");
  });

  test("passes no range at all when the caller named fewer than two ends", async () => {
    await getDeliveredFailedTrendHandler(request({ dateRange: "2026-03-01" }), reply());

    expect(m.trend.mock.calls[0][3]).toBeUndefined();
  });

  test("gives both trends the same range", async () => {
    await getDeliveredFailedTrendHandler(request({ dateRange: "2026-03-01,2026-03-07" }), reply());

    expect(m.trend.mock.calls[0][3]).toEqual(["2026-03-01", "2026-03-07"]);
    // weekTrend has no granularity parameter, so its range sits one slot earlier.
    expect(m.weekTrend.mock.calls[0][2]).toEqual(["2026-03-01", "2026-03-07"]);
  });

  test("answers 500 when either trend fails", async () => {
    m.weekTrend.mockRejectedValue(new Error("db down"));
    const rep = reply();

    await getDeliveredFailedTrendHandler(request(), rep);

    expect(rep.status).toHaveBeenCalledWith(500);
  });

  // NOTE: pins current behaviour, and it is the visible half of issues.txt 15.1.
  // Both trends are built from one request with one range, but only
  // getDeliveredFailedWeekTrend defaults to the last seven days when the range is
  // absent — getDeliveredFailedTrend falls back to the whole of history. So the
  // response carries two series over two different windows under one roof.
  test("hands the same absent range to two services that default it differently", async () => {
    await getDeliveredFailedTrendHandler(request(), reply());

    expect(m.trend.mock.calls[0][3]).toBeUndefined();
    expect(m.weekTrend.mock.calls[0][2]).toBeUndefined();
  });
});

describe("getTemplateCategoryHandler", () => {
  test("returns the category breakdown alongside the per-template table", async () => {
    const rep = reply();

    await getTemplateCategoryHandler(request(), rep);

    expect(sent(rep)).toEqual({
      categoryOverview: { totalTemplates: 3, byCategory: [] },
      templatePerformance: [{ templateName: "order_update" }],
    });
  });

  test("looks at every team unless one is named", async () => {
    await getTemplateCategoryHandler(request(), reply());

    expect(m.categoryOverview.mock.calls[0][1]).toBe("all");
  });

  test("narrows both panels to the team the caller named", async () => {
    await getTemplateCategoryHandler(request({ teamId: "team-1" }), reply());

    expect(m.categoryOverview.mock.calls[0][1]).toBe("team-1");
    expect(m.templatePerformance.mock.calls[0][1]).toBe("team-1");
  });

  test("answers 500 when either panel fails", async () => {
    m.templatePerformance.mockRejectedValue(new Error("db down"));
    const rep = reply();

    await getTemplateCategoryHandler(request(), rep);

    expect(rep.status).toHaveBeenCalledWith(500);
    expect(sent(rep)).toEqual({
      error: "An error occurred while fetching the template analytics.",
    });
  });
});

describe("getTeamPerformanceStatsHandler", () => {
  test("returns the per-team breakdown for the caller's org", async () => {
    const rep = reply();

    await getTeamPerformanceStatsHandler(request(), rep);

    expect(m.teamPerformance).toHaveBeenCalledWith(ORG, [], "all");
    expect(sent(rep)).toEqual([{ teamId: "team-1" }]);
  });

  test("carries the range and API source the caller asked for", async () => {
    await getTeamPerformanceStatsHandler(
      request({ dateRange: "2026-03-01,2026-03-07", apiType: "whatsapp" }),
      reply(),
    );

    expect(m.teamPerformance).toHaveBeenCalledWith(ORG, ["2026-03-01", "2026-03-07"], "whatsapp");
  });

  test("answers 500 when the breakdown cannot be built", async () => {
    m.teamPerformance.mockRejectedValue(new Error("db down"));
    const rep = reply();

    await getTeamPerformanceStatsHandler(request(), rep);

    expect(rep.status).toHaveBeenCalledWith(500);
  });

  // NOTE: this endpoint takes no teamId at all — it always reports on every team in
  // the org. Combined with the absence of any team-scope check (see 15.7), a member
  // of one team reads every other team's send volume and success rate.
  test("reports on every team regardless of who is asking", async () => {
    await getTeamPerformanceStatsHandler(
      request({ teamId: "team-1", user: { orgId: ORG, role: "AGENT" } }),
      reply(),
    );

    expect(m.teamPerformance.mock.calls[0]).toHaveLength(3);
    expect(m.teamPerformance.mock.calls[0]).not.toContain("team-1");
  });
});
