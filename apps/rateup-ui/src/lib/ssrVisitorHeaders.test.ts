import { describe, expect, test } from "vitest";

import { visitorIp } from "./ssrVisitorHeaders.ts";

describe("the visitor's address on the server", () => {
  test("is the entry the edge appended, not one the visitor wrote", () => {
    expect(visitorIp("6.6.6.6, 203.0.113.9", "10.0.0.1", "1")).toBe("203.0.113.9");
    expect(visitorIp("203.0.113.9", "10.0.0.1", undefined)).toBe("203.0.113.9");
  });

  test("counts further back when more proxies are trusted", () => {
    expect(visitorIp("6.6.6.6, 203.0.113.9, 198.51.100.7", "10.0.0.1", "2")).toBe("203.0.113.9");
  });

  test("falls back to the socket when nothing was forwarded or no proxy is trusted", () => {
    expect(visitorIp(undefined, "10.0.0.1", "1")).toBe("10.0.0.1");
    expect(visitorIp("6.6.6.6", "10.0.0.1", "0")).toBe("10.0.0.1");
  });
});
