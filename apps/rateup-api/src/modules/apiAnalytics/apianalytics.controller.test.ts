import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("./apianalytics.service.js", async () => {
  // `resolveTrendGranularity` is pure, so it runs for real.
  const actual = await vi.importActual<typeof import("./apianalytics.service.js")>(
    "./apianalytics.service.js",
  );
  return {
    resolveTrendGranularity: actual.resolveTrendGranularity,
    getDeliveredFailedTrend: vi.fn(),
    getTeamPerformanceStats: vi.fn(),
    getTemplateCategoryOverview: vi.fn(),
    getTemplatePerformanceStats: vi.fn(),
    getWaMessageOverview: vi.fn(),
  };
});
// The cache sits between the handlers and the service. Here it is a straight
// pass-through, so these tests keep describing the handlers; the cache itself is
// covered in src/utils/cache.test.ts.
vi.mock("../../utils/cache.js", () => ({
  withCache: vi.fn((_key: string, _ttl: number, load: () => Promise<unknown>) => load()),
  cacheKeyFor: vi.fn(() => "test-key"),
}));
vi.mock("../../utils/logger.js", () => ({
  log: { error: vi.fn(), fatal: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}));

import {
  getDeliveredFailedTrend,
  getTeamPerformanceStats,
  getTemplateCategoryOverview,
  getTemplatePerformanceStats,
  getWaMessageOverview,
} from "./apianalytics.service.js";
import {
  getApiAnalyticsHandler,
  getDeliveredFailedTrendHandler,
  getTeamPerformanceStatsHandler,
  getTemplateCategoryHandler,
} from "./apianalytics.controller.js";

type Mock = ReturnType<typeof vi.fn>;

const m = {
  overview: getWaMessageOverview as unknown as Mock,
  trend: getDeliveredFailedTrend as unknown as Mock,
  categoryOverview: getTemplateCategoryOverview as unknown as Mock,
  templatePerformance: getTemplatePerformanceStats as unknown as Mock,
  teamPerformance: getTeamPerformanceStats as unknown as Mock,
};

const ORG = "org-1";

const DAY_POINT = {
  time: "2026-03-01T00:00:00.000Z",
  totalMessages: 10,
  deliveredMessages: 8,
  failedMessages: 2,
};

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
  m.trend.mockResolvedValue([DAY_POINT]);
  m.categoryOverview.mockResolvedValue({ totalTemplates: 3, byCategory: [] });
  m.templatePerformance.mockResolvedValue([{ templateName: "order_update" }]);
  m.teamPerformance.mockResolvedValue([{ teamId: "team-1" }]);
});

