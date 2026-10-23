import { documentIdempotencyHeader } from "../shared/idempotency.js";
import { beforeAll, describe, expect, test, vi } from "vitest";
import Fastify, { type FastifyInstance, type RouteOptions } from "fastify";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";

/**
 * The partner API's registry check: every route every module registers is declared the way
 * the v2 root expects (scopes.ts, idempotency.ts, errors.ts). Nothing is called — routes are
 * captured as they register — so the mocks below only have to let the modules import.
 */

// Any property, at any depth, is a function returning another such thing (and awaiting one
// gives it back). Lets a module that touches Prisma or Redis at import time load without
// either — `redis.duplicate().on(...)`, for one.
function anything(): any {
  const fn = vi.fn((): any => anything());
  return new Proxy(fn, {
    get: (target, prop) => {
      if (prop === "then") return undefined;
      if (prop in target) return (target as any)[prop];
      return ((target as any)[prop] = anything());
    },
  });
}

vi.mock("../../utils/prisma.js", () => ({ default: anything(), excludeFields: vi.fn() }));
vi.mock("../../utils/redisConnection.js", () => ({ default: anything() }));
// Queues are constructed at module scope all over; none should open a Redis connection here.
vi.mock("bullmq", async (importOriginal) => {
  const actual = await importOriginal<typeof import("bullmq")>();
  const stub = function () {
    return anything();
  };
  return { ...actual, Queue: stub, QueueEvents: stub, FlowProducer: stub, Worker: stub };
});
vi.mock("../../utils/logger.js", () => ({
  log: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), trace: vi.fn(), debug: vi.fn() },
}));

import { PERMISSIONS } from "../../authz/permissions.js";
import { buildActor } from "../../authz/actor.js";
import { permissionsForFeatures } from "../../authz/apiKeyFeatures.js";
import { requireScope } from "../shared/scopes.js";
import { externalErrorResponses } from "../shared/errors.js";
import { externalSurveyRoutes } from "./surveys/surveys.route.js";
import { externalContactRoutes } from "./contacts/contacts.route.js";
import { externalContactGroupRoutes } from "./contact-groups/contactGroups.route.js";
import { externalTeamRoutes } from "./teams/teams.route.js";
import { externalCampaignRoutes } from "./campaigns/campaigns.route.js";
import { externalWaTemplateRoutes } from "./wa-templates/waTemplates.route.js";
import { externalLoyaltyRoutes } from "./loyalty/loyalty.route.js";
import { EXTERNAL_V2_PREFIX } from "./index.js";

/** As `externalV2Routes` in index.ts mounts them. */
const MODULES: [string, (server: FastifyInstance) => Promise<void>][] = [
  ["/surveys", externalSurveyRoutes],
  ["/contacts", externalContactRoutes],
  ["/contact-groups", externalContactGroupRoutes],
  ["/teams", externalTeamRoutes],
  ["/campaigns", externalCampaignRoutes],
  ["/wa/templates", externalWaTemplateRoutes],
  ["/loyalty", externalLoyaltyRoutes],
];

const ROOT = EXTERNAL_V2_PREFIX;
const ALL_PERMISSIONS = new Set<string>(PERMISSIONS);
const ERROR_STATUSES = Object.keys(externalErrorResponses);

const routes: RouteOptions[] = [];

beforeAll(async () => {
  const app = Fastify();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  // A root hook sees every route first; the modules' own hooks fill the same object after,
  // so the routes are judged once the app is ready.
  app.addHook("onRoute", (route) => {
    routes.push(route);
  });
  await app.register(
    async (v2) => {
      // What registerPartnerHooks installs for route options; its request hooks are not needed.
      v2.addHook("onRoute", documentIdempotencyHeader);
      for (const [prefix, plugin] of MODULES) await v2.register(plugin, { prefix });
    },
    { prefix: ROOT },
  );
  await app.ready();
  await app.close();
});

