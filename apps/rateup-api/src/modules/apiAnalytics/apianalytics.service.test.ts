import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../utils/prisma.js", () => ({
  default: { $queryRaw: vi.fn() },
  excludeFields: vi.fn(),
}));
// Prisma.sql is a tagged template that builds a SQL fragment. Standing in for it
// with something inspectable lets the tests see which filters were spliced in.
vi.mock("../../../generated/prisma/client.js", () => ({
  Prisma: {
    sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({
      __fragment: strings.join("?"),
      values,
    }),
  },
}));

import prisma from "../../utils/prisma.js";
import { WaTemplateCategory } from "../../types/enums.js";
import {
  getDeliveredFailedTrend,
  getDeliveredFailedWeekTrend,
  getTeamPerformanceStats,
  getTemplateCategoryOverview,
  getTemplatePerformanceStats,
  getWaMessageOverview,
} from "./apianalytics.service.js";

type Mock = ReturnType<typeof vi.fn>;

const queryRawMock = (prisma as unknown as { $queryRaw: Mock }).$queryRaw;

const ORG = "org-1";
const TEAM = "team-1";

/**
 * Reconstructs one $queryRaw call: the SQL text with fragments spliced back in,
 * and the ordinary bound values in order.
 */
function queryAt(index = 0) {
  const [strings, ...values] = queryRawMock.mock.calls[index];
  let sql = "";
  const bound: unknown[] = [];
  (strings as string[]).forEach((chunk, i) => {
    sql += chunk;
    const value: any = values[i];
    if (value && typeof value === "object" && "__fragment" in value) {
      sql += value.__fragment;
      bound.push(...value.values);
    } else if (i < values.length) {
      sql += "?";
      bound.push(value);
    }
  });
  return { sql, bound };
}

/** Every reconstructed query, in call order. */
function allQueries() {
  return queryRawMock.mock.calls.map((_, i) => queryAt(i));
}

const OVERVIEW_ROW = {
  total_messages: 200,
  delivered_messages: 150,
  failed_messages: 50,
  avg_delivery_time_seconds: 4,
};

beforeEach(() => {
  vi.clearAllMocks();
  queryRawMock.mockResolvedValue([]);
});

