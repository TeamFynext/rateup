import { describe, expect, test } from "vitest";

import { isLegacyAnalyticsTab, parseAnalyticsSearch } from "./analyticsView.ts";

describe("parseAnalyticsSearch", () => {
  test("maps each retired tab onto the view that replaced it", () => {
    expect(parseAnalyticsSearch({ tab: "agent-performance" })).toEqual({
      tab: "conversations",
      view: "agents",
    });
    expect(parseAnalyticsSearch({ tab: "team-performance" })).toEqual({
      tab: "conversations",
      view: "teams",
    });
    expect(parseAnalyticsSearch({ tab: "api-analytics" })).toEqual({ tab: "messages" });
    expect(parseAnalyticsSearch({ tab: "message-logs" })).toEqual({ tab: "logs", log: "messages" });
    expect(parseAnalyticsSearch({ tab: "team-activity" })).toEqual({
      tab: "logs",
      log: "activity",
    });
  });

  test("keeps current values and drops unknown ones", () => {
    expect(parseAnalyticsSearch({ tab: "conversations", view: "teams", log: "nope" })).toEqual({
      tab: "conversations",
      view: "teams",
    });
    expect(parseAnalyticsSearch({ tab: "bogus", view: 3 })).toEqual({});
  });
});

describe("isLegacyAnalyticsTab", () => {
  test("is true only for the retired tab names", () => {
    expect(isLegacyAnalyticsTab("message-logs")).toBe(true);
    expect(isLegacyAnalyticsTab("overview")).toBe(false);
    expect(isLegacyAnalyticsTab(undefined)).toBe(false);
  });
});
