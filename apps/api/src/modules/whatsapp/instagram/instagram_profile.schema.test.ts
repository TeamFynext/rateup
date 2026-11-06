import { describe, expect, test } from "vitest";

import {
  instagramIceBreakersBodySchema,
  instagramPersistentMenuBodySchema,
} from "./instagram_profile.schema.js";

describe("instagramIceBreakersBodySchema", () => {
  test("accepts the dashboard's draft save, blank payload included", () => {
    const body = {
      iceBreakers: [
        { question: "Opening hours?", payload: "HOURS" },
        { question: "Where are you?", payload: "" },
      ],
      syncWithMeta: false,
    };
    expect(instagramIceBreakersBodySchema.parse(body)).toEqual(body);
  });

  test("accepts clearing the list", () => {
    expect(instagramIceBreakersBodySchema.safeParse({ iceBreakers: [] }).success).toBe(true);
  });

  test.each([
    [
      "a question over Meta's 80 characters",
      { iceBreakers: [{ question: "q".repeat(81), payload: "p" }] },
    ],
    ["an item without a payload", { iceBreakers: [{ question: "q" }] }],
    ["a non-array", { iceBreakers: "x" }],
  ])("refuses %s", (_label, body) => {
    expect(instagramIceBreakersBodySchema.safeParse(body).success).toBe(false);
  });
});

describe("instagramPersistentMenuBodySchema", () => {
  test("accepts the dashboard's menu", () => {
    const body = {
      persistentMenu: [
        {
          locale: "default",
          call_to_actions: [
            { type: "postback", title: "Talk to us", payload: "TALK", url: undefined },
            { type: "web_url", title: "Shop", payload: undefined, url: "https://shop.example.com" },
          ],
        },
      ],
      syncWithMeta: true,
    };
    expect(instagramPersistentMenuBodySchema.safeParse(body).success).toBe(true);
  });

  test("refuses a non-http link", () => {
    const body = {
      persistentMenu: [
        {
          locale: "default",
          call_to_actions: [{ type: "web_url", title: "x", url: "javascript:alert(1)" }],
        },
      ],
    };
    expect(instagramPersistentMenuBodySchema.safeParse(body).success).toBe(false);
  });
});