describe("getWaMessageOverview - the numbers it reports", () => {
  test("reports delivered and failed as percentages of the total", async () => {
    queryRawMock.mockResolvedValue([OVERVIEW_ROW]);

    const result = await getWaMessageOverview(ORG, TEAM, null, "all");

    expect(result).toMatchObject({
      totalMessages: 200,
      deliveredMessages: 150,
      deliveredPercentage: 75,
      failedMessages: 50,
      failedPercentage: 25,
      avgDeliveryTimeSeconds: 4,
    });
  });

  test("rounds a recurring percentage to two decimal places", async () => {
    queryRawMock.mockResolvedValue([
      { ...OVERVIEW_ROW, total_messages: 3, delivered_messages: 1, failed_messages: 0 },
    ]);

    const result = await getWaMessageOverview(ORG, TEAM, null, "all");

    expect(result.deliveredPercentage).toBe(33.33);
  });

  test("reports zero percentages rather than dividing by nothing", async () => {
    queryRawMock.mockResolvedValue([
      {
        total_messages: 0,
        delivered_messages: 0,
        failed_messages: 0,
        avg_delivery_time_seconds: null,
      },
    ]);

    const result = await getWaMessageOverview(ORG, TEAM, null, "all");

    expect(result.deliveredPercentage).toBe(0);
    expect(result.failedPercentage).toBe(0);
    expect(result.avgDeliveryTimeSeconds).toBeNull();
  });

  test("copes with a query that returns no row at all", async () => {
    queryRawMock.mockResolvedValue([]);

    await expect(getWaMessageOverview(ORG, TEAM, null, "all")).resolves.toMatchObject({
      totalMessages: 0,
      totalMessagesChange: 0,
    });
  });

  test("reports the change against the previous period", async () => {
    queryRawMock
      .mockResolvedValueOnce([{ ...OVERVIEW_ROW, total_messages: 150 }])
      .mockResolvedValueOnce([{ ...OVERVIEW_ROW, total_messages: 100 }]);

    const result = await getWaMessageOverview(ORG, TEAM, null, "all");

    expect(result.totalMessagesChange).toBe(50);
  });

  test("calls a first period with nothing before it a hundred percent up", async () => {
    queryRawMock
      .mockResolvedValueOnce([{ ...OVERVIEW_ROW, total_messages: 40 }])
      .mockResolvedValueOnce([{ ...OVERVIEW_ROW, total_messages: 0 }]);

    const result = await getWaMessageOverview(ORG, TEAM, null, "all");

    expect(result.totalMessagesChange).toBe(100);
  });

  test("reports no change when both periods were empty", async () => {
    queryRawMock.mockResolvedValue([
      {
        total_messages: 0,
        delivered_messages: 0,
        failed_messages: 0,
        avg_delivery_time_seconds: null,
      },
    ]);

    const result = await getWaMessageOverview(ORG, TEAM, null, "all");

    expect(result.totalMessagesChange).toBe(0);
  });

  // Fixed as part of the strict-mode migration (was issues.txt 15.5): percentChange
  // used a `curr!` non-null assertion, so a null current value fell through to
  // `(null - prev) / prev` — JS coerces `null` to `0`, reporting a period with no
  // deliveries as a 100% *improvement* instead of "no data". percentChange now
  // returns null for a null current value, matching avgDeliveryTimeChange's
  // nullable type.
  test("reports a period with no deliveries as having no change to report", async () => {
    queryRawMock
      .mockResolvedValueOnce([{ ...OVERVIEW_ROW, avg_delivery_time_seconds: null }])
      .mockResolvedValueOnce([{ ...OVERVIEW_ROW, avg_delivery_time_seconds: 8 }]);

    const result = await getWaMessageOverview(ORG, TEAM, null, "all");

    expect(result.avgDeliveryTimeSeconds).toBeNull();
    expect(result.avgDeliveryTimeChange).toBeNull();
  });

  // The average used to be passed through exactly as Postgres returned it, while
  // getTemplatePerformanceStats rounded the same figure to two decimals — so the
  // overview card and the per-template table disagreed on how precise a delivery
  // time is. Both round through one helper now. See issues.txt 15.6.
  test("rounds the average delivery time the same way the template table does", async () => {
    queryRawMock.mockResolvedValue([{ ...OVERVIEW_ROW, avg_delivery_time_seconds: 4.123456789 }]);

    const result = await getWaMessageOverview(ORG, TEAM, null, "all");

    expect(result.avgDeliveryTimeSeconds).toBe(4.12);
  });
});

describe("getWaMessageOverview - the window it looks at", () => {
  test("defaults to the last seven days when given no range", async () => {
    await getWaMessageOverview(ORG, TEAM, null, "all");

    const { bound } = queryAt(0);
    const [start, end] = bound.slice(-2) as Date[];
    const days = (end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000);
    expect(Math.round(days)).toBe(6);
  });

  test("uses the range it was given", async () => {
    await getWaMessageOverview(ORG, TEAM, ["2026-03-01T00:00:00Z", "2026-03-08T00:00:00Z"], "all");

    const { bound } = queryAt(0);
    const [start, end] = bound.slice(-2) as Date[];
    expect(start.toISOString()).toBe("2026-03-01T00:00:00.000Z");
    expect(end.toISOString()).toBe("2026-03-08T00:00:00.000Z");
  });

  test("compares against the window of equal length immediately before it", async () => {
    await getWaMessageOverview(ORG, TEAM, ["2026-03-08T00:00:00Z", "2026-03-15T00:00:00Z"], "all");

    const [prevStart, prevEnd] = queryAt(1).bound.slice(-2) as Date[];
    expect(prevEnd.toISOString()).toBe("2026-03-07T23:59:59.999Z");
    expect(prevStart.toISOString()).toBe("2026-02-28T23:59:59.999Z");
  });

  // A calendar date with no time parses as UTC midnight, so a range the user picked
  // as "the 1st to the 7th" used to end the instant the 7th began — every message
  // sent on the last day of their own selection was left out of every panel, and a
  // single-day selection returned nothing at all. See issues.txt 15.3.
  test("covers the whole of the last day of a date-only range", async () => {
    await getWaMessageOverview(ORG, TEAM, ["2026-03-01", "2026-03-07"], "all");

    const [start, end] = queryAt(0).bound.slice(-2) as Date[];
    expect(start.toISOString()).toBe("2026-03-01T00:00:00.000Z");
    expect(end.toISOString()).toBe("2026-03-07T23:59:59.999Z");
  });

  test("leaves a range that carries a time exactly as it was given", async () => {
    await getWaMessageOverview(ORG, TEAM, ["2026-03-01T06:00:00Z", "2026-03-07T09:30:00Z"], "all");

    const [start, end] = queryAt(0).bound.slice(-2) as Date[];
    expect(start.toISOString()).toBe("2026-03-01T06:00:00.000Z");
    expect(end.toISOString()).toBe("2026-03-07T09:30:00.000Z");
  });

  // The querystring schema refuses this with a 400 before it reaches the service;
  // the fallback is what keeps an Invalid Date from reaching Postgres if anything
  // ever calls in past the schema. See issues.txt 15.7.
  test("falls back to the default window for a range that does not parse", async () => {
    await getWaMessageOverview(ORG, TEAM, ["not-a-date", "also-not"], "all");

    const [start, end] = queryAt(0).bound.slice(-2) as Date[];
    expect(Number.isNaN(start.getTime())).toBe(false);
    expect(Number.isNaN(end.getTime())).toBe(false);
  });
});

