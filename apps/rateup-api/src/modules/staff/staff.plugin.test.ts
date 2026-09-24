import { beforeEach, describe, expect, test, vi } from "vitest";

const db = vi.hoisted(() => ({
  staffSession: {
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    create: vi.fn(),
  },
  staffUser: { findUnique: vi.fn(), update: vi.fn() },
  staffAuditLog: { create: vi.fn(), update: vi.fn() },
}));
const redis = vi.hoisted(() => ({ incr: vi.fn(), expire: vi.fn() }));

vi.mock("../../utils/prisma.js", () => ({ default: db }));
vi.mock("../../utils/redisConnection.js", () => ({ default: redis }));
vi.mock("../../utils/logger.js", () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
// The read routes reach into billing and maintenance services, whose imports would boot the
// whole app (queues, Redis); the guard chain is what this file tests, so they are stubbed.
vi.mock("../payment/payment.service.js", () => ({
  getAllPaymentSubscriptions: vi.fn(),
  getOrgInvoices: vi.fn(),
}));
vi.mock("../payment/stripe/stripe.service.js", () => ({ getAllStripeSubscriptions: vi.fn() }));
vi.mock("../maintenance/maintenance.tasks.js", () => ({
  MAINTENANCE_TASKS: [],
  findTask: vi.fn(),
}));
vi.mock("../whatsapp/inbox/message/wamessage.service.js", () => ({
  generateInboxResponse: vi.fn(),
}));
vi.mock("../response/response.service.js", () => ({ generateResponse: vi.fn() }));
vi.mock("../referrals/referrals.service.js", () => ({ createReferral: vi.fn() }));

import Fastify, { type FastifyInstance, type RouteOptions } from "fastify";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from "jose";
import type { StaffConfig } from "./staff.config.js";
import { hashSessionToken, SESSION_IDLE_MS } from "./staff.session.js";
import { registerStaffApi, STAFF_PUBLIC_ROUTES } from "./staff.plugin.js";

const ORIGIN = "https://admin.rateup.app";
const API_ORIGIN = "https://api.rateup.app";

const baseConfig: StaffConfig = {
  googleClientId: "cid",
  googleClientSecret: "csecret",
  googleHd: "rateup.app",
  consoleOrigin: ORIGIN,
  apiOrigin: API_ORIGIN,
  cookieSecret: "a-cookie-secret-that-is-at-least-32-chars",
  cfAccessTeam: "rateup",
  cfAccessAud: "aud-123",
  cfAccessEnforced: false,
  secureCookies: true,
};

const { privateKey, publicKey } = await generateKeyPair("RS256");
const cfKeys = createLocalJWKSet({ keys: [{ ...(await exportJWK(publicKey)), alg: "RS256" }] });

function cfToken(email: string, audience = "aud-123") {
  return new SignJWT({ email })
    .setProtectedHeader({ alg: "RS256" })
    .setIssuer("https://rateup.cloudflareaccess.com")
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(privateKey);
}

async function buildApp(config: Partial<StaffConfig> = {}) {
  const routes: RouteOptions[] = [];
  const app = Fastify();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.addHook("onRoute", (route) => {
    routes.push(route);
  });
  await app.register(
    (instance: FastifyInstance) =>
      registerStaffApi(instance, { ...baseConfig, ...config }, { cfAccessKey: cfKeys }),
    { prefix: "/api/staff" },
  );
  await app.ready();
  return { app, routes };
}

const TOKEN = "session-token";

function liveSession(overrides: Record<string, unknown> = {}) {
  const now = Date.now();
  return {
    id: "sess-1",
    tokenHash: hashSessionToken(TOKEN),
    staffUserId: "staff-1",
    createdAt: new Date(now - 60_000),
    authenticatedAt: new Date(now - 60_000),
    lastSeenAt: new Date(now - 5_000),
    expiresAt: new Date(now + 60 * 60_000),
    revokedAt: null,
    ip: null,
    userAgent: null,
    staffUser: {
      id: "staff-1",
      email: "ann@rateup.app",
      name: "Ann",
      avatarUrl: null,
      isOwner: true,
      active: true,
    },
    ...overrides,
  };
}

const noSession = {};
const withSession = { cookie: `__Host-rateup_staff=${TOKEN}` };

beforeEach(() => {
  vi.clearAllMocks();
  redis.incr.mockResolvedValue(1);
  db.staffSession.findUnique.mockResolvedValue(liveSession());
  db.staffSession.updateMany.mockResolvedValue({ count: 1 });
  db.staffAuditLog.create.mockResolvedValue({});
});

describe("staff session", () => {
  test("GET /auth/me returns the signed-in staff member", async () => {
    const { app } = await buildApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/staff/auth/me",
      headers: withSession,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data).toEqual({
      id: "staff-1",
      email: "ann@rateup.app",
      name: "Ann",
      avatarUrl: null,
      isOwner: true,
    });
    expect(db.staffSession.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tokenHash: hashSessionToken(TOKEN) } }),
    );
  });

  test("no cookie → 401 UNAUTHENTICATED", async () => {
    const { app } = await buildApp();
    const res = await app.inject({ method: "GET", url: "/api/staff/auth/me", headers: noSession });
    expect(res.statusCode).toBe(401);
    expect(res.json().code).toBe("UNAUTHENTICATED");
  });

  test("a customer app (SuperTokens) session is not a staff session", async () => {
    const { app } = await buildApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/staff/auth/me",
      headers: { cookie: "sAccessToken=some-supertokens-jwt" },
    });
    expect(res.statusCode).toBe(401);
  });

  test.each([
    ["unknown", null],
    ["revoked", liveSession({ revokedAt: new Date() })],
    ["past its absolute expiry", liveSession({ expiresAt: new Date(Date.now() - 1) })],
    ["idle too long", liveSession({ lastSeenAt: new Date(Date.now() - SESSION_IDLE_MS - 1) })],
    [
      "of a deactivated staff member",
      liveSession({ staffUser: { ...liveSession().staffUser, active: false } }),
    ],
  ])("a session that is %s → 401", async (_label, stored) => {
    db.staffSession.findUnique.mockResolvedValue(stored);
    const { app } = await buildApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/staff/auth/me",
      headers: withSession,
    });
    expect(res.statusCode).toBe(401);
  });

  test("the plain cookie name is not accepted when the console is https", async () => {
    const { app } = await buildApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/staff/auth/me",
      headers: { cookie: `rateup_staff=${TOKEN}` },
    });
    expect(res.statusCode).toBe(401);
  });
});