/** Fastify adds a HEAD for every GET; it shares the GET's options. */
const own = () => routes.filter((r) => r.method !== "HEAD");
const methods = (r: RouteOptions) => (Array.isArray(r.method) ? r.method : [r.method]);
const name = (r: RouteOptions) => `${methods(r).join("|")} ${r.url}`;
const each = (check: (r: RouteOptions) => void) => {
  const failures: string[] = [];
  for (const r of own()) {
    try {
      check(r);
    } catch (e) {
      failures.push(`${name(r)}: ${(e as Error).message.split("\n")[0]}`);
    }
  }
  expect(failures).toEqual([]);
};

describe("partner API route registry", () => {
  test("every module registered routes", () => {
    for (const [prefix] of MODULES) {
      expect(
        own().some((r) => r.url.startsWith(`${ROOT}${prefix}`)),
        prefix,
      ).toBe(true);
    }
  });

  test("no route names an org in its URL; the key does", () => {
    each((r) => expect(r.url).not.toMatch(/:orgId\b/));
  });

  test("every route declares a permission, and every permission exists", () => {
    each((r) => {
      const permission = r.config?.permission;
      expect(permission, "config.permission").toBeTruthy();
      const list = Array.isArray(permission) ? permission : [permission];
      expect(list.length, "permission list").toBeGreaterThan(0);
      for (const p of list)
        expect(ALL_PERMISSIONS.has(p as string), `${p} in PERMISSIONS`).toBe(true);
    });
  });

  test('every route is access "token"', () => {
    each((r) => expect(r.config?.access).toBe("token"));
  });

  test("every route documents a 2xx answer and every external error status", () => {
    each((r) => {
      const response = (r.schema?.response ?? undefined) as Record<string, unknown> | undefined;
      expect(response, "schema.response").toBeTruthy();
      const statuses = Object.keys(response!);
      expect(
        statuses.some((s) => /^2\d\d$/.test(s) || s === "2xx"),
        "a 2xx entry",
      ).toBe(true);
      for (const s of ERROR_STATUSES) expect(statuses, `status ${s}`).toContain(s);
    });
  });

  test("every write lists an optional Idempotency-Key, with its format", () => {
    const writes = routes.filter((r) => methods(r).some((m) => !["GET", "HEAD"].includes(m)));
    expect(writes.length).toBeGreaterThan(0);
    for (const r of writes) {
      const headers = r.schema?.headers as { shape?: Record<string, { safeParse: Function }> };
      const key = headers?.shape?.["idempotency-key"];
      expect(key, `${methods(r)} ${r.url} documents the header`).toBeTruthy();
      expect(key!.safeParse(undefined).success, `${methods(r)} ${r.url} is optional`).toBe(true);
      expect(key!.safeParse("a1b2c3d4-e5f6").success).toBe(true);
      expect(key!.safeParse("bad key!").success).toBe(false);
    }
  });

  test("reads do not ask for an Idempotency-Key", () => {
    for (const r of routes.filter((r) => methods(r).every((m) => ["GET", "HEAD"].includes(m)))) {
      const headers = r.schema?.headers as { shape?: Record<string, unknown> } | undefined;
      expect(headers?.shape?.["idempotency-key"], `${r.url}`).toBeUndefined();
    }
  });

  test("every non-GET send route is paid", () => {
    const sends = own().filter(
      (r) => /send/i.test(r.url) && methods(r).some((m) => m !== "GET" && m !== "HEAD"),
    );
    expect(sends.length).toBeGreaterThan(0);
    const failures = sends.flatMap((r) => [
      ...(r.config?.paid === true ? [] : [`${name(r)}: config.paid is ${r.config?.paid}`]),
    ]);
    expect(failures).toEqual([]);
  });

  test("a key limited to the Webchat widget passes no v2 route", () => {
    // The widget key is public (it sits in the customer's page), so it must open nothing here.
    const actor = buildActor({
      kind: "apiKey",
      orgId: "11111111-1111-1111-1111-111111111111",
      scopes: permissionsForFeatures(["widget"]),
    });
    const passed = own()
      .filter((r) => {
        try {
          requireScope({ routeOptions: { config: r.config }, actor } as never);
          return true;
        } catch {
          return false;
        }
      })
      .map((r) => `${r.method} ${r.url}`);
    expect(passed).toEqual([]);
  });
});
