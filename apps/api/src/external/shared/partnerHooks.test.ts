import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";
import Fastify, { type FastifyInstance, type FastifyRequest } from "fastify";

vi.mock("../../utils/prisma.js", () => ({ default: {} }));
vi.mock("../../utils/redisConnection.js", () => ({ default: {} }));
vi.mock("../../utils/logger.js", () => ({
  log: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), trace: vi.fn(), debug: vi.fn() },
}));
vi.mock("../../modules/org/orgSuspension.js", () => ({
  isOrgSuspended: vi.fn(),
  ORG_SUSPENDED_MESSAGE: "This account is suspended",
}));
const usageOnResponse = vi.fn(async () => {});
vi.mock("../../modules/apiAccessToken/apiUsage.js", () => ({
  apiUsageOnResponse: vi.fn(() => usageOnResponse),
  flushApiUsage: vi.fn(async () => {}),
}));
vi.mock("./rateLimit.js", () => ({ externalRateLimit: vi.fn(() => async () => {}) }));
vi.mock("./idempotency.js", () => ({
  documentIdempotencyHeader: vi.fn(),
  idempotencyPreHandler: vi.fn(async () => {}),
  idempotencyOnSend: vi.fn(async (_req: unknown, _rep: unknown, payload: unknown) => payload),
}));
vi.mock("./scopes.js", () => ({
  requireScope: vi.fn(),
  refuseTestKeyOnPaidRoute: vi.fn(),
}));

import { isOrgSuspended } from "../../modules/org/orgSuspension.js";
import { apiUsageOnResponse, flushApiUsage } from "../../modules/apiAccessToken/apiUsage.js";
import { refuseTestKeyOnPaidRoute, requireScope } from "./scopes.js";
import { idempotencyPreHandler } from "./idempotency.js";
import { ExternalApiError } from "./errors.js";
import { externalRateLimit } from "./rateLimit.js";
import { registerPartnerHooks } from "./partnerHooks.js";

type Mock = ReturnType<typeof vi.fn>;
const suspended = isOrgSuspended as unknown as Mock;

const PREFIX = "/api/external/v9";
const ORG = "11111111-1111-1111-1111-111111111111";

let app: FastifyInstance;
let calls: string[];
type Authenticate = (request: FastifyRequest) => Promise<{ suspended: boolean | null }>;
let authenticate: ReturnType<typeof vi.fn<Authenticate>>;

async function build(result: { suspended: boolean | null } = { suspended: null }) {
  calls = [];
  authenticate = vi.fn<Authenticate>(async (request) => {
    calls.push("authenticate");
    request.user = { orgId: ORG } as FastifyRequest["user"];
    return result;
  });
  app = Fastify();
  await app.register(
    async (root) => {
      registerPartnerHooks(root, { prefix: PREFIX, authenticate });
      root.get("/things", async () => {
        calls.push("handler");
        return { ok: true };
      });
    },
    { prefix: PREFIX },
  );
  await app.ready();
}

beforeEach(() => {
  vi.clearAllMocks();
  suspended.mockResolvedValue(false);
  (requireScope as unknown as Mock).mockImplementation(() => calls.push("requireScope"));
  (refuseTestKeyOnPaidRoute as unknown as Mock).mockImplementation(() =>
    calls.push("refuseTestKey"),
  );
});

afterEach(async () => {
  await app?.close();
});

describe("registerPartnerHooks", () => {
  test("a suspension flag the key check did not know is asked of isOrgSuspended", async () => {
    await build({ suspended: null });

    const res = await app.inject({ method: "GET", url: `${PREFIX}/things` });

    expect(res.statusCode).toBe(200);
    expect(suspended).toHaveBeenCalledOnce();
    expect(suspended).toHaveBeenCalledWith(ORG);
  });

  test("a flag the key check already read is trusted, with no second lookup", async () => {
    await build({ suspended: false });

    const res = await app.inject({ method: "GET", url: `${PREFIX}/things` });

    expect(res.statusCode).toBe(200);
    expect(suspended).not.toHaveBeenCalled();
  });

  test.each([
    ["from the key check", { suspended: true }, false],
    ["from isOrgSuspended", { suspended: null }, true],
  ])("a suspended org answers 403 org_suspended (%s)", async (_label, result, lookup) => {
    suspended.mockResolvedValue(lookup);
    await build(result);

    const res = await app.inject({ method: "GET", url: `${PREFIX}/things` });

    expect(res.statusCode).toBe(403);
    expect(res.json().error).toMatchObject({
      code: "org_suspended",
      message: "This account is suspended",
    });
    expect(calls).not.toContain("handler");
    expect(requireScope).not.toHaveBeenCalled();
    expect(idempotencyPreHandler).not.toHaveBeenCalled();
  });

  test("the scope checks run after the key is authenticated, before the handler", async () => {
    await build();

    await app.inject({ method: "GET", url: `${PREFIX}/things` });

    expect(calls).toEqual(["authenticate", "requireScope", "refuseTestKey", "handler"]);
  });

  test("a refused key stops the request in the partner error envelope", async () => {
    await build();
    authenticate.mockRejectedValueOnce(new ExternalApiError(401, "unauthorized", "Invalid key"));

    const res = await app.inject({ method: "GET", url: `${PREFIX}/things` });

    expect(res.statusCode).toBe(401);
    expect(res.json().error).toMatchObject({ code: "unauthorized", message: "Invalid key" });
    expect(requireScope).not.toHaveBeenCalled();
    expect(calls).not.toContain("handler");
  });

  test("a scope refusal stops the request before the handler", async () => {
    await build();
    (requireScope as unknown as Mock).mockImplementationOnce(() => {
      throw new ExternalApiError(403, "insufficient_scope", "Missing scope");
    });

    const res = await app.inject({ method: "GET", url: `${PREFIX}/things` });

    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe("insufficient_scope");
    expect(calls).not.toContain("handler");
  });

  test("the usage log is registered on response for the version's prefix, and flushed on close", async () => {
    await build();

    await app.inject({ method: "GET", url: `${PREFIX}/things` });

    expect(apiUsageOnResponse).toHaveBeenCalledWith(PREFIX);
    expect(usageOnResponse).toHaveBeenCalledOnce();
    await app.close();
    expect(flushApiUsage).toHaveBeenCalled();
  });
});

describe("rate limits", () => {
  const limiterOptions = () =>
    Object.fromEntries(
      (externalRateLimit as unknown as Mock).mock.calls.map(([o]) => [o.key, o]),
    ) as Record<string, any>;

  test("the pre-auth per-address limiter fails closed and reads the safe client address", async () => {
    await build();

    const ip = limiterOptions().externalIp;
    expect(ip.failClosed).toBe(true);
    // Not the left-most X-Forwarded-For entry: a spoofed header keeps the same bucket.
    expect(ip.keyFrom({ ip: "203.0.113.4", headers: { "x-forwarded-for": "10.0.0.1" } })).toBe(
      "203.0.113.4",
    );
  });

  test("a per-key bucket sits beside the per-org one", async () => {
    await build();

    const { externalOrg, externalKey } = limiterOptions();
    expect(externalOrg).toBeDefined();
    expect(externalKey.keyFrom({ apiKey: { id: "key-1" } })).toBe("key-1");
    expect(externalKey.max).toBeLessThan(externalOrg.max);
  });
});