describe("the filters every panel builds", () => {
  test("always scopes the query to the caller's org", async () => {
    await getWaMessageOverview(ORG, TEAM, null, "all");

    for (const { sql, bound } of allQueries()) {
      expect(sql).toContain('motm."orgId" =');
      expect(bound).toContain(ORG);
    }
  });

  test("narrows to one team when a real team is named", async () => {
    await getWaMessageOverview(ORG, TEAM, null, "all");

    const { sql, bound } = queryAt(0);
    expect(sql).toContain('motm."teamId" =');
    expect(bound).toContain(TEAM);
  });

  test.each(["all", "null", "", undefined, null])(
    "leaves every team in when the team is %s",
    async (teamId) => {
      await getWaMessageOverview(ORG, teamId as any, null, "all");

      expect(queryAt(0).sql).not.toContain('motm."teamId" =');
    },
  );

  test("narrows to the external API when asked", async () => {
    await getWaMessageOverview(ORG, TEAM, null, "external");

    expect(queryAt(0).sql).toContain('motm."externalApi" = true');
  });

  test("narrows to the dashboard's own sends when asked", async () => {
    await getWaMessageOverview(ORG, TEAM, null, "whatsapp");

    expect(queryAt(0).sql).toContain('motm."externalApi" = false');
  });

  test.each(["all", "", undefined, "something-else"])(
    "counts both sources when the api type is %s",
    async (apiType) => {
      await getWaMessageOverview(ORG, TEAM, null, apiType);

      expect(queryAt(0).sql).not.toContain('motm."externalApi"');
    },
  );
});

describe("getDeliveredFailedTrend", () => {
  const ROW = {
    time_bucket: new Date("2026-03-01T00:00:00Z"),
    total_messages: 10,
    delivered_messages: 8,
    failed_messages: 2,
  };

  test("returns one point per bucket, timed in ISO", async () => {
    queryRawMock.mockResolvedValue([ROW]);

    await expect(getDeliveredFailedTrend(ORG, TEAM, "day", null, "all")).resolves.toEqual([
      {
        time: "2026-03-01T00:00:00.000Z",
        totalMessages: 10,
        deliveredMessages: 8,
        failedMessages: 2,
      },
    ]);
  });

  test("buckets by day by default", async () => {
    await getDeliveredFailedTrend(ORG, TEAM, "day", null, "all");

    expect(queryAt(0).sql).toContain("DATE_TRUNC('day'");
  });

  test("buckets by hour when asked", async () => {
    await getDeliveredFailedTrend(ORG, TEAM, "hour", null, "all");

    expect(queryAt(0).sql).toContain("DATE_TRUNC('hour'");
  });

  test("returns nothing for a period with no messages", async () => {
    await expect(getDeliveredFailedTrend(ORG, TEAM, "day", null, "all")).resolves.toEqual([]);
  });

  // The one the dashboard showed. This function used to leave an absent range null
  // for the SQL to coalesce to 1970, while getWaMessageOverview and
  // getDeliveredFailedWeekTrend both defaulted to the last seven days — so the
  // trend chart covered all history while the summary card beside it covered a
  // week, both filled from one request with one query string. Every panel resolves
  // its window through resolveDateRange now. See issues.txt 15.1.
  test("defaults to the same seven days every other panel does", async () => {
    await getDeliveredFailedTrend(ORG, TEAM, "day", null, "all");

    const { sql, bound } = queryAt(0);
    expect(sql).not.toContain("'1970-01-01'::timestamptz");
    const dates = bound.filter((v): v is Date => v instanceof Date);
    const days = (dates[1].getTime() - dates[0].getTime()) / (24 * 60 * 60 * 1000);
    expect(Math.round(days)).toBe(6);
  });

  test("uses the range it was given", async () => {
    await getDeliveredFailedTrend(
      ORG,
      TEAM,
      "day",
      ["2026-03-01T00:00:00Z", "2026-03-08T00:00:00Z"],
      "all",
    );

    const dates = queryAt(0).bound.filter((v): v is Date => v instanceof Date);
    expect(dates[0].toISOString()).toBe("2026-03-01T00:00:00.000Z");
  });
});