describe("Cloudflare Access", () => {
  test("enforced: a missing or foreign assertion is refused", async () => {
    const { app } = await buildApp({ cfAccessEnforced: true });
    const missing = await app.inject({
      method: "GET",
      url: "/api/staff/auth/me",
      headers: withSession,
    });
    expect(missing.statusCode).toBe(403);
    expect(missing.json().code).toBe("ACCESS_REQUIRED");

    const wrongAud = await app.inject({
      method: "GET",
      url: "/api/staff/auth/me",
      headers: {
        ...withSession,
        "cf-access-jwt-assertion": await cfToken("ann@rateup.app", "another-app"),
      },
    });
    expect(wrongAud.statusCode).toBe(403);
    expect(wrongAud.json().code).toBe("ACCESS_INVALID");
  });

  test("enforced: Access and the console session must be the same person", async () => {
    const { app } = await buildApp({ cfAccessEnforced: true });
    const res = await app.inject({
      method: "GET",
      url: "/api/staff/auth/me",
      headers: { ...withSession, "cf-access-jwt-assertion": await cfToken("bob@rateup.app") },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().code).toBe("ACCESS_MISMATCH");
  });

  test("enforced: the matching person gets through", async () => {
    const { app } = await buildApp({ cfAccessEnforced: true });
    const res = await app.inject({
      method: "GET",
      url: "/api/staff/auth/me",
      headers: { ...withSession, "cf-access-jwt-assertion": await cfToken("Ann@rateup.app") },
    });
    expect(res.statusCode).toBe(200);
  });
});

describe("browser protections", () => {
  test("a request from another origin is refused", async () => {
    const { app } = await buildApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/staff/auth/me",
      headers: { ...withSession, origin: "https://app.rateup.app" },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().code).toBe("ORIGIN_REJECTED");
  });

  test("a mutation without the CSRF header is refused, with it it runs", async () => {
    const { app } = await buildApp();
    const refused = await app.inject({
      method: "POST",
      url: "/api/staff/auth/logout",
      headers: { ...withSession, origin: ORIGIN },
    });
    expect(refused.statusCode).toBe(403);
    expect(refused.json().code).toBe("CSRF");
    expect(db.staffSession.updateMany).not.toHaveBeenCalled();

    const ok = await app.inject({
      method: "POST",
      url: "/api/staff/auth/logout",
      headers: { ...withSession, origin: ORIGIN, "x-staff-csrf": "1" },
    });
    expect(ok.statusCode).toBe(200);
    expect(db.staffSession.updateMany).toHaveBeenCalledWith({
      where: { id: "sess-1", revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
    expect(db.staffAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "staff.logout", staffEmail: "ann@rateup.app" }),
    });
  });

  test("rate limited → 429; Redis down → 503 (fails closed)", async () => {
    const { app } = await buildApp();
    redis.incr.mockResolvedValue(10_000);
    const limited = await app.inject({
      method: "GET",
      url: "/api/staff/auth/me",
      headers: withSession,
    });
    expect(limited.statusCode).toBe(429);

    redis.incr.mockRejectedValue(new Error("redis down"));
    const down = await app.inject({
      method: "GET",
      url: "/api/staff/auth/me",
      headers: withSession,
    });
    expect(down.statusCode).toBe(503);
  });
});

