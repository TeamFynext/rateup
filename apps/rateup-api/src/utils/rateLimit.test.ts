import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("./redisConnection.js", () => ({
  default: { eval: vi.fn() },
}));
vi.mock("./logger.js", () => ({
  log: { error: vi.fn(), fatal: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}));

import connection from "./redisConnection.js";
import { rateLimit } from "./rateLimit.js";

type Mock = ReturnType<typeof vi.fn>;

const redis = connection as unknown as { eval: Mock };
/** The bucket each check counted against, in order. */
const buckets = () => redis.eval.mock.calls.map((c) => c[2]);

function request(ip = "203.0.113.4"): any {
  return { ip };
}

function reply() {
  const rep: any = { status: vi.fn(() => rep), send: vi.fn(() => rep) };
  return rep;
}

const limiter = rateLimit({ max: 3, windowSeconds: 60, key: "demo" });

beforeEach(() => {
  vi.clearAllMocks();
  redis.eval.mockResolvedValue(1);
});

describe("rateLimit", () => {
  test("counts each request against the caller's own address", async () => {
    await limiter(request("198.51.100.7"), reply());

    expect(buckets()).toEqual(["ratelimit:demo:198.51.100.7"]);
  });

  test("increments and starts the window in one round trip", async () => {
    await limiter(request(), reply());

    expect(redis.eval).toHaveBeenCalledTimes(1);
    expect(redis.eval).toHaveBeenCalledWith(
      expect.any(String),
      1,
      "ratelimit:demo:203.0.113.4",
      60,
    );
  });

  // A later request must not push the expiry out, or a caller sending steadily
  // would hold the key alive forever and never see the window reset.
  test("the script sets the expiry only on the window's first request", async () => {
    await limiter(request(), reply());

    const script = redis.eval.mock.calls[0][0] as string;
    expect(script).toMatch(/if count == 1 then redis\.call\("EXPIRE"/);
  });

  test("lets a request through while the caller is under the limit", async () => {
    redis.eval.mockResolvedValue(3);
    const rep = reply();

    await limiter(request(), rep);

    expect(rep.status).not.toHaveBeenCalled();
  });

  test("answers 429 once the caller is over the limit", async () => {
    redis.eval.mockResolvedValue(4);
    const rep = reply();

    await limiter(request(), rep);

    expect(rep.status).toHaveBeenCalledWith(429);
    expect(rep.send.mock.calls[0][0]).toMatchObject({ success: false });
  });

  test("counts two addresses separately", async () => {
    await limiter(request("198.51.100.7"), reply());
    await limiter(request("203.0.113.4"), reply());

    expect(buckets()).toEqual(["ratelimit:demo:198.51.100.7", "ratelimit:demo:203.0.113.4"]);
  });

  // A limiter that rejects everything when its own backing store is down turns a
  // Redis outage into an outage of every public form — worse than what it defends
  // against.
  test("lets the request through when Redis cannot be reached", async () => {
    redis.eval.mockRejectedValue(new Error("redis is down"));
    const rep = reply();

    await limiter(request(), rep);

    expect(rep.status).not.toHaveBeenCalled();
  });

  // request.ip is what Fastify resolved, honouring its own trustProxy setting.
  // Reading x-forwarded-for here instead would let a caller pick their own bucket
  // and sidestep the limit entirely.
  test("buckets a caller with no resolvable address together", async () => {
    await limiter({ ip: undefined } as any, reply());

    expect(buckets()).toContain("ratelimit:demo:unknown");
  });
});

describe("rateLimit — keyed on something other than the address", () => {
  const byOrg = rateLimit<any>({
    max: 3,
    windowSeconds: 60,
    key: "signupOrg",
    keyFrom: (req) => req.body?.orgId,
  });

  test("buckets on the derived key", async () => {
    await byOrg({ ip: "198.51.100.7", body: { orgId: "org-1" } }, reply());

    expect(buckets()).toContain("ratelimit:signupOrg:org-1");
  });

  test("skips the limiter entirely when the key cannot be derived", async () => {
    const rep = reply();

    await byOrg({ ip: "198.51.100.7", body: {} }, rep);

    expect(redis.eval).not.toHaveBeenCalled();
    expect(rep.status).not.toHaveBeenCalled();
  });
});

describe("rateLimit — when Redis is down", () => {
  const closed = rateLimit({ max: 3, windowSeconds: 60, key: "signup", failClosed: true });

  afterEach(() => {
    delete process.env.RATE_LIMIT_FAIL_CLOSED_DISABLED;
  });

  test("a fail-closed limiter refuses with a 503 instead of letting the burst through", async () => {
    redis.eval.mockRejectedValue(new Error("redis is down"));
    const rep = reply();

    await closed(request(), rep);

    expect(rep.status).toHaveBeenCalledWith(503);
    expect(rep.send.mock.calls[0][0]).toMatchObject({ success: false });
  });

  test("the emergency override turns a fail-closed limiter back into fail-open", async () => {
    process.env.RATE_LIMIT_FAIL_CLOSED_DISABLED = "true";
    redis.eval.mockRejectedValue(new Error("redis is down"));
    const rep = reply();

    await closed(request(), rep);

    expect(rep.status).not.toHaveBeenCalled();
  });
});

describe("visitors forwarded by rateup-ui's server", () => {
  const ssr = (headers: Record<string, string>): any => ({ ip: "10.0.0.9", headers });

  beforeEach(() => vi.stubEnv("SSR_SHARED_SECRET", "s3cret-value"));
  afterEach(() => vi.unstubAllEnvs());

  test("each visitor gets their own bucket when the secret matches", async () => {
    await limiter(
      ssr({ "x-rateup-ssr-secret": "s3cret-value", "x-rateup-client-ip": "198.51.100.20" }),
      reply(),
    );

    expect(buckets()).toEqual(["ratelimit:demo:198.51.100.20"]);
  });

  test("a wrong secret, a malformed address or no secret configured falls back to the caller", async () => {
    await limiter(
      ssr({ "x-rateup-ssr-secret": "guess-value!", "x-rateup-client-ip": "198.51.100.20" }),
      reply(),
    );
    await limiter(
      ssr({ "x-rateup-ssr-secret": "s3cret-value", "x-rateup-client-ip": "not-an-ip" }),
      reply(),
    );
    vi.stubEnv("SSR_SHARED_SECRET", "");
    await limiter(
      ssr({ "x-rateup-ssr-secret": "", "x-rateup-client-ip": "198.51.100.20" }),
      reply(),
    );

    expect(buckets()).toEqual([
      "ratelimit:demo:10.0.0.9",
      "ratelimit:demo:10.0.0.9",
      "ratelimit:demo:10.0.0.9",
    ]);
  });
});
