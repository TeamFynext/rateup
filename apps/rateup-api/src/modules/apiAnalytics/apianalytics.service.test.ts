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
  getWaMessageOverviewByTeamAndOrg,
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

describe("getWaMessageOverviewByTeamAndOrg - the numbers it reports", () => {
  test("reports delivered and failed as percentages of the total", async () => {
    queryRawMock.mockResolvedValue([OVERVIEW_ROW]);

    const result = await getWaMessageOverviewByTeamAndOrg(TEAM, ORG, null, "all");

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

    const result = await getWaMessageOverviewByTeamAndOrg(TEAM, ORG, null, "all");

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

    const result = await getWaMessageOverviewByTeamAndOrg(TEAM, ORG, null, "all");

    expect(result.deliveredPercentage).toBe(0);
    expect(result.failedPercentage).toBe(0);
    expect(result.avgDeliveryTimeSeconds).toBeNull();
  });

  test("copes with a query that returns no row at all", async () => {
    queryRawMock.mockResolvedValue([]);

    await expect(getWaMessageOverviewByTeamAndOrg(TEAM, ORG, null, "all")).resolves.toMatchObject({
      totalMessages: 0,
      totalMessagesChange: 0,
    });
  });

  test("reports the change against the previous period", async () => {
    queryRawMock
      .mockResolvedValueOnce([{ ...OVERVIEW_ROW, total_messages: 150 }])
      .mockResolvedValueOnce([{ ...OVERVIEW_ROW, total_messages: 100 }]);

    const result = await getWaMessageOverviewByTeamAndOrg(TEAM, ORG, null, "all");

    expect(result.totalMessagesChange).toBe(50);
  });

  test("calls a first period with nothing before it a hundred percent up", async () => {
    queryRawMock
      .mockResolvedValueOnce([{ ...OVERVIEW_ROW, total_messages: 40 }])
      .mockResolvedValueOnce([{ ...OVERVIEW_ROW, total_messages: 0 }]);

    const result = await getWaMessageOverviewByTeamAndOrg(TEAM, ORG, null, "all");

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

    const result = await getWaMessageOverviewByTeamAndOrg(TEAM, ORG, null, "all");

    expect(result.totalMessagesChange).toBe(0);
  });

  // NOTE: pins current behaviour. percentChange treats a null current value as
  // zero — `(null - prev) / prev` is `-prev / prev` — so a period in which nothing
  // was delivered, and which therefore has no average delivery time to report,
  // shows up as a 100% improvement rather than "no data".
  // See issues.txt 15.5.
  test("reports a period with no deliveries as a hundred percent improvement", async () => {
    queryRawMock
      .mockResolvedValueOnce([{ ...OVERVIEW_ROW, avg_delivery_time_seconds: null }])
      .mockResolvedValueOnce([{ ...OVERVIEW_ROW, avg_delivery_time_seconds: 8 }]);

    const result = await getWaMessageOverviewByTeamAndOrg(TEAM, ORG, null, "all");

    expect(result.avgDeliveryTimeSeconds).toBeNull();
    expect(result.avgDeliveryTimeChange).toBe(-100);
  });

  // NOTE: pins current behaviour. The average is passed through exactly as Postgres
  // returned it, while getTemplatePerformanceStats rounds the same figure to two
  // decimals — so the overview card and the per-template table disagree on how
  // precise a delivery time is. See issues.txt 15.6.
  test("passes the average delivery time through unrounded", async () => {
    queryRawMock.mockResolvedValue([{ ...OVERVIEW_ROW, avg_delivery_time_seconds: 4.123456789 }]);

    const result = await getWaMessageOverviewByTeamAndOrg(TEAM, ORG, null, "all");

    expect(result.avgDeliveryTimeSeconds).toBe(4.123456789);
  });
});