describe("Google sign-in start", () => {
  test("needs no session and redirects to Google with a signed state cookie", async () => {
    db.staffSession.findUnique.mockResolvedValue(null);
    const { app } = await buildApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/staff/auth/google/start?returnTo=/orgs",
      headers: noSession,
    });
    expect(res.statusCode).toBe(302);
    const location = new URL(res.headers.location as string);
    expect(location.host).toBe("accounts.google.com");
    expect(location.searchParams.get("redirect_uri")).toBe(
      `${API_ORIGIN}/api/staff/auth/google/callback`,
    );
    const cookie = res.cookies.find((c) => c.name === "__Host-staff_oidc");
    expect(cookie).toMatchObject({ httpOnly: true, secure: true, sameSite: "Lax", path: "/" });
    expect(db.staffSession.findUnique).not.toHaveBeenCalled();
  });

  // /start is a navigation from the console, so it is where the session being replaced is known.
  test("signing in again records the current session so the callback can revoke it", async () => {
    const { app } = await buildApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/staff/auth/google/start",
      headers: withSession,
    });
    const cookie = res.cookies.find((c) => c.name === "__Host-staff_oidc")!;
    const signed = decodeURIComponent(cookie.value);
    const state = JSON.parse(signed.slice(0, signed.lastIndexOf(".")));
    expect(state.replaces).toBe(hashSessionToken(TOKEN));
    // Only the hash travels; the session token itself never leaves the session cookie.
    expect(signed).not.toContain(TOKEN);
  });

  test("a callback without the state cookie goes back to /login", async () => {
    const { app } = await buildApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/staff/auth/google/callback?code=abc&state=xyz",
      headers: noSession,
    });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe(`${ORIGIN}/login?error=expired`);
  });
});

