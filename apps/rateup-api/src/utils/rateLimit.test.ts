import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("./redisConnection.js", () => ({
  default: { incr: vi.fn(), expire: vi.fn() },
}));
vi.mock("./logger.js", () => ({
  log: { error: vi.fn(), fatal: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}));

import connection from "./redisConnection.js";
import { rateLimit } from "./rateLimit.js";

type Mock = ReturnType<typeof vi.fn>;

const redis = connection as unknown as { incr: Mock; expire: Mock };

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
  redis.incr.mockResolvedValue(1);
  redis.expire.mockResolvedValue(1);
});

describe("rateLimit", () => {
  test("counts each request against the caller's own address", async () => {
    await limiter(request("198.51.100.7"), reply());

    expect(redis.incr).toHaveBeenCalledWith("ratelimit:demo:198.51.100.7");
  });

  test("starts the window on the first request of the window", async () => {
    await limiter(request(), reply());

    expect(redis.expire).toHaveBeenCalledWith("ratelimit:demo:203.0.113.4", 60);
  });

  // A later request must not push the expiry out, or a caller sending steadily
  // would hold the key alive forever and never see the window reset.
  test("does not extend the window on later requests", async () => {
    redis.incr.mockResolvedValue(2);

    await limiter(request(), reply());

    expect(redis.expire).not.toHaveBeenCalled();
  });

  test("lets a request through while the caller is under the limit", async () => {
    redis.incr.mockResolvedValue(3);
    const rep = reply();

    await limiter(request(), rep);

    expect(rep.status).not.toHaveBeenCalled();
  });

  test("answers 429 once the caller is over the limit", async () => {
    redis.incr.mockResolvedValue(4);
    const rep = reply();

    await limiter(request(), rep);

    expect(rep.status).toHaveBeenCalledWith(429);
    expect(rep.send.mock.calls[0][0]).toMatchObject({ success: false });
  });

  test("counts two addresses separately", async () => {
    await limiter(request("198.51.100.7"), reply());
    await limiter(request("203.0.113.4"), reply());

    expect(redis.incr.mock.calls.map((c) => c[0])).toEqual([
      "ratelimit:demo:198.51.100.7",
      "ratelimit:demo:203.0.113.4",
    ]);
  });

  // A limiter that rejects everything when its own backing store is down turns a
  // Redis outage into an outage of every public form — worse than what it defends
  // against.
  test("lets the request through when Redis cannot be reached", async () => {
    redis.incr.mockRejectedValue(new Error("redis is down"));
    const rep = reply();

    await limiter(request(), rep);

    expect(rep.status).not.toHaveBeenCalled();
  });

  // request.ip is what Fastify resolved, honouring its own trustProxy setting.
  // Reading x-forwarded-for here instead would let a caller pick their own bucket
  // and sidestep the limit entirely.
  test("buckets a caller with no resolvable address together", async () => {
    await limiter({ ip: undefined } as any, reply());

    expect(redis.incr).toHaveBeenCalledWith("ratelimit:demo:unknown");
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

    expect(redis.incr).toHaveBeenCalledWith("ratelimit:signupOrg:org-1");
  });

  test("skips the limiter entirely when the key cannot be derived", async () => {
    const rep = reply();

    await byOrg({ ip: "198.51.100.7", body: {} }, rep);

    expect(redis.incr).not.toHaveBeenCalled();
    expect(rep.status).not.toHaveBeenCalled();
  });
});

describe("rateLimit — when Redis is down", () => {
  const closed = rateLimit({ max: 3, windowSeconds: 60, key: "signup", failClosed: true });

  afterEach(() => {
    delete process.env.RATE_LIMIT_FAIL_CLOSED_DISABLED;
  });

  test("a fail-closed limiter refuses with a 503 instead of letting the burst through", async () => {
    redis.incr.mockRejectedValue(new Error("redis is down"));
    const rep = reply();

    await closed(request(), rep);

    expect(rep.status).toHaveBeenCalledWith(503);
    expect(rep.send.mock.calls[0][0]).toMatchObject({ success: false });
  });

  test("the emergency override turns a fail-closed limiter back into fail-open", async () => {
    process.env.RATE_LIMIT_FAIL_CLOSED_DISABLED = "true";
    redis.incr.mockRejectedValue(new Error("redis is down"));
    const rep = reply();

    await closed(request(), rep);

    expect(rep.status).not.toHaveBeenCalled();
  });
});