describe("getWaMessageOverviewByTeamAndOrg - the window it looks at", () => {
  test("defaults to the last seven days when given no range", async () => {
    await getWaMessageOverviewByTeamAndOrg(TEAM, ORG, null, "all");

    const { bound } = queryAt(0);
    const [start, end] = bound.slice(-2) as Date[];
    const days = (end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000);
    expect(Math.round(days)).toBe(6);
  });

  test("uses the range it was given", async () => {
    await getWaMessageOverviewByTeamAndOrg(
      TEAM,
      ORG,
      ["2026-03-01T00:00:00Z", "2026-03-08T00:00:00Z"],
      "all",
    );

    const { bound } = queryAt(0);
    const [start, end] = bound.slice(-2) as Date[];
    expect(start.toISOString()).toBe("2026-03-01T00:00:00.000Z");
    expect(end.toISOString()).toBe("2026-03-08T00:00:00.000Z");
  });

  test("compares against the window of equal length immediately before it", async () => {
    await getWaMessageOverviewByTeamAndOrg(
      TEAM,
      ORG,
      ["2026-03-08T00:00:00Z", "2026-03-15T00:00:00Z"],
      "all",
    );

    const [prevStart, prevEnd] = queryAt(1).bound.slice(-2) as Date[];
    expect(prevEnd.toISOString()).toBe("2026-03-07T23:59:59.999Z");
    expect(prevStart.toISOString()).toBe("2026-02-28T23:59:59.999Z");
  });

  // NOTE: pins current behaviour. A calendar date with no time parses as UTC
  // midnight, so a range the user picked as "the 1st to the 7th" ends the instant
  // the 7th begins — every message sent on that last day is left out of the count.
  // The service takes the strings verbatim and never widens the end to the end of
  // its day. See issues.txt 15.3.
  test("ends a date-only range at the first instant of its last day", async () => {
    await getWaMessageOverviewByTeamAndOrg(TEAM, ORG, ["2026-03-01", "2026-03-07"], "all");

    const [, end] = queryAt(0).bound.slice(-2) as Date[];
    expect(end.toISOString()).toBe("2026-03-07T00:00:00.000Z");
  });
});

