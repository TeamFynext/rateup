import { describe, expect, test } from "vitest";

import { toggleChannel } from "./channels.ts";

describe("toggleChannel", () => {
  test("a channel switched on joins the end of the fallback order", () => {
    expect(toggleChannel(["WHATSAPP"], "SMS", true)).toEqual(["WHATSAPP", "SMS"]);
    expect(toggleChannel(["WHATSAPP", "SMS"], "SMS", true)).toEqual(["WHATSAPP", "SMS"]);
  });

  test("the last channel cannot be switched off", () => {
    expect(toggleChannel(["WHATSAPP", "SMS"], "WHATSAPP", false)).toEqual(["SMS"]);
    expect(toggleChannel(["SMS"], "SMS", false)).toEqual(["SMS"]);
  });
});
