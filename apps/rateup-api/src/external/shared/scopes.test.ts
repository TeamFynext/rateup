import { beforeEach, describe, expect, test, vi } from "vitest";

// actor.ts reaches for Postgres and Redis for session actors; API-key actors never do.
vi.mock("../../utils/prisma.js", () => ({ default: {} }));
vi.mock("../../utils/redisConnection.js", () => ({ default: {} }));
vi.mock("../../utils/logger.js", () => ({
  log: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), trace: vi.fn(), debug: vi.fn() },
}));

import { buildActor } from "../../authz/actor.js";
import { PERMISSIONS, type Permission } from "../../authz/permissions.js";
import { ExternalApiError } from "./errors.js";
import { declareExternalScopes, refuseTestKeyOnPaidRoute, requireScope } from "./scopes.js";

const ORG = "11111111-1111-1111-1111-111111111111";

function captureOnRoute() {
  let hook: ((route: any) => void) | undefined;
  const server: any = {
    addHook: vi.fn((name: string, fn: (route: any) => void) => {
      if (name === "onRoute") hook = fn;
    }),
  };
  declareExternalScopes(server, { read: "contacts.read", write: "contacts.manage" });
  return (route: Record<string, unknown>) => {
    hook!(route);
    return route as { config: Record<string, unknown> };
  };
}

function keyActor(scopes: Permission[]) {
  return buildActor({ kind: "apiKey", orgId: ORG, scopes });
}

function req(config: Record<string, unknown> | undefined, scopes: Permission[] | null = []) {
  return {
    routeOptions: { config },
    actor: scopes === null ? undefined : keyActor(scopes),
  } as any;
}

function thrown(fn: () => void): ExternalApiError {
  try {
    fn();
  } catch (e) {
    return e as ExternalApiError;
  }
  throw new Error("expected a throw");
}

describe("declareExternalScopes", () => {
  let onRoute: ReturnType<typeof captureOnRoute>;
  beforeEach(() => {
    onRoute = captureOnRoute();
  });

  test.each(["GET", "HEAD", ["GET", "HEAD"]])("%s takes the read default", (method) => {
    expect(onRoute({ method, url: "/" }).config.permission).toBe("contacts.read");
  });

  test.each(["POST", "PUT", "PATCH", "DELETE", ["GET", "POST"]])(
    "%s takes the write default",
    (method) => {
      expect(onRoute({ method, url: "/" }).config.permission).toBe("contacts.manage");
    },
  );

  test("a route's own permission wins", () => {
    const route = onRoute({
      method: "POST",
      url: "/send",
      config: { permission: "campaigns.send" },
    });

    expect(route.config.permission).toBe("campaigns.send");
  });

  test("access is always token, even when the route declared its own permission", () => {
    expect(onRoute({ method: "GET", url: "/" }).config.access).toBe("token");
    expect(
      onRoute({ method: "POST", url: "/", config: { permission: "inbox.reply" } }).config.access,
    ).toBe("token");
  });

  test("other config on the route is left alone", () => {
    const route = onRoute({
      method: "POST",
      url: "/",
      config: { paid: true },
    });

    expect(route.config).toEqual({
      paid: true,
      access: "token",
      permission: "contacts.manage",
    });
  });
});

describe("requireScope", () => {
  test("a key holding the route's permission passes", () => {
    expect(() =>
      requireScope(req({ permission: "contacts.read" }, ["contacts.read"])),
    ).not.toThrow();
  });

  test("any one of a list of permissions is enough", () => {
    expect(() =>
      requireScope(req({ permission: ["inbox.reply", "campaigns.send"] }, ["campaigns.send"])),
    ).not.toThrow();
  });

  test("a key without it is refused 403 insufficient_scope, naming the permission", () => {
    const err = thrown(() =>
      requireScope(req({ permission: "campaigns.send" }, ["contacts.read"])),
    );

    expect(err).toBeInstanceOf(ExternalApiError);
    expect(err).toMatchObject({
      status: 403,
      code: "insufficient_scope",
      details: { permission: "campaigns.send" },
    });
    expect(err.message).toContain("campaigns.send");
  });

  test("a read-scoped key cannot write", () => {
    expect(() => requireScope(req({ permission: "contacts.manage" }, ["contacts.read"]))).toThrow(
      ExternalApiError,
    );
  });

  test.each([
    ["no config", undefined],
    ["no permission", {}],
    ["an empty permission list", { permission: [] }],
  ])("fails closed on a route with %s, even for a full-access key", (_label, config) => {
    const err = thrown(() => requireScope(req(config, [])));

    expect(err).toMatchObject({
      status: 403,
      code: "insufficient_scope",
      details: { permission: null },
    });
  });

  test("fails closed when no actor was set", () => {
    const err = thrown(() => requireScope(req({ permission: "contacts.read" }, null)));

    expect(err).toMatchObject({ status: 403, code: "insufficient_scope" });
  });

  test("a legacy key with no scopes holds every permission", () => {
    const actor = keyActor([]);

    for (const p of PERMISSIONS) expect(actor.can(p), p).toBe(true);
    expect(() => requireScope(req({ permission: "campaigns.send" }, []))).not.toThrow();
  });

  test("a scoped key holds exactly its scopes", () => {
    const actor = keyActor(["loyalty.read"]);

    expect(PERMISSIONS.filter((p) => actor.can(p))).toEqual(["loyalty.read"]);
  });
});

describe("refuseTestKeyOnPaidRoute", () => {
  const paidReq = (paid: boolean | undefined, mode?: "live" | "test") =>
    ({ routeOptions: { config: { paid } }, apiKey: mode ? { id: "k", mode } : undefined }) as any;

  test("a test key on a paid route is refused 403 test_key_not_allowed", () => {
    expect(thrown(() => refuseTestKeyOnPaidRoute(paidReq(true, "test")))).toMatchObject({
      status: 403,
      code: "test_key_not_allowed",
    });
  });

  test("a live key on a paid route passes", () => {
    expect(() => refuseTestKeyOnPaidRoute(paidReq(true, "live"))).not.toThrow();
  });

  test("a test key on an unpaid route passes", () => {
    expect(() => refuseTestKeyOnPaidRoute(paidReq(undefined, "test"))).not.toThrow();
    expect(() => refuseTestKeyOnPaidRoute(paidReq(false, "test"))).not.toThrow();
  });

  test("a request with no config at all passes", () => {
    expect(() =>
      refuseTestKeyOnPaidRoute({ routeOptions: {}, apiKey: { id: "k", mode: "test" } } as any),
    ).not.toThrow();
  });
});
