import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, describe, expect, test } from "vite-plus/test";
import { clientIp, getCookieValue, getIp, trustProxyHops, trustProxySetting } from "./http.js";

function request(overrides: Record<string, unknown> = {}) {
  return { ip: "10.0.0.1", headers: {}, ...overrides } as any;
}

describe("clientIp", () => {
  test("uses the address Fastify resolved when there is no Cloudflare header", () => {
    expect(clientIp(request())).toBe("10.0.0.1");
  });

  test("never reads the client-written left-most x-forwarded-for entry", () => {
    expect(clientIp(request({ headers: { "x-forwarded-for": "203.0.113.5, 70.41.3.18" } }))).toBe(
      "10.0.0.1",
    );
  });

  test("prefers CF-Connecting-IP, which Cloudflare overwrites", () => {
    expect(clientIp(request({ headers: { "cf-connecting-ip": " 198.51.100.7 " } }))).toBe(
      "198.51.100.7",
    );
    expect(clientIp(request({ headers: { "cf-connecting-ip": "2001:db8::1" } }))).toBe(
      "2001:db8::1",
    );
  });

  test("ignores a CF-Connecting-IP that is not an address", () => {
    expect(clientIp(request({ headers: { "cf-connecting-ip": "evil, 1.2.3.4" } }))).toBe(
      "10.0.0.1",
    );
  });

  test("getIp is the same function under its old name", () => {
    const req = request({ headers: { "x-forwarded-for": "203.0.113.5" } });
    expect(getIp(req)).toBe(clientIp(req));
  });
});

describe("trustProxyHops", () => {
  test("defaults to Cloudflare → Railway, two hops", () => {
    expect(trustProxyHops(undefined)).toBe(2);
    expect(trustProxyHops("")).toBe(2);
    expect(trustProxyHops("nope")).toBe(2);
    expect(trustProxyHops("-1")).toBe(2);
  });

  test("takes an explicit count, and 0 trusts no proxy header", () => {
    expect(trustProxyHops("1")).toBe(1);
    expect(trustProxySetting("0")).toBe(false);
    const trust = trustProxySetting("3");
    expect(trust && trust("10.0.0.1", 2)).toBe(true);
    expect(trust && trust("10.0.0.1", 3)).toBe(false);
  });
});

describe("request.ip under the hop count", () => {
  let app: FastifyInstance | undefined;
  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  async function ipFor(xff: string) {
    const server = Fastify({ trustProxy: trustProxySetting(undefined) });
    app = server;
    server.get("/", async (req) => ({ ip: clientIp(req) }));
    const res = await server.inject({
      method: "GET",
      url: "/",
      headers: { "x-forwarded-for": xff },
    });
    await server.close();
    app = undefined;
    return res.json().ip as string;
  }

  test("a spoofed left-most entry does not change the resolved client", async () => {
    // client → Cloudflare (appends the client) → Railway edge (appends Cloudflare) → socket.
    const honest = await ipFor("203.0.113.5, 172.68.1.1");
    const spoofed = await ipFor("10.9.9.9, 203.0.113.5, 172.68.1.1");
    expect(honest).toBe("203.0.113.5");
    expect(spoofed).toBe("203.0.113.5");
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
