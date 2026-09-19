import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  analyticsRequestParams,
  requestFreshAnalytics,
  toAnalyticsParams,
} from "./analyticsFilter";

const START = new Date("2026-09-11T18:30:00.000Z");
const END = new Date("2026-09-18T18:29:59.999Z");

describe("toAnalyticsParams", () => {
  it("sends a date range as two ISO instants", () => {
    expect(toAnalyticsParams({ dateRange: [START, END] })).toEqual({
      dateRange: "2026-09-11T18:30:00.000Z,2026-09-18T18:29:59.999Z",
    });
  });

  it("never sends a Date's local string, whose '+' the server used to read as a space", () => {
    const { dateRange } = toAnalyticsParams({ dateRange: [START, END] });

    expect(dateRange).not.toMatch(/GMT/);
    expect(String(dateRange)).not.toContain("+");
  });

  it("gives equal ranges the same value, whichever Date objects carry them", () => {
    const again = [new Date(START.getTime()), new Date(END.getTime())];

    expect(toAnalyticsParams({ dateRange: [START, END] })).toEqual(
      toAnalyticsParams({ dateRange: again }),
    );
  });

  it.each([
    ["half-picked", [START]],
    ["empty", []],
    ["unreadable", [START, new Date("nope")]],
  ])("drops a %s range, so the server falls back to its default window", (_name, dateRange) => {
    expect(toAnalyticsParams({ dateKey: "custom-range", dateRange })).toEqual({
      dateKey: "custom-range",
    });
  });

  it.each([null, undefined, "", "null"])("sends an unset team (%s) as 'all'", (teamId) => {
    expect(toAnalyticsParams({ teamId })).toEqual({ teamId: "all" });
  });

  it("sends a real team as it is", () => {
    expect(toAnalyticsParams({ teamId: "team-1" })).toEqual({ teamId: "team-1" });
  });

  it("does not invent a team for an endpoint that takes none", () => {
    expect(toAnalyticsParams({ dateKey: "today" })).not.toHaveProperty("teamId");
  });

  it("drops null and undefined instead of sending the words", () => {
    expect(toAnalyticsParams({ dateKey: "today", staffId: null, apiType: undefined })).toEqual({
      dateKey: "today",
    });
  });

  it("leaves primitives untouched, so a key built from { days: 7 } elsewhere still matches", () => {
    expect(toAnalyticsParams({ days: 7 })).toEqual({ days: 7 });
    expect(toAnalyticsParams({ days: 7 }).days).toBe(7);
  });

  it("keeps a false flag — only null and undefined mean 'not set'", () => {
    expect(toAnalyticsParams({ externalApi: false, offset: 0 })).toEqual({
      externalApi: false,
      offset: 0,
    });
  });

  it("joins a list of strings", () => {
    expect(toAnalyticsParams({ status: ["sent", "failed"] })).toEqual({ status: "sent,failed" });
  });

  it("sends a single Date as an ISO instant", () => {
    expect(toAnalyticsParams({ since: START })).toEqual({ since: "2026-09-11T18:30:00.000Z" });
  });

  it("serialises the same filter the same way whatever order it was written in", () => {
    const one = toAnalyticsParams({ dateKey: "today", apiType: "all", teamId: "team-1" });
    const two = toAnalyticsParams({ teamId: "team-1", apiType: "all", dateKey: "today" });

    expect(JSON.stringify(one)).toBe(JSON.stringify(two));
  });

  it.each([null, undefined])("gives no params for a %s filter", (filter) => {
    expect(toAnalyticsParams(filter)).toEqual({});
  });
});

describe("analyticsRequestParams", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-18T12:00:00Z"));
  });

  afterEach(() => {
    // Let any refresh window opened by a test lapse before the next one.
    vi.setSystemTime(new Date("2026-09-18T13:00:00Z"));
    vi.useRealTimers();
  });

  it("is just the normalised filter in the ordinary case", () => {
    vi.setSystemTime(new Date("2026-09-18T11:00:00Z"));

    expect(analyticsRequestParams({ days: 7 })).toEqual({ days: 7 });
  });

  it("asks the server to skip its cache right after a manual refresh", () => {
    requestFreshAnalytics();

    expect(analyticsRequestParams({ days: 7 })).toEqual({ days: 7, fresh: 1 });
  });

  it("covers every request the refresh sets off, not only the first", () => {
    requestFreshAnalytics();
    vi.advanceTimersByTime(3_000);

    expect(analyticsRequestParams({ days: 7 })).toHaveProperty("fresh", 1);
    expect(analyticsRequestParams({ days: 30 })).toHaveProperty("fresh", 1);
  });

  it("goes back to cached answers once the refresh is over", () => {
    requestFreshAnalytics();
    vi.advanceTimersByTime(11_000);

    expect(analyticsRequestParams({ days: 7 })).toEqual({ days: 7 });
  });

  it("never puts the flag in the query key, so a refresh renews the entry it invalidated", () => {
    requestFreshAnalytics();

    expect(toAnalyticsParams({ days: 7 })).toEqual({ days: 7 });
  });
});
