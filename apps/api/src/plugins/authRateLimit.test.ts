import { describe, expect, test, vi } from "vitest";

vi.mock("../config.js", () => ({ SuperTokensConfig: {} }));
vi.mock("./swagger.js", () => ({ registerSwagger: vi.fn() }));
vi.mock("./kafka.js", () => ({ registerKafka: vi.fn() }));
vi.mock("supertokens-node", () => ({ default: { init: vi.fn(), getAllCORSHeaders: () => [] } }));
vi.mock("supertokens-node/framework/fastify/index.js", () => ({
  plugin: vi.fn(),
  errorHandler: vi.fn(),
}));
// Each limiter records its options and refuses when told to.
vi.mock("../utils/rateLimit.js", () => ({
  rateLimit: vi.fn((opts) =>
    Object.assign(
      vi.fn(async (_request, reply) => {
        if (opts.key === "refuse") reply.sent = true;
      }),
      { opts },
    ),
  ),
}));

import { authLimitersFor, authRateLimitHook } from "./index.js";

const keys = (method: string, url: string) =>
  authLimitersFor(method, url).map((l) => (l as unknown as { opts: { key: string } }).opts);

describe("SuperTokens auth rate limits", () => {
  test("sign-up is limited per IP and per email, failing closed", () => {
    const opts = keys("POST", "/api/auth/signup");
    expect(opts.map((o) => o.key)).toEqual(["auth:signup", "auth:signup:email"]);
    expect(opts.every((o: any) => o.failClosed)).toBe(true);
  });

  test("SMS code creation is limited per IP and per phone, failing closed", () => {
    const opts = keys("POST", "/api/auth/signinup/code?x=1");
    expect(opts.map((o) => o.key)).toContain("auth:smsCode:phone");
    expect(opts.every((o: any) => o.failClosed)).toBe(true);
  });

  test("sign-in, code consume and password reset are limited", () => {
    expect(keys("POST", "/api/auth/signin")).toHaveLength(2);
    expect(keys("POST", "/api/auth/signinup/code/consume")).toHaveLength(1);
    expect(keys("POST", "/api/auth/user/password/reset/token")).toHaveLength(2);
    expect(keys("POST", "/api/auth/user/password/reset")).toHaveLength(1);
  });

  test("the per-email key reads SuperTokens' formFields, normalised", () => {
    const [, perEmail] = keys("POST", "/api/auth/signup") as any[];
    const email = perEmail.keyFrom({
      body: { formFields: [{ id: "email", value: " Owner@Acme.com " }] },
    });
    expect(email).toBe("owner@acme.com");
  });

  test("other routes are untouched", () => {
    expect(authLimitersFor("POST", "/api/user/info")).toEqual([]);
    expect(authLimitersFor("GET", "/api/auth/signup")).toEqual([]);
  });

  test("the hook stops at the first limiter that answers", async () => {
    const reply: any = { sent: false };
    await authRateLimitHook({ method: "POST", url: "/api/auth/signin" } as never, reply);
    expect(reply.sent).toBe(false);
  });
});
