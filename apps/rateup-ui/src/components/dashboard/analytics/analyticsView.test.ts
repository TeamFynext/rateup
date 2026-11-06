import { describe, expect, test } from "vite-plus/test";

import { isAuditLogLink, isLegacyAnalyticsTab, parseAnalyticsSearch } from "./analyticsView.ts";

describe("parseAnalyticsSearch", () => {
  test("maps the retired tab names onto the views that replaced them", () => {
    expect(parseAnalyticsSearch({ tab: "agent-performance" })).toEqual({
      tab: "team-performance",
      view: "agents",
    });
    expect(parseAnalyticsSearch({ tab: "api-analytics" })).toEqual({ tab: "template-delivery" });
    expect(parseAnalyticsSearch({ tab: "message-logs" })).toEqual({ tab: "message-log" });
  });

  test("maps the pre-rename tab values and keeps their sub-view", () => {
    expect(parseAnalyticsSearch({ tab: "conversations", view: "teams" })).toEqual({
      tab: "team-performance",
      view: "teams",
    });
    expect(parseAnalyticsSearch({ tab: "messages" })).toEqual({ tab: "template-delivery" });
    expect(parseAnalyticsSearch({ tab: "logs" })).toEqual({ tab: "message-log" });
  });

  test("keeps current values and drops unknown ones", () => {
    expect(parseAnalyticsSearch({ tab: "team-performance", view: "teams", log: "nope" })).toEqual({
      tab: "team-performance",
      view: "teams",
    });
    expect(parseAnalyticsSearch({ tab: "template-delivery" })).toEqual({
      tab: "template-delivery",
    });
    expect(parseAnalyticsSearch({ tab: "message-log" })).toEqual({ tab: "message-log" });
    expect(parseAnalyticsSearch({ tab: "instagram" })).toEqual({ tab: "instagram" });
    expect(parseAnalyticsSearch({ tab: "bogus", view: 3 })).toEqual({});
  });
});

describe("isLegacyAnalyticsTab", () => {
  test("is true only for the retired tab names", () => {
    expect(isLegacyAnalyticsTab("message-logs")).toBe(true);
    expect(isLegacyAnalyticsTab("conversations")).toBe(true);
    expect(isLegacyAnalyticsTab("messages")).toBe(true);
    expect(isLegacyAnalyticsTab("logs")).toBe(true);
    expect(isLegacyAnalyticsTab("message-log")).toBe(false);
    expect(isLegacyAnalyticsTab("team-performance")).toBe(false);
    expect(isLegacyAnalyticsTab("overview")).toBe(false);
    expect(isLegacyAnalyticsTab("toString")).toBe(false);
    expect(isLegacyAnalyticsTab(undefined)).toBe(false);
  });
});

describe("audit log links", () => {
  test("are not mapped onto Message log, so the route can redirect them", () => {
    expect(parseAnalyticsSearch({ tab: "logs", log: "activity" })).toEqual({});
  });
});

describe("isAuditLogLink", () => {
  test("spots both old addresses of the audit log", () => {
    expect(isAuditLogLink({ tab: "logs", log: "activity" })).toBe(true);
    expect(isAuditLogLink({ tab: "team-activity" })).toBe(true);
    expect(isAuditLogLink({ tab: "logs", log: "messages" })).toBe(false);
    expect(isAuditLogLink({ tab: "logs" })).toBe(false);
  });
});