describe("the filters every panel builds", () => {
  test("always scopes the query to the caller's org", async () => {
    await getWaMessageOverviewByTeamAndOrg(TEAM, ORG, null, "all");

    for (const { sql, bound } of allQueries()) {
      expect(sql).toContain('motm."orgId" =');
      expect(bound).toContain(ORG);
    }
  });

  test("narrows to one team when a real team is named", async () => {
    await getWaMessageOverviewByTeamAndOrg(TEAM, ORG, null, "all");

    const { sql, bound } = queryAt(0);
    expect(sql).toContain('motm."teamId" =');
    expect(bound).toContain(TEAM);
  });

  test.each(["all", "null", "", undefined, null])(
    "leaves every team in when the team is %s",
    async (teamId) => {
      await getWaMessageOverviewByTeamAndOrg(teamId as any, ORG, null, "all");

      expect(queryAt(0).sql).not.toContain('motm."teamId" =');
    },
  );

  test("narrows to the external API when asked", async () => {
    await getWaMessageOverviewByTeamAndOrg(TEAM, ORG, null, "external");

    expect(queryAt(0).sql).toContain('motm."externalApi" = true');
  });

  test("narrows to the dashboard's own sends when asked", async () => {
    await getWaMessageOverviewByTeamAndOrg(TEAM, ORG, null, "whatsapp");

    expect(queryAt(0).sql).toContain('motm."externalApi" = false');
  });

  test.each(["all", "", undefined, "something-else"])(
    "counts both sources when the api type is %s",
    async (apiType) => {
      await getWaMessageOverviewByTeamAndOrg(TEAM, ORG, null, apiType);

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

  // NOTE: pins current behaviour, and it is the one the dashboard shows. Unlike
  // getWaMessageOverviewByTeamAndOrg and getDeliveredFailedWeekTrend, which both
  // default to the last seven days, this one leaves the range null and the SQL
  // coalesces it to 1970 — so the trend chart covers all history while the summary
  // card beside it covers a week. Both are filled from the same request, with the
  // same query string. See issues.txt 15.1.
  test("falls back to the whole of history when given no range", async () => {
    await getDeliveredFailedTrend(ORG, TEAM, "day", null, "all");

    const { sql, bound } = queryAt(0);
    expect(sql).toContain("COALESCE(");
    expect(sql).toContain("'1970-01-01'::timestamptz");
    expect(bound).toContain(null);
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

  // NOTE: pins current behaviour. The reply is built by walking OUR enum and
  // looking each name up in the query's result, so a category Meta returns that the
  // enum does not carry is dropped — from the breakdown and from totalTemplates,
  // which is recomputed from the filtered list rather than taken from the query. A
  // pie chart of these numbers adds up to 100% while under-reporting the real
  // total. See issues.txt 15.4.
  test("discards a category the enum does not list, and the total with it", async () => {
    queryRawMock.mockResolvedValue([
      { category: WaTemplateCategory.MARKETING, count: 30 },
      { category: "SERVICE", count: 70 },
    ]);

    const result = await getTemplateCategoryOverview(ORG, "all", null, "all");

    expect(result.totalTemplates).toBe(30);
    expect(result.byCategory.map((c) => c.category)).not.toContain("SERVICE");
    expect(
      result.byCategory.find((c) => c.category === WaTemplateCategory.MARKETING)!.percentage,
    ).toBe(100);
  });

  // NOTE: same all-of-history default as the trend above — and this panel sits on
  // the same screen as the overview card, which defaults to a week.
  // See issues.txt 15.1.
  test("falls back to the whole of history when given no range", async () => {
    await getTemplateCategoryOverview(ORG, "all", null, "all");

    expect(queryAt(0).sql).toContain("'1970-01-01'::timestamptz");
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

  // NOTE: pins current behaviour. An average delivery time of exactly zero — every
  // message delivered in the same second it was sent — is falsy, so the ternary
  // reports it as "no data" rather than as 0. See issues.txt 15.6.
  test("reports an average of exactly zero as no data at all", async () => {
    queryRawMock.mockResolvedValue([{ ...ROW, avg_delivery_time_seconds: 0 }]);

    const [stat] = await getTemplatePerformanceStats(ORG, "all", null, "all");

    expect(stat.avgDeliveryTimeSeconds).toBeNull();
  });

  // NOTE: the declared TemplatePerformanceStat interface lists seven fields and the
  // function returns nine — templateCategory and lastUsed are both undeclared. The
  // return type therefore does not describe what callers actually receive.
  // See issues.txt 15.6.
  test("returns two fields its declared type does not mention", async () => {
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

  // NOTE: pins current behaviour, and this one changes what the panel shows. The
  // query lists teams with a LEFT JOIN so that a team which sent nothing still
  // appears with a zero. But the api-type filter is spliced into the WHERE clause,
  // after `WHERE t."orgId" = ...`, rather than into the JOIN's ON condition — and a
  // WHERE predicate on the right-hand table of a LEFT JOIN discards the unmatched
  // rows it was meant to preserve, because motm."externalApi" is NULL for them and
  // `NULL = true` is not true. So filtering by API type silently drops every team
  // that sent nothing through it. The variable is even named `apiJoinFilter`.
  // See issues.txt 15.2.
  test.each(["external", "whatsapp"])(
    "puts the %s filter in the WHERE clause of a left join",
    async (apiType) => {
      await getTeamPerformanceStats(ORG, null, apiType);

      const { sql } = queryAt(0);
      const wherePos = sql.indexOf('WHERE t."orgId"');
      const filterPos = sql.indexOf('motm."externalApi"');
      expect(filterPos).toBeGreaterThan(wherePos);
      expect(sql.slice(wherePos, filterPos)).not.toContain("JOIN");
    },
  );

  // NOTE: unlike getTemplateCategoryOverview and getTemplatePerformanceStats, this
  // query has no `motm."type" IN ('TEMPLATE', 'CAMPAIGN')` filter — so the team
  // panel counts every mapped message while the template panels count only template
  // and campaign sends. Two panels on one screen, counting different things.
  // See issues.txt 15.4.
  test("counts every mapped message, not just template and campaign sends", async () => {
    await getTeamPerformanceStats(ORG, null, "all");

    expect(queryAt(0).sql).not.toContain("'TEMPLATE', 'CAMPAIGN'");
  });

  test("falls back to the whole of history when given no range", async () => {
    await getTeamPerformanceStats(ORG, null, "all");

    expect(queryAt(0).sql).toContain("'1970-01-01'::timestamptz");
  });
});