describe("route table", () => {
  test("every route is a staff route, and only the sign-in hops skip the session", async () => {
    const { routes } = await buildApp();
    const staffRoutes = routes.filter((r) => r.url.startsWith("/api/staff/"));
    expect(staffRoutes.length).toBeGreaterThan(0);
    for (const route of staffRoutes) {
      const id = `${route.method} ${route.url}`;
      expect(route.config?.access, id).toBe("staff");
      if (route.method === "HEAD") continue;
      expect(!!route.config?.staffPublic, id).toBe(STAFF_PUBLIC_ROUTES.includes(id));
    }
  });
});

describe("read routes", () => {
  const reads = [
    "/api/staff/overview",
    "/api/staff/search?q=acme",
    "/api/staff/orgs",
    "/api/staff/orgs/plans",
    "/api/staff/orgs/0a5b8a7e-2f7c-4d2e-9a51-3c1f0e6b9d24",
    "/api/staff/orgs/0a5b8a7e-2f7c-4d2e-9a51-3c1f0e6b9d24/members",
    "/api/staff/orgs/0a5b8a7e-2f7c-4d2e-9a51-3c1f0e6b9d24/usage",
    "/api/staff/orgs/0a5b8a7e-2f7c-4d2e-9a51-3c1f0e6b9d24/channels",
    "/api/staff/users",
    "/api/staff/orgs/0a5b8a7e-2f7c-4d2e-9a51-3c1f0e6b9d24/orders",
    "/api/staff/orgs/0a5b8a7e-2f7c-4d2e-9a51-3c1f0e6b9d24/invoices",
    "/api/staff/orgs/0a5b8a7e-2f7c-4d2e-9a51-3c1f0e6b9d24/message-stats",
    "/api/staff/orgs/0a5b8a7e-2f7c-4d2e-9a51-3c1f0e6b9d24/activity",
    "/api/staff/billing/plans",
    "/api/staff/billing/razorpay/plans",
    "/api/staff/billing/razorpay/subscriptions",
    "/api/staff/billing/stripe/products",
    "/api/staff/billing/stripe/subscriptions",
    "/api/staff/billing/orders",
    "/api/staff/billing/subscriptions",
    "/api/staff/ops/maintenance/tasks",
    "/api/staff/ops/shopify",
    "/api/staff/ops/referrals",
    "/api/staff/orgs/0a5b8a7e-2f7c-4d2e-9a51-3c1f0e6b9d24/notes",
    "/api/staff/staff-users",
    "/api/staff/audit",
    "/api/staff/audit/actions",
  ];

  test("none of them answer without a staff session", async () => {
    const { app } = await buildApp();
    for (const url of reads) {
      const res = await app.inject({ method: "GET", url, headers: noSession });
      expect(res.statusCode, url).toBe(401);
    }
  });

  test("malformed input is a 400 in the staff error shape, before any query", async () => {
    const { app } = await buildApp();
    for (const url of [
      "/api/staff/orgs/not-an-id",
      "/api/staff/search?q=a",
      "/api/staff/orgs?pageSize=5000",
      "/api/staff/orgs?status=deleted",
      "/api/staff/billing/orders?status=REFUNDED",
      "/api/staff/orgs/0a5b8a7e-2f7c-4d2e-9a51-3c1f0e6b9d24/activity?source=everyone",
      "/api/staff/audit?staffUserId=nope",
    ]) {
      const res = await app.inject({ method: "GET", url, headers: withSession });
      expect(res.statusCode, url).toBe(400);
      expect(res.json().code, url).toBe("VALIDATION");
    }
  });
});

