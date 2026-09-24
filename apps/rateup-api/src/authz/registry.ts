import type { FastifyInstance, RouteOptions } from "fastify";
import { log } from "../utils/logger.js";
import type { Permission } from "./permissions.js";

/**
 * Default-deny route registry. Every route under /api must say who may reach it, through
 * `config.access` or `config.permission`; a route that says nothing is the class of bug
 * that left platform-wide user routes open to any org owner.
 *
 * Routes are collected as they register and judged once the server is ready, because a
 * module's own `declareAccess` hook fills in its default after the root hook has seen the
 * route. Prefix rules cover the trees whose contract is fixed (public, health, the
 * external token API) and the older `config.isPublic` flag. Until every module declares,
 * an undeclared route is only logged; with AUTHZ_STRICT=1 (set in vitest) it refuses to boot.
 */
export function describeRoute(route: Pick<RouteOptions, "method" | "url">): string {
  const method = Array.isArray(route.method) ? route.method.join("|") : route.method;
  return `${method} ${route.url}`;
}

export function isStrict(): boolean {
  return process.env.AUTHZ_STRICT === "1";
}

export function classifyRoute(route: RouteOptions): "declared" | "tagged" | "undeclared" {
  const url = route.url;
  if (!url.startsWith("/api/")) return "declared";
  const config = (route.config ??= {});

  if (config.permission) {
    config.access ??= "session";
    return "declared";
  }
  if (config.access) return "declared";

  if (config.isPublic === true || url.startsWith("/api/public/") || url.startsWith("/api/health")) {
    config.access = "public";
    return "tagged";
  }
  if (url.startsWith("/api/external/v1/")) {
    config.access = "token";
    return "tagged";
  }
  return "undeclared";
}

export function isMisplacedStaffRoute(route: RouteOptions): boolean {
  return route.config?.access === "staff" && !route.url.startsWith("/api/staff/");
}

export function registerAuthzRouteRegistry(server: FastifyInstance) {
  const routes: RouteOptions[] = [];
  server.addHook("onRoute", (route) => {
    routes.push(route);
  });
  server.addHook("onReady", async () => {
    // `staff` makes `authorize` stand aside, so outside the staff plugin (whose own hooks
    // authenticate) it would be an open door. Refused in every environment, not only strict.
    const misplacedStaff = routes.filter(isMisplacedStaffRoute).map(describeRoute);
    if (misplacedStaff.length > 0) {
      throw new Error(
        `access "staff" is only valid under /api/staff/:\n  ${misplacedStaff.join("\n  ")}`,
      );
    }

    const undeclared = routes.filter((r) => classifyRoute(r) === "undeclared").map(describeRoute);
    if (undeclared.length === 0) return;
    if (isStrict()) {
      throw new Error(
        `${undeclared.length} route(s) declare neither config.access nor config.permission:\n  ${undeclared.join("\n  ")}`,
      );
    }
    log.warn(
      { count: undeclared.length, routes: undeclared },
      "authz: routes without an access declaration",
    );
  });
}

export interface AccessDefaults {
  /**
   * Applied to every route of this plugin (and its children) that declares nothing itself.
   * `token`: the plugin's own preHandler verifies an API key (external v1, Zapier, support webhook).
   */
  access?: "public" | "session" | "token" | "staff";
  /** Permission for GET/HEAD routes that declare nothing themselves. Implies a session. */
  read?: Permission;
  /** Permission for every other method's routes that declare nothing themselves. Implies a session. */
  write?: Permission;
}

/**
 * The module-level declaration: one line at the top of a route plugin covers every route it
 * (or a child plugin) registers, and a route's own `config` still wins. `{ read, write }`
 * is the common shape for a feature module: reading needs `<module>.read`, changing needs
 * `<module>.manage`, and the few routes that differ (send, assign, export) say so themselves.
 */
export function declareAccess(server: FastifyInstance, defaults: AccessDefaults) {
  server.addHook("onRoute", (route) => {
    const config = (route.config ??= {});
    if (config.access || config.permission) return;
    if (config.isPublic === true) {
      config.access = "public";
      return;
    }
    const methods = Array.isArray(route.method) ? route.method : [route.method];
    const isRead = methods.every((m) => m === "GET" || m === "HEAD");
    const permission = isRead ? defaults.read : defaults.write;
    if (permission) {
      config.permission = permission;
      config.access = "session";
    } else if (defaults.access) {
      config.access = defaults.access;
    }
  });
}