describe("getApiAnalyticsHandler", () => {
  test("returns the overview for the caller's org", async () => {
    const rep = reply();

    await getApiAnalyticsHandler(request({ teamId: "team-1" }), rep);

    expect(m.overview).toHaveBeenCalledWith(ORG, "team-1", undefined, "all");
    expect(sent(rep)).toEqual({ totalMessages: 10 });
  });

  test("splits a comma-separated date range into its two ends", async () => {
    await getApiAnalyticsHandler(
      request({ dateRange: "2026-03-01,2026-03-07", teamId: "team-1" }),
      reply(),
    );

    expect(m.overview.mock.calls[0][2]).toEqual(["2026-03-01", "2026-03-07"]);
  });

  test("passes no range at all when the caller named none", async () => {
    await getApiAnalyticsHandler(request(), reply());

    expect(m.overview.mock.calls[0][2]).toBeUndefined();
  });

  test("passes no range when the caller named only one end", async () => {
    await getApiAnalyticsHandler(request({ dateRange: "2026-03-01" }), reply());

    expect(m.overview.mock.calls[0][2]).toBeUndefined();
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

  test("gives any member the whole org's numbers when they ask for all teams", async () => {
    await getApiAnalyticsHandler(
      request({ teamId: "all", user: { orgId: ORG, role: "AGENT" } }),
      reply(),
    );

    expect(m.overview.mock.calls[0][1]).toBe("all");
  });

  test("cannot read another org's team by naming its id", async () => {
    await getApiAnalyticsHandler(request({ teamId: "another-orgs-team" }), reply());

    expect(m.overview.mock.calls[0][0]).toBe(ORG);
    expect(m.overview.mock.calls[0][1]).toBe("another-orgs-team");
  });
});

describe("getDeliveredFailedTrendHandler", () => {
  test("returns the trend and says how it is bucketed", async () => {
    const rep = reply();

    await getDeliveredFailedTrendHandler(request(), rep);

    expect(sent(rep)).toEqual({ trend: [DAY_POINT], granularity: "day" });
  });

  test("reads the rows once", async () => {
    await getDeliveredFailedTrendHandler(request({ granularity: "hour" }), reply());

    expect(m.trend).toHaveBeenCalledTimes(1);
  });

  test("looks at every team unless one is named", async () => {
    await getDeliveredFailedTrendHandler(request(), reply());

    expect(m.trend.mock.calls[0][1]).toBe("all");
  });

  test("buckets by whatever the caller asked for", async () => {
    await getDeliveredFailedTrendHandler(request({ granularity: "day" }), reply());
    expect(m.trend.mock.calls[0][2]).toBe("day");

    await getDeliveredFailedTrendHandler(request({ granularity: "hour" }), reply());
    expect(m.trend.mock.calls[1][2]).toBe("hour");
  });

  test("picks days for a long range when the caller names no bucket", async () => {
    await getDeliveredFailedTrendHandler(
      request({ dateRange: "2026-03-01T00:00:00Z,2026-03-31T00:00:00Z" }),
      reply(),
    );

    expect(m.trend.mock.calls[0][2]).toBe("day");
  });

  test("picks hours for a range of two days or less when the caller names no bucket", async () => {
    await getDeliveredFailedTrendHandler(
      request({ dateRange: "2026-03-01T00:00:00Z,2026-03-02T00:00:00Z" }),
      reply(),
    );

    expect(m.trend.mock.calls[0][2]).toBe("hour");
  });

  test("picks days for the default seven-day window", async () => {
    await getDeliveredFailedTrendHandler(request(), reply());

    expect(m.trend.mock.calls[0][2]).toBe("day");
  });

  test("treats an unrecognised granularity as a day", async () => {
    await getDeliveredFailedTrendHandler(request({ granularity: "week" }), reply());

    expect(m.trend.mock.calls[0][2]).toBe("day");
  });

  test("passes no range at all when the caller named fewer than two ends", async () => {
    await getDeliveredFailedTrendHandler(request({ dateRange: "2026-03-01" }), reply());

    expect(m.trend.mock.calls[0][3]).toBeUndefined();
  });

  test("passes the range it was given", async () => {
    await getDeliveredFailedTrendHandler(request({ dateRange: "2026-03-01,2026-03-07" }), reply());

    expect(m.trend.mock.calls[0][3]).toEqual(["2026-03-01", "2026-03-07"]);
  });

  test("answers 500 when the trend fails", async () => {
    m.trend.mockRejectedValue(new Error("db down"));
    const rep = reply();

    await getDeliveredFailedTrendHandler(request(), rep);

    expect(rep.status).toHaveBeenCalledWith(500);
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

    expect(m.teamPerformance).toHaveBeenCalledWith(ORG, undefined, "all");
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

  test("reports on every team regardless of who is asking", async () => {
    await getTeamPerformanceStatsHandler(
      request({ teamId: "team-1", user: { orgId: ORG, role: "AGENT" } }),
      reply(),
    );

    expect(m.teamPerformance.mock.calls[0]).toHaveLength(3);
    expect(m.teamPerformance.mock.calls[0]).not.toContain("team-1");
  });
});
