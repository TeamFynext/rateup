import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("./logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}));

import { log } from "./logger.js";
import { parseCorsWhitelist } from "./corsWhitelist.js";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("parseCorsWhitelist - the value shapes actually deployed", () => {
  // The shape in .env today. It is JSON, and it is missing its slashes.
  test("reads a JSON array and normalises a scheme:host entry to a real origin", () => {
    expect(parseCorsWhitelist('["http:localhost:4000"]')).toEqual(["http://localhost:4000"]);
  });

  test("reads a JSON array of well-formed origins", () => {
    expect(parseCorsWhitelist('["http://localhost:4000","https://app.rateup.app"]')).toEqual([
      "http://localhost:4000",
      "https://app.rateup.app",
    ]);
  });

  test("still reads a bare comma-separated list", () => {
    expect(parseCorsWhitelist("http://localhost:4000, https://app.rateup.app")).toEqual([
      "http://localhost:4000",
      "https://app.rateup.app",
    ]);
  });

  test("drops a trailing slash so the entry matches the Origin header", () => {
    expect(parseCorsWhitelist("https://app.rateup.app/")).toEqual(["https://app.rateup.app"]);
  });

  test.each([
    ["undefined", undefined],
    ["an empty string", ""],
    ["an empty JSON array", "[]"],
  ])("returns an empty list for %s", (_name, input) => {
    expect(parseCorsWhitelist(input)).toEqual([]);
  });

  test("does not repeat an origin listed twice", () => {
    expect(parseCorsWhitelist('["https://app.rateup.app","https://app.rateup.app/"]')).toEqual([
      "https://app.rateup.app",
    ]);
  });
});

describe("parseCorsWhitelist - refusing to widen the whitelist", () => {
  // These are the two bypasses the old `new RegExp(entry)` opened up. The values are
  // returned as plain strings, which @fastify/cors compares with ===, so neither can
  // recur: an origin either is on the list or it is not.
  test("yields an origin that cannot match a lookalike domain", () => {
    const origins = parseCorsWhitelist('["https://app.rateup.app"]');

    expect(origins).toEqual(["https://app.rateup.app"]);
    expect(origins).not.toContain("https://app.rateup.app.evil.com");
    expect(origins.every((o) => typeof o === "string")).toBe(true);
  });

  test("never yields a bare host, which as a regex would have matched anything containing it", () => {
    expect(parseCorsWhitelist("app.rateup.app")).toEqual([]);
    expect(log.error).toHaveBeenCalled();
  });

  test.each([
    ["a bare host", "app.rateup.app"],
    ["free text", "not a url"],
    ["a lone comma", ","],
  ])("drops %s with an error rather than keeping it", (_name, input) => {
    expect(parseCorsWhitelist(input)).toEqual([]);
  });

  test("drops a non-http scheme rather than letting it serialise to a null origin", () => {
    expect(parseCorsWhitelist("data:text/html,hi")).toEqual([]);
    expect(log.error).toHaveBeenCalled();
  });

  test("keeps the good entries when one in the list is bad", () => {
    expect(parseCorsWhitelist('["https://app.rateup.app","nonsense"]')).toEqual([
      "https://app.rateup.app",
    ]);
    expect(log.error).toHaveBeenCalledTimes(1);
  });

  test("falls back to list-parsing for a value that starts like JSON but is not", () => {
    expect(parseCorsWhitelist("[https://app.rateup.app")).toEqual([]);
    expect(log.error).toHaveBeenCalled();
  });
});
