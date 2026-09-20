import { describe, expect, test } from "vitest";

import {
  buildAgentReport,
  buildMessagesReport,
  buildTeamReport,
  buildOverviewReport,
  conversationStats,
  deliveryStats,
} from "./buildReport.ts";
import type { Translate } from "./reportModel.ts";

/** Interpolates `{name}` the way the ICU translator does, without loading i18n. */
const t: Translate = (key, values) =>
  key.replace(/\{(\w+)\}/g, (_, name: string) => String(values?.[name] ?? ""));

const context = { t, dateKey: "last7days", teamId: "all" };

describe("conversationStats", () => {
  test("compares against the previous period, with response times better when lower", () => {
    const stats = conversationStats(t, {
      overview: {
        totalConversations: 120,
        averageResponseTime: 90,
        averageResponseTimeByAgent: 300,
        resolutionRate: 62,
      },
      previousOverview: {
        totalConversations: 100,
        averageResponseTime: 60,
        averageResponseTimeByAgent: 300,
        resolutionRate: 60,
      },
    });
    expect(stats[0]).toMatchObject({
      value: "120",
      change: { text: "+20% vs previous period", tone: "good" },
    });
    expect(stats[1]).toMatchObject({
      value: "1m 30s",
      change: { text: "+50% vs previous period", tone: "bad" },
    });
    expect(stats[2]?.change).toMatchObject({ tone: "neutral" });
    expect(stats[3]?.change).toMatchObject({ text: "+2 pts vs previous period", tone: "good" });
  });

  test("says there are no replies instead of showing a zero duration", () => {
    const stats = conversationStats(t, {
      overview: {
        totalConversations: 3,
        averageResponseTime: null,
        averageResponseTimeByAgent: null,
        resolutionRate: 0,
      },
    });
    expect(stats[1]?.value).toBe("No replies yet");
    expect(stats[0]?.change).toBeUndefined();
  });
});

describe("deliveryStats", () => {
  test("reads sub-second delivery as <1s", () => {
    const stats = deliveryStats(t, {
      delivery: {
        totalMessages: 10,
        deliveredMessages: 9,
        deliveredPercentage: 90,
        failedMessages: 1,
        failedPercentage: 10,
        avgDeliveryTimeSeconds: 0.4,
      },
    });
    expect(stats[3]?.value).toBe("<1s");
    expect(stats[2]?.note).toBe("10% of sent");
  });
});

describe("report builders", () => {
  test("an empty range gives empty blocks rather than blank charts", () => {
    const blocks = buildOverviewReport(context, { resolved: [], responseTimes: [] });
    const empties = blocks.filter((block) => block.kind === "empty").map((block) => block.title);
    expect(empties).toEqual(["Resolved per day", "Response time", "Delivery trend"]);
    expect(
      blocks.some((block) => block.kind === "section" && block.title === "Needs attention"),
    ).toBe(false);
  });

  test("marks failing templates and sorts them by volume", () => {
    const blocks = buildMessagesReport(context, {
      templates: {
        templatePerformance: [
          {
            templateName: "small",
            templateCategory: "UTILITY",
            totalSent: 5,
            failurePercentage: 0,
          },
          {
            templateName: "big",
            templateCategory: "MARKETING",
            totalSent: 50,
            failurePercentage: 40,
          },
        ],
      },
    });
    const table = blocks.find((block) => block.kind === "table" && block.title === "Templates");
    expect(table?.kind === "table" && table.rows.map((row) => row[0])).toEqual([
      "big  (Failing)",
      "small",
    ]);
  });

  test("leaves out a section heading with nothing under it", () => {
    const blocks = buildMessagesReport(context, {});
    const sections = blocks.filter((block) => block.kind === "section").map((block) => block.title);
    expect(sections).toEqual(["Summary"]);
  });
});

describe("drill-down reports", () => {
  test("shows a faster agent as a falling response time, which is good", () => {
    const blocks = buildAgentReport(t, {
      weeklyMessageStats: [],
      recentConversations: [],
      metrics: { resolutionRate: 50, firstResponseTime: "30", avgHandlingTime: 0 },
      userPerformance: {
        name: "Aisha",
        email: "a@x.io",
        status: "online",
        totalAssignedConversations: 1,
        totalClosedConversations: 1,
        totalMessagesHandled: 40,
        averageResponseTime: 90,
        // The API's improvement figure: positive means faster than last week.
        responseTimeRateByLastWeek: 25,
        resolutionRateByLastWeek: -5,
        messagesHandledRateByLastWeek: 10,
        conversationsTransferred: 2,
        conversationsRecieved: 3,
      },
    });
    const stats = blocks.find((block) => block.kind === "stats");
    expect(stats?.kind === "stats" && stats.items[1]?.change).toEqual({
      text: "-25% vs last week",
      tone: "good",
    });
    expect(stats?.kind === "stats" && stats.items[2]?.change).toEqual({
      text: "-5 pts vs last week",
      tone: "bad",
    });
    expect(blocks.some((block) => block.kind === "empty")).toBe(true);
  });

  test("lists team members busiest first", () => {
    const blocks = buildTeamReport(t, {
      averageResponseTime: 60,
      members: [
        {
          userId: "1",
          name: "Quiet",
          averageResponseTime: 30,
          messagesHandled: 2,
          staffActiveChats: 0,
        },
        {
          userId: "2",
          name: "Busy",
          averageResponseTime: 45,
          messagesHandled: 90,
          staffActiveChats: 4,
          onlineStatus: "busy",
        },
      ],
    });
    const table = blocks.find((block) => block.kind === "table");
    expect(table?.kind === "table" && table.rows.map((row) => [row[0], row[1]])).toEqual([
      ["Busy", "Busy"],
      ["Quiet", "Offline"],
    ]);
  });
});
