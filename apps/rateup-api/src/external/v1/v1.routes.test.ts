import { beforeAll, describe, expect, test, vi } from "vitest";
import Fastify, { type RouteOptions } from "fastify";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";

/**
 * v1's registry check: every route v1 mounts names the key scope it needs (scopes.ts
 * refuses a route that declares none), and the send routes are the paid ones. Routes are
 * captured as they register, so the mocks only have to let the modules import.
 */

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
import { EXTERNAL_V1_PREFIX, externalV1Routes } from "./index.js";

const ALL_PERMISSIONS = new Set<string>(PERMISSIONS);
const routes: RouteOptions[] = [];

beforeAll(async () => {
  const app = Fastify();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.addHook("onRoute", (route) => {
    routes.push(route);
  });
  await app.register(externalV1Routes, { prefix: EXTERNAL_V1_PREFIX });
  await app.ready();
  await app.close();
});

const own = () => routes.filter((r) => r.method !== "HEAD");
const methods = (r: RouteOptions) => (Array.isArray(r.method) ? r.method : [r.method]);
const name = (r: RouteOptions) =>
  `${methods(r).join("|")} ${r.url.slice(EXTERNAL_V1_PREFIX.length)}`;
const find = (method: string, path: string) =>
  own().find(
    (r) =>
      methods(r).includes(method) && r.url.replace(/\/$/, "") === `${EXTERNAL_V1_PREFIX}${path}`,
  );

describe("partner API v1 route registry", () => {
  test("every module is mounted", () => {
    for (const prefix of [
      "/surveys",
      "/contacts",
      "/contact-groups",
      "/teams",
      "/campaigns",
      "/wa/templates",
      "/loyalty",
    ]) {
      expect(
        own().some((r) => r.url.startsWith(`${EXTERNAL_V1_PREFIX}${prefix}`)),
        prefix,
      ).toBe(true);
    }
  });

  test('every route declares an existing permission and is access "token"', () => {
    const failures: string[] = [];
    for (const r of own()) {
      const permission = r.config?.permission;
      const list = permission ? (Array.isArray(permission) ? permission : [permission]) : [];
      if (list.length === 0) failures.push(`${name(r)}: no config.permission`);
      for (const p of list) if (!ALL_PERMISSIONS.has(p)) failures.push(`${name(r)}: ${p}`);
      if (r.config?.access !== "token") failures.push(`${name(r)}: access ${r.config?.access}`);
    }
    expect(failures).toEqual([]);
  });

  test.each([
    ["GET", "/contacts", "contacts.read"],
    ["POST", "/contacts", "contacts.manage"],
    ["PUT", "/contacts/:contactId", "contacts.manage"],
    ["GET", "/contact-groups", "contacts.read"],
    ["POST", "/contact-groups/:contactGroupId/contacts/new", "contacts.manage"],
    ["GET", "/teams", "teams.read"],
    ["GET", "/surveys/:surveyId", "surveys.read"],
    ["GET", "/surveys", "surveys.read"],
    ["GET", "/campaigns", "campaigns.read"],
    ["POST", "/campaigns", "campaigns.manage"],
    ["DELETE", "/campaigns/:campaignId", "campaigns.manage"],
    ["PUT", "/campaigns/:campaignId/send", "campaigns.send"],
    ["GET", "/wa/templates", "templates.read"],
    ["GET", "/wa/templates/message/:messageId/status", "inbox.read"],
    ["POST", "/wa/templates/send", "inbox.reply"],
    ["POST", "/wa/templates/send-with-file", "inbox.reply"],
    ["POST", "/wa/templates/:templateId/send/contacts", ["inbox.reply", "campaigns.send"]],
  ])("%s %s needs %s", (method, path, permission) => {
    const route = find(method, path);
    expect(route, `${method} ${path} registered`).toBeTruthy();
    expect(route!.config?.permission).toEqual(permission);
  });

  test("every write lists Idempotency-Key, and none requires it", () => {
    const writes = own().filter((r) => methods(r).some((m) => m !== "GET"));
    expect(writes.length).toBeGreaterThan(0);
    for (const r of writes) {
      const headers = r.schema?.headers as { shape?: Record<string, { safeParse: Function }> };
      const key = headers?.shape?.["idempotency-key"];
      expect(key, `${methods(r)} ${r.url} documents the header`).toBeTruthy();
      expect(key!.safeParse(undefined).success, `${methods(r)} ${r.url}`).toBe(true);
    }
  });

  test("the send routes are paid; nothing else outside loyalty is", () => {
    const paid = own()
      .filter((r) => r.config?.paid === true && !r.url.includes("/loyalty"))
      .map(name)
      .sort();
    expect(paid).toEqual(
      [
        "PUT /campaigns/:campaignId/send",
        "POST /wa/templates/send",
        "POST /wa/templates/send-with-file",
        "POST /wa/templates/:templateId/send/contacts",
      ].sort(),
    );
  });

  test("a key limited to the Webchat widget passes no v1 route", () => {
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