describe("getDeliveredFailedWeekTrend", () => {
  test("returns one point per day, timed in ISO", async () => {
    queryRawMock.mockResolvedValue([
      {
        day: new Date("2026-03-01T00:00:00Z"),
        total_messages: 4,
        delivered_messages: 3,
        failed_messages: 1,
      },
    ]);

    await expect(getDeliveredFailedWeekTrend(ORG, TEAM, null, "all")).resolves.toEqual([
      {
        time: "2026-03-01T00:00:00.000Z",
        totalMessages: 4,
        deliveredMessages: 3,
        failedMessages: 1,
      },
    ]);
  });

  test("defaults to the last seven days, unlike the trend beside it", async () => {
    await getDeliveredFailedWeekTrend(ORG, TEAM, null, "all");

    const dates = queryAt(0).bound.filter((v): v is Date => v instanceof Date);
    const days = (dates[1].getTime() - dates[0].getTime()) / (24 * 60 * 60 * 1000);
    expect(Math.round(days)).toBe(6);
  });
});

describe("getTemplateCategoryOverview", () => {
  test("reports every category the enum knows, even the unused ones", async () => {
    queryRawMock.mockResolvedValue([{ category: WaTemplateCategory.MARKETING, count: 10 }]);

    const result = await getTemplateCategoryOverview(ORG, "all", null, "all");

    expect(result.byCategory.map((c) => c.category)).toEqual(Object.values(WaTemplateCategory));
    expect(result.byCategory.find((c) => c.category === WaTemplateCategory.UTILITY)).toEqual({
      category: WaTemplateCategory.UTILITY,
      count: 0,
      percentage: 0,
    });
  });

  test("reports each category's share of the total", async () => {
    queryRawMock.mockResolvedValue([
      { category: WaTemplateCategory.MARKETING, count: 30 },
      { category: WaTemplateCategory.UTILITY, count: 10 },
    ]);

    const result = await getTemplateCategoryOverview(ORG, "all", null, "all");

    expect(result.totalTemplates).toBe(40);
    expect(result.byCategory.find((c) => c.category === WaTemplateCategory.MARKETING)).toEqual({
      category: WaTemplateCategory.MARKETING,
      count: 30,
      percentage: 75,
    });
  });

  test("reports zero shares for an org that has sent no templates", async () => {
    const result = await getTemplateCategoryOverview(ORG, "all", null, "all");

    expect(result.totalTemplates).toBe(0);
    expect(result.byCategory.every((c) => c.percentage === 0)).toBe(true);
  });

  test("counts only template and campaign sends", async () => {
    await getTemplateCategoryOverview(ORG, "all", null, "all");

    expect(queryAt(0).sql).toContain("'TEMPLATE', 'CAMPAIGN'");
  });

  // The reply used to be built by walking OUR enum and looking each name up in the
  // query result, so a category Meta returns that the enum does not carry was
  // dropped — from the breakdown, and from totalTemplates, which was recomputed
  // from the filtered list rather than taken from the query. A pie chart of those
  // numbers added to 100% while under-reporting what was actually sent. Meta has
  // added template categories before. See issues.txt 15.4(a).
  test("keeps a category the enum does not list, and counts it in the total", async () => {
    queryRawMock.mockResolvedValue([
      { category: WaTemplateCategory.MARKETING, count: 30 },
      { category: "SERVICE", count: 70 },
    ]);

    const result = await getTemplateCategoryOverview(ORG, "all", null, "all");

    expect(result.totalTemplates).toBe(100);
    expect(result.byCategory.find((c) => c.category === "SERVICE")).toEqual({
      category: "SERVICE",
      count: 70,
      percentage: 70,
    });
    expect(
      result.byCategory.find((c) => c.category === WaTemplateCategory.MARKETING)!.percentage,
    ).toBe(30);
  });

  test("lists the enum's own categories first, in their declared order", async () => {
    queryRawMock.mockResolvedValue([{ category: "SERVICE", count: 1 }]);

    const result = await getTemplateCategoryOverview(ORG, "all", null, "all");

    expect(result.byCategory.map((c) => c.category)).toEqual([
      ...Object.values(WaTemplateCategory),
      "SERVICE",
    ]);
  });

  // Same all-of-history default as the trend above, on the same screen as an
  // overview card that defaulted to a week. See issues.txt 15.1.
  test("defaults to the same seven days every other panel does", async () => {
    await getTemplateCategoryOverview(ORG, "all", null, "all");

    const { sql, bound } = queryAt(0);
    expect(sql).not.toContain("'1970-01-01'::timestamptz");
    const dates = bound.filter((v): v is Date => v instanceof Date);
    const days = (dates[1].getTime() - dates[0].getTime()) / (24 * 60 * 60 * 1000);
    expect(Math.round(days)).toBe(6);
  });
});

