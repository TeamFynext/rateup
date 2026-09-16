import type { TFunction } from "i18next";
import { describe, expect, test } from "vitest";

import type { FeedbackFlow, FeedbackTemplate } from "@/backend/loyalty/feedback.api.ts";

import { feedbackSearchSchema, requestsQueryFor } from "./feedback.search.ts";
import { canEnableFeedback, feedbackNavState, feedbackTone } from "./feedbackStatus.ts";
import { isFeedbackTab } from "./feedbackTabs.ts";
import { happyThresholdOptions, sendDelayOptions } from "./schemas.ts";

const t = ((key: string, opts?: Record<string, unknown>) =>
  key.replace(/\{(\w+)\}/g, (_m, name: string) =>
    String(opts?.[name] ?? ""),
  )) as unknown as TFunction;

const flow = (status: string): FeedbackFlow => ({
  dbFlowId: "flow-1",
  flowId: "123",
  name: "Feedback – Restaurant",
  status,
  pendingSave: false,
  surveyId: "survey-1",
  version: 2,
});
const template = (status: FeedbackTemplate["status"]): FeedbackTemplate => ({
  id: "tpl-1",
  name: "loyalty_feedback_request_v1",
  status,
});

describe("isFeedbackTab", () => {
  test("accepts the two tabs and nothing else", () => {
    expect(isFeedbackTab("settings")).toBe(true);
    expect(isFeedbackTab("results")).toBe(true);
    expect(isFeedbackTab("foo")).toBe(false);
    expect(isFeedbackTab(undefined)).toBe(false);
  });
});

describe("feedbackSearchSchema", () => {
  test("defaults to page 1 with nothing else set", () => {
    expect(feedbackSearchSchema.parse({})).toEqual({ page: 1 });
  });

  test("bad values fall back rather than throw", () => {
    expect(
      feedbackSearchSchema.parse({ tab: "nope", period: "7d", status: "LOST", page: "0" }),
    ).toEqual({ page: 1 });
  });

  test("coerces the page and keeps valid filters", () => {
    expect(
      feedbackSearchSchema.parse({ tab: "results", period: "90d", status: "SENT", page: "3" }),
    ).toEqual({ tab: "results", period: "90d", status: "SENT", page: 3 });
  });
});

describe("requestsQueryFor", () => {
  test("always sends the page size, and the status only when set", () => {
    expect(requestsQueryFor({ page: 2 })).toEqual({ page: 2, pageSize: 20 });
    expect(requestsQueryFor({ page: 1, status: "FAILED" })).toEqual({
      page: 1,
      pageSize: 20,
      status: "FAILED",
    });
  });
});

describe("feedbackTone", () => {
  test("no flow is missing; a draft is a draft whatever the template says", () => {
    expect(feedbackTone(null, null, false)).toBe("missing");
    expect(feedbackTone(flow("DRAFT"), template("approved"), true)).toBe("draft");
  });

  test("a published flow waits on the template, then on the switch", () => {
    expect(feedbackTone(flow("PUBLISHED"), null, true)).toBe("pending");
    expect(feedbackTone(flow("PUBLISHED"), template("pending"), true)).toBe("pending");
    expect(feedbackTone(flow("PUBLISHED"), template("rejected"), true)).toBe("rejected");
    expect(feedbackTone(flow("PUBLISHED"), template("approved"), false)).toBe("off");
    expect(feedbackTone(flow("PUBLISHED"), template("approved"), true)).toBe("live");
  });

  test("Meta's dead-end statuses are blocked", () => {
    for (const status of ["BLOCKED", "THROTTLED", "DEPRECATED"]) {
      expect(feedbackTone(flow(status), template("approved"), true)).toBe("blocked");
    }
  });

  test("the sidebar chip only knows draft, pending and live", () => {
    expect(feedbackNavState(flow("DRAFT"), null, false)).toBe("draft");
    expect(feedbackNavState(flow("PUBLISHED"), template("pending"), false)).toBe("pending");
    expect(feedbackNavState(flow("PUBLISHED"), template("approved"), false)).toBe("live");
    expect(feedbackNavState(flow("PUBLISHED"), template("approved"), true)).toBe("live");
    expect(feedbackNavState(flow("BLOCKED"), template("approved"), true)).toBeNull();
    expect(feedbackNavState(null, null, false)).toBeNull();
  });

  test("canEnableFeedback mirrors the API's rule", () => {
    expect(canEnableFeedback(flow("PUBLISHED"), template("approved"))).toBe(true);
    expect(canEnableFeedback(flow("PUBLISHED"), template("pending"))).toBe(false);
    expect(canEnableFeedback(flow("DRAFT"), template("approved"))).toBe(false);
    expect(canEnableFeedback(null, null)).toBe(false);
  });
});

describe("select options", () => {
  test("sendDelayOptions lists the presets and slots in a stored value once", () => {
    const values = (current?: number) => sendDelayOptions(t, current).map((o) => o.value);
    expect(values()).toEqual(["0", "30", "60", "180", "1440"]);
    expect(values(45)).toEqual(["0", "30", "45", "60", "180", "1440"]);
    expect(values(60)).toEqual(["0", "30", "60", "180", "1440"]);
  });

  test("sendDelayOptions labels read as people say them", () => {
    const labels = Object.fromEntries(sendDelayOptions(t, 2880).map((o) => [o.value, o.label]));
    expect(labels["0"]).toBe("Straight away");
    expect(labels["30"]).toBe("30 minutes");
    expect(labels["60"]).toBe("1 hour");
    expect(labels["180"]).toBe("3 hours");
    expect(labels["1440"]).toBe("Next day");
    expect(labels["2880"]).toBe("2 days");
  });

  test("happyThresholdOptions runs from five stars down to two", () => {
    expect(happyThresholdOptions(t).map((o) => o.value)).toEqual(["5", "4", "3", "2"]);
    expect(happyThresholdOptions(t)[0]?.label).toBe("5 stars only");
    expect(happyThresholdOptions(t)[1]?.label).toBe("4 stars or more");
  });
});
