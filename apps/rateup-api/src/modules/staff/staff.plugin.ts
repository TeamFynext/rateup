import fastifyCookie from "@fastify/cookie";
import type { FastifyError, FastifyInstance, FastifyRequest } from "fastify";
import { log } from "../../utils/logger.js";
import { rateLimit } from "../../utils/rateLimit.js";
import prisma from "../../utils/prisma.js";
import { staffAccessRoutes } from "./access/access.route.js";
import { staffAuthRoutes } from "./auth/staffAuth.route.js";
import { staffBillingRoutes } from "./billing/billing.route.js";
import { staffOpsRoutes } from "./ops/ops.route.js";
import { staffOrgRoutes } from "./orgs/orgs.route.js";
import { staffOverviewRoutes } from "./overview/overview.route.js";
import { staffSearchRoutes } from "./search/search.route.js";
import { staffUserRoutes } from "./users/users.route.js";
import {
  assertStaffConfig,
  isDevBypassEnabled,
  isStaffConsoleEnabled,
  staffConfig,
  type StaffConfig,
} from "./staff.config.js";
import { StaffHttpError } from "./staff.errors.js";
import {
  cfAccessGuard,
  csrfGuard,
  originGuard,
  requireStaff,
  staffClientIp,
} from "./staff.guards.js";
import { redact } from "./staffAudit.js";

/**
 * The staff console API, mounted at /api/staff. Every route registered anywhere inside this
 * plugin inherits the whole guard chain below, so a new staff route cannot forget one (the
 * failure mode of the per-route `assertRootOrg` it replaces).
 *
 * Isolation: nothing here uses SuperTokens (`authorize` stands aside for `access: "staff"`),
 * and nothing outside src/modules/staff may import these guards. staff.isolation.test.ts
 * enforces both.
 */

/** The only routes reachable without a staff session. */
export const STAFF_PUBLIC_ROUTES = [
  "GET /api/staff/auth/google/start",
  "GET /api/staff/auth/google/callback",
];

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export async function staffPlugin(server: FastifyInstance) {
  const config = staffConfig();
  if (!isStaffConsoleEnabled(config)) {
    log.info("staff console disabled: STAFF_CONSOLE_ORIGIN is not set");
    return;
  }
  assertStaffConfig(config);
  if (!config.cfAccessEnforced && process.env.NODE_ENV === "production") {
    log.warn("staff console running WITHOUT Cloudflare Access (STAFF_CF_ACCESS_ENFORCE=false)");
  }
  if (isDevBypassEnabled(config)) {
    log.warn(
      { email: config.devBypassEmail },
      "staff console DEV BYPASS: loopback requests are signed in without Google (STAFF_DEV_BYPASS_EMAIL)",
    );
  }
  await registerStaffApi(server, config);
}

/** Split from `staffPlugin` so tests can mount it with an explicit config. */
export async function registerStaffApi(
  server: FastifyInstance,
  config: StaffConfig,
  options: { cfAccessKey?: Parameters<typeof cfAccessGuard>[1] } = {},
) {
  server.addHook("onRoute", (route) => {
    // Forced, not defaulted: inside this plugin there is no other kind of route.
    route.config = { ...route.config, access: "staff" };
  });

  await server.register(fastifyCookie, { secret: config.cookieSecret });

  const keyFrom = (request: FastifyRequest) => staffClientIp(request);
  const limitError = (kind: "rate_limited" | "unavailable") =>
    kind === "rate_limited"
      ? new StaffHttpError(429, "RATE_LIMITED", "Too many requests.")
      : new StaffHttpError(503, "UNAVAILABLE", "Try again in a minute.");
  const generalLimit = rateLimit({
    key: "staff",
    max: 300,
    windowSeconds: 60,
    failClosed: true,
    keyFrom,
    throwOnLimit: limitError,
  });
  const signInLimit = rateLimit({
    key: "staff-signin",
    max: 20,
    windowSeconds: 300,
    failClosed: true,
    keyFrom,
    throwOnLimit: limitError,
  });

  server.addHook("onRequest", cfAccessGuard(config, options.cfAccessKey));
  server.addHook("onRequest", originGuard(config));
  server.addHook("onRequest", async (request, reply) => {
    const limiter = request.routeOptions.config?.staffPublic ? signInLimit : generalLimit;
    await limiter(request, reply);
  });
  server.addHook("onRequest", requireStaff(config));
  server.addHook("onRequest", csrfGuard);

  // Coverage that cannot be forgotten: a mutation whose handler wrote no audit row gets a
  // generic one. Handlers call recordStaffAction for the specific, before/after version.
  server.addHook("onResponse", async (request, reply) => {
    if (!MUTATING.has(request.method) || request.staffAuditRecorded || !request.staff) return;
    try {
      await prisma.staffAuditLog.create({
        data: {
          staffUserId: request.staff.id,
          staffEmail: request.staff.email,
          action: `${request.method} ${request.routeOptions.url}`,
          method: request.method,
          route: request.routeOptions.url ?? request.url,
          body: redact({ status: reply.statusCode, body: request.body }) as object,
          ip: staffClientIp(request),
          userAgent: request.headers["user-agent"]?.slice(0, 512),
        },
      });
    } catch (err) {
      log.error({ err, route: request.routeOptions.url }, "staff: fallback audit row failed");
    }
  });

  // Scoped: the root handler is SuperTokens', which knows nothing of staff errors.
  server.setErrorHandler((error: FastifyError | StaffHttpError, request, reply) => {
    if (error instanceof StaffHttpError) {
      return reply.code(error.statusCode).send(error.toBody());
    }
    if ((error as FastifyError).validation) {
      return reply.code(400).send({ code: "VALIDATION", message: error.message });
    }
    log.error({ err: error, route: request.routeOptions.url }, "staff: unhandled error");
    return reply.code(500).send({ code: "INTERNAL", message: "Something went wrong." });
  });

  await server.register(staffAuthRoutes(config));
  await server.register(staffOverviewRoutes);
  await server.register(staffSearchRoutes);
  await server.register(staffOrgRoutes);
  await server.register(staffUserRoutes);
  await server.register(staffBillingRoutes);
  await server.register(staffOpsRoutes);
  await server.register(staffAccessRoutes(config));
}