describe("getTemplatePerformanceStats", () => {
  const ROW = {
    template_name: "order_update",
    template_category: "MARKETING",
    total_sent: 200,
    delivered_count: 150,
    failed_count: 50,
    avg_delivery_time_seconds: 4.126,
    last_used: new Date("2026-03-01T10:00:00Z"),
  };

  test("reports each template's success and failure share", async () => {
    queryRawMock.mockResolvedValue([ROW]);

    const [stat] = await getTemplatePerformanceStats(ORG, "all", null, "all");

    expect(stat).toMatchObject({
      templateName: "order_update",
      totalSent: 200,
      deliveredCount: 150,
      failedCount: 50,
      successPercentage: 75,
      failurePercentage: 25,
    });
  });

  test("rounds the average delivery time to two decimals", async () => {
    queryRawMock.mockResolvedValue([ROW]);

    const [stat] = await getTemplatePerformanceStats(ORG, "all", null, "all");

    expect(stat.avgDeliveryTimeSeconds).toBe(4.13);
  });

  test("reports no average for a template nothing was delivered from", async () => {
    queryRawMock.mockResolvedValue([{ ...ROW, avg_delivery_time_seconds: null }]);

    const [stat] = await getTemplatePerformanceStats(ORG, "all", null, "all");

    expect(stat.avgDeliveryTimeSeconds).toBeNull();
  });

  test("reports when the template was last used", async () => {
    queryRawMock.mockResolvedValue([ROW]);

    const [stat] = await getTemplatePerformanceStats(ORG, "all", null, "all");

    expect((stat as any).lastUsed).toBe("2026-03-01T10:00:00.000Z");
  });

  test("reports nothing for an org that has sent no templates", async () => {
    await expect(getTemplatePerformanceStats(ORG, "all", null, "all")).resolves.toEqual([]);
  });

  test("lists the busiest templates first", async () => {
    await getTemplatePerformanceStats(ORG, "all", null, "all");

    expect(queryAt(0).sql).toContain("ORDER BY total_sent DESC");
  });

  // An average delivery time of exactly zero — every message delivered in the same
  // second it was sent — is falsy, so the old ternary reported it as "no data"
  // rather than as 0. roundSeconds tests for null instead. See issues.txt 15.6.
  test("reports an average of exactly zero as zero, not as no data", async () => {
    queryRawMock.mockResolvedValue([{ ...ROW, avg_delivery_time_seconds: 0 }]);

    const [stat] = await getTemplatePerformanceStats(ORG, "all", null, "all");

    expect(stat.avgDeliveryTimeSeconds).toBe(0);
  });

  // TemplatePerformanceStat used to list seven fields while the function returned
  // nine; templateCategory and lastUsed are both declared now, so the return type
  // describes what callers actually receive. See issues.txt 15.6.
  test("returns the category and the last-used time its declared type promises", async () => {
    queryRawMock.mockResolvedValue([ROW]);

    const [stat] = await getTemplatePerformanceStats(ORG, "all", null, "all");

    expect(stat).toHaveProperty("templateCategory");
    expect(stat).toHaveProperty("lastUsed");
  });
});