test("a subscription change without a reason is refused before anything is written", async () => {
  const { app } = await buildApp();
  const org = "/api/staff/orgs/0a5b8a7e-2f7c-4d2e-9a51-3c1f0e6b9d24";
  const headers = { ...withSession, origin: ORIGIN, "x-staff-csrf": "1" };
  const future = new Date(Date.now() + 86_400_000).toISOString();
  for (const [method, url, payload] of [
    ["PUT", `${org}/subscription/plan`, { rateupPlanId: org.slice(-36), expiresAt: future }],
    ["PUT", `${org}/subscription/expiry`, { expiresAt: future, reason: "no" }],
    ["PUT", `${org}/subscription/overrides`, { features: {}, reason: "A fine reason" }],
    ["POST", `${org}/addons`, { quantity: 50, reason: "A fine reason" }],
    ["POST", `${org}/suspend`, { reason: "no" }],
    ["POST", `${org}/unsuspend`, {}],
    ["POST", `${org}/notes`, { body: "" }],
  ] as const) {
    const res = await app.inject({ method, url, headers, payload });
    expect(res.statusCode, url).toBe(400);
    expect(res.json().code, url).toBe("VALIDATION");
  }
});

test("a maintenance preview needs a session and the CSRF header, like any POST", async () => {
  const { app } = await buildApp();
  const url = "/api/staff/ops/maintenance/tasks/seed-plans/preview";
  expect((await app.inject({ method: "POST", url, headers: noSession })).statusCode).toBe(401);
  const noCsrf = await app.inject({ method: "POST", url, headers: withSession, payload: {} });
  expect(noCsrf.statusCode).toBe(403);
});

describe("applying a maintenance task", () => {
  const url = "/api/staff/ops/maintenance/tasks/seed-plans/apply";
  const mutating = { ...withSession, "x-staff-csrf": "1", "content-type": "application/json" };
  const body = { confirm: "seed-plans", reason: "Seeding the new catalogue" };

  test("a Google sign-in older than 15 minutes is sent back to sign in again", async () => {
    db.staffSession.findUnique.mockResolvedValue(
      liveSession({ authenticatedAt: new Date(Date.now() - 16 * 60_000) }),
    );
    const { app } = await buildApp();
    const res = await app.inject({ method: "POST", url, headers: mutating, payload: body });
    expect(res.statusCode).toBe(401);
    expect(res.json().code).toBe("REAUTH_REQUIRED");
  });

  test("the task id must be typed back exactly", async () => {
    const { findTask } = await import("../maintenance/maintenance.tasks.js");
    vi.mocked(findTask).mockReturnValue({
      id: "seed-plans",
      title: "Seed plans",
      description: "",
      destructive: true,
      run: async () => ({ summary: "ok" }),
    });
    const { app } = await buildApp();
    const wrong = await app.inject({
      method: "POST",
      url,
      headers: mutating,
      payload: { ...body, confirm: "seed-plan" },
    });
    expect(wrong.statusCode).toBe(422);
    expect(wrong.json().code).toBe("CONFIRM_MISMATCH");
    // Only the plugin's fallback row for a refused mutation; the task never started.
    const actions = db.staffAuditLog.create.mock.calls.map((call) => call[0].data.action);
    expect(actions).not.toContain("maintenance.apply");
  });

  test("a fresh sign-in, the right id and a reason run the task for real", async () => {
    const { findTask } = await import("../maintenance/maintenance.tasks.js");
    const run = vi.fn(async ({ apply, log }: { apply: boolean; log: (m: string) => void }) => {
      log(`writing: ${apply}`);
      return { summary: "3 plans written" };
    });
    vi.mocked(findTask).mockReturnValue({
      id: "seed-plans",
      title: "Seed plans",
      description: "",
      destructive: true,
      run,
    });
    db.staffAuditLog.update.mockResolvedValue({});
    const { app } = await buildApp();
    const res = await app.inject({ method: "POST", url, headers: mutating, payload: body });
    expect(res.statusCode).toBe(200);
    expect(res.json().data).toMatchObject({ applied: true, summary: "3 plans written" });
    expect(run.mock.calls[0][0].apply).toBe(true);
    expect(db.staffAuditLog.create.mock.calls[0][0].data).toMatchObject({
      action: "maintenance.apply",
      reason: body.reason,
    });
    expect(db.staffAuditLog.update.mock.calls[0][0].data.after).toMatchObject({
      status: "finished",
    });
  });
});
