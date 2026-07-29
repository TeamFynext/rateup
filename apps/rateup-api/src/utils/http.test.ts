import { describe, expect, test } from "vitest";
import { getCookieValue, getIp } from "./http.js";

function request(overrides: Record<string, unknown> = {}) {
  return { ip: "10.0.0.1", headers: {}, ...overrides } as any;
}

describe("getIp", () => {
  test("uses the socket address when there is no proxy header", () => {
    expect(getIp(request())).toBe("10.0.0.1");
  });

  test("prefers the originating client from x-forwarded-for", () => {
    expect(getIp(request({ headers: { "x-forwarded-for": "203.0.113.5" } }))).toBe("203.0.113.5");
  });

  test("takes the first hop when the header lists a proxy chain", () => {
    expect(
      getIp(
        request({ headers: { "x-forwarded-for": "203.0.113.5, 70.41.3.18, 150.172.238.178" } }),
      ),
    ).toBe("203.0.113.5");
  });

  test("trims the whitespace around the address", () => {
    expect(getIp(request({ headers: { "x-forwarded-for": "  203.0.113.5 , 70.41.3.18" } }))).toBe(
      "203.0.113.5",
    );
  });

  test("falls back to the socket address for an empty header", () => {
    expect(getIp(request({ headers: { "x-forwarded-for": "" } }))).toBe("10.0.0.1");
  });
});

describe("getCookieValue", () => {
  test("reads the named cookie", () => {
    expect(getCookieValue("sAccessToken", "sAccessToken=abc123")).toBe("abc123");
  });

  test("picks the right cookie out of several", () => {
    expect(getCookieValue("theme", "sAccessToken=abc123; theme=dark; locale=en")).toBe("dark");
  });

  test("tolerates the space after each semicolon", () => {
    expect(getCookieValue("locale", "a=1;   locale=en")).toBe("en");
  });

  test("returns undefined when the cookie is absent", () => {
    expect(getCookieValue("missing", "a=1; b=2")).toBeUndefined();
  });

  test.each([
    ["an empty cookie header", ""],
    ["a missing cookie header", undefined],
    ["a null cookie header", null],
  ])("returns undefined for %s", (_name, cookie) => {
    expect(getCookieValue("a", cookie as any)).toBeUndefined();
  });

  test("matches the name exactly rather than by prefix", () => {
    expect(getCookieValue("token", "tokenExtra=nope")).toBeUndefined();
  });

  test("returns an empty string for a cookie set to nothing", () => {
    expect(getCookieValue("a", "a=")).toBe("");
  });
});
