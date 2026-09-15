import { describe, expect, test } from "vitest";

import { campaignProgressSegments } from "./campaignProgress.ts";

const byKey = (segments: ReturnType<typeof campaignProgressSegments>) =>
  Object.fromEntries(segments.map((s) => [s.key, { count: s.count, width: s.width }]));

describe("campaignProgressSegments", () => {
  test("splits cumulative counters into non-overlapping segments", () => {
    // 100 recipients: 80 sent (incl. 10 refused), 60 delivered, 40 read, 10 failed.
    const segments = byKey(
      campaignProgressSegments({ recipients: 100, sent: 80, delivered: 60, read: 40, failed: 10 }),
    );

    expect(segments.read).toEqual({ count: 40, width: 40 });
    expect(segments.delivered).toEqual({ count: 20, width: 20 });
    expect(segments.sent).toEqual({ count: 10, width: 10 });
    expect(segments.failed).toEqual({ count: 10, width: 10 });
  });

  test("leaves the rest of the track empty for recipients not sent yet", () => {
    const segments = campaignProgressSegments({ recipients: 200, sent: 50, delivered: 50 });
    const drawn = segments.reduce((sum, s) => sum + s.width, 0);
    expect(drawn).toBe(25);
  });

  test("scales to fit instead of overflowing when retries double-count", () => {
    const segments = campaignProgressSegments({
      recipients: 10,
      sent: 20,
      delivered: 10,
      read: 0,
      failed: 10,
    });
    const drawn = segments.reduce((sum, s) => sum + s.width, 0);
    expect(drawn).toBeCloseTo(100);
  });

  test("never draws read ahead of delivered, and handles an empty campaign", () => {
    expect(
      byKey(campaignProgressSegments({ recipients: 5, sent: 3, delivered: 1, read: 3 })).delivered
        .count,
    ).toBe(0);
    expect(campaignProgressSegments({}).every((s) => s.width === 0)).toBe(true);
  });

  test("keeps its colours distinct", () => {
    const colors = campaignProgressSegments({ recipients: 1 }).map((s) => s.color);
    expect(new Set(colors).size).toBe(colors.length);
  });
});
