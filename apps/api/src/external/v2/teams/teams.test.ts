import { beforeEach, describe, expect, test, vi } from "vite-plus/test";
import Fastify from "fastify";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";

vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), trace: vi.fn() },
}));

const db = vi.hoisted(() => ({ team: { findMany: vi.fn() } }));
vi.mock("../../../utils/prisma.js", () => ({ default: db }));

import { externalErrorHandler } from "../../shared/errors.js";
import { externalTeamRoutes } from "./teams.route.js";

async function buildApp() {
  const app = Fastify();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.setErrorHandler(externalErrorHandler);
  app.addHook("preHandler", async (request) => {
    (request as { user?: unknown }).user = { orgId: "org-1", role: "SUPER_ADMIN" };
  });
  await app.register(externalTeamRoutes);
  await app.ready();
  return app;
}

beforeEach(() => vi.clearAllMocks());

describe("GET /teams", () => {
  test("pages the org's teams and strips everything but id and name", async () => {
    db.team.findMany.mockResolvedValue([
      {
        id: "t-1",
        name: "Front desk",
        createdAt: new Date("2026-01-02"),
        code: "SECRET",
        googleLink: "https://g",
        orgId: "org-1",
      },
      { id: "t-2", name: "Kitchen", createdAt: new Date("2026-01-01") },
    ]);

    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: "/?limit=1" });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.data).toEqual([{ id: "t-1", name: "Front desk" }]);
    expect(body.nextCursor).toEqual(expect.any(String));
    for (const leaked of ["SECRET", "googleLink", "createdAt", "orgId"]) {
      expect(res.payload).not.toContain(leaked);
    }
    expect(db.team.findMany.mock.calls[0]![0]).toMatchObject({
      where: { orgId: "org-1" },
      take: 2,
    });
  });

  test("the last page has no cursor; a bad limit is 400", async () => {
    db.team.findMany.mockResolvedValue([{ id: "t-1", name: "A", createdAt: new Date() }]);
    const app = await buildApp();

    const ok = await app.inject({ method: "GET", url: "/" });
    expect(JSON.parse(ok.payload).nextCursor).toBeNull();

    const bad = await app.inject({ method: "GET", url: "/?limit=500" });
    expect(bad.statusCode).toBe(400);
    expect(JSON.parse(bad.payload).error.code).toBe("validation_failed");
  });

  test("the route requires teams.read", async () => {
    let permission: unknown;
    const probe = Fastify();
    probe.setValidatorCompiler(validatorCompiler);
    probe.setSerializerCompiler(serializerCompiler);
    probe.addHook("onRequest", async (request, reply) => {
      permission = request.routeOptions.config?.permission;
      return reply.code(204).send();
    });
    await probe.register(externalTeamRoutes);
    await probe.ready();
    await probe.inject({ method: "GET", url: "/" });
    expect(permission).toBe("teams.read");
  });
});
