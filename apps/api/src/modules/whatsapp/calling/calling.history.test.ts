import { describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/prisma.js", () => ({ default: {} }));
vi.mock("../settings/wa_channel_access.js", () => ({ getChannelScope: vi.fn() }));

import { daysInRange } from "./calling.history.js";

describe("daysInRange", () => {
  test("lists every local day, ends included", () => {
    expect(
      daysInRange(
        new Date("2026-10-01T00:00:00+05:30"),
        new Date("2026-10-03T23:59:59+05:30"),
        "Asia/Kolkata",
      ),
    ).toEqual(["2026-10-01", "2026-10-02", "2026-10-03"]);
  });

  test("days follow the viewer's zone, not UTC", () => {
    // 20:00 UTC on the 1st is already the 2nd in Kolkata.
    expect(
      daysInRange(
        new Date("2026-10-01T20:00:00Z"),
        new Date("2026-10-02T20:00:00Z"),
        "Asia/Kolkata",
      ),
    ).toEqual(["2026-10-02", "2026-10-03"]);
  });

  test("a DST change does not skip or repeat a day", () => {
    const days = daysInRange(
      new Date("2026-03-07T00:00:00-05:00"),
      new Date("2026-03-10T23:59:59-04:00"),
      "America/New_York",
    );
    expect(days).toEqual(["2026-03-07", "2026-03-08", "2026-03-09", "2026-03-10"]);
  });
});