describe("getTeamPerformanceStats", () => {
  const ROW = {
    team_id: "team-1",
    team_name: "Support",
    team_color: "#fff",
    total_sent: 40,
    delivered_count: 30,
    failed_count: 10,
  };

  test("reports each team's send count and success share", async () => {
    queryRawMock.mockResolvedValue([ROW]);

    await expect(getTeamPerformanceStats(ORG, null, "all")).resolves.toEqual([
      {
        teamId: "team-1",
        teamName: "Support",
        teamColor: "#fff",
        totalSent: 40,
        deliveredCount: 30,
        failedCount: 10,
        successPercentage: 75,
      },
    ]);
  });

  test("reports a team that has sent nothing without dividing by zero", async () => {
    queryRawMock.mockResolvedValue([
      { ...ROW, total_sent: 0, delivered_count: 0, failed_count: 0 },
    ]);

    const [stat] = await getTeamPerformanceStats(ORG, null, "all");

    expect(stat.successPercentage).toBe(0);
  });

  test("lists every team in the org, busiest first", async () => {
    await getTeamPerformanceStats(ORG, null, "all");

    const { sql } = queryAt(0);
    expect(sql).toContain('FROM "Team" t');
    expect(sql).toContain("LEFT JOIN");
    expect(sql).toContain('t."orgId" =');
    expect(sql).toContain("ORDER BY total_sent DESC");
  });

  // This one changed what the panel showed. The query lists teams with a LEFT JOIN
  // so a team that sent nothing still appears with a zero, but the api-type filter
  // was spliced into the WHERE clause, after `WHERE t."orgId" = ...`, rather than
  // into the JOIN's ON condition — and a WHERE predicate on the right-hand table of
  // a LEFT JOIN discards exactly the unmatched rows the LEFT JOIN exists to keep,
  // because motm."externalApi" is NULL for them and `NULL = true` is not true. So
  // switching the API selector away from "all" made every idle team vanish rather
  // than show a zero. The variable was already named `apiJoinFilter`.
  // See issues.txt 15.2.
  test.each(["external", "whatsapp"])(
    "puts the %s filter in the join condition, so idle teams survive it",
    async (apiType) => {
      await getTeamPerformanceStats(ORG, null, apiType);

      const { sql } = queryAt(0);
      const joinPos = sql.indexOf('LEFT JOIN "WaMessageOrgTeamMap"');
      const filterPos = sql.indexOf('motm."externalApi"');
      const wherePos = sql.indexOf('WHERE t."orgId"');
      expect(filterPos).toBeGreaterThan(joinPos);
      expect(filterPos).toBeLessThan(wherePos);
    },
  );

  // Unlike getTemplateCategoryOverview and getTemplatePerformanceStats, this query
  // has no `motm."type" IN ('TEMPLATE', 'CAMPAIGN')` filter — deliberately. It
  // matches the overview card it sits beside; the template panels filter because
  // they break their numbers down BY template, so a non-template send has nothing
  // to appear under. See issues.txt 15.4(b).
  test("counts every mapped message, not just template and campaign sends", async () => {
    await getTeamPerformanceStats(ORG, null, "all");

    expect(queryAt(0).sql).not.toContain("'TEMPLATE', 'CAMPAIGN'");
  });

  test("defaults to the same seven days every other panel does", async () => {
    await getTeamPerformanceStats(ORG, null, "all");

    const { sql, bound } = queryAt(0);
    expect(sql).not.toContain("'1970-01-01'::timestamptz");
    const dates = bound.filter((v): v is Date => v instanceof Date);
    const days = (dates[1].getTime() - dates[0].getTime()) / (24 * 60 * 60 * 1000);
    expect(Math.round(days)).toBe(6);
  });
});
