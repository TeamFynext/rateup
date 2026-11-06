import { describe, expect, test } from "vitest";

describe("campaign.auth.ts", () => {
  test("exports nothing — every piece of the dead message limit is gone", async () => {
    const auth = await import("./campaign.auth.js");

    expect(Object.keys(auth)).toEqual([]);
  });
});
