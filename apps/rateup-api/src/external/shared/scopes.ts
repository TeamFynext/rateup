import type { FastifyInstance, FastifyRequest } from "fastify";

import type { Permission } from "../../authz/permissions.js";
import { ExternalApiError } from "./errors.js";

/**
 * API-key scopes, enforced.
 *
 * A key's scopes used to be stored, shown on the settings page and turned into an actor, and
 * then never read: `authorize` stands aside for `access: "token"` routes and no external
 * route asked the actor anything, so a key scoped to `contacts.read` could send campaigns.
 *
 * Every external route now carries a `config.permission`, declared once per module with
 * `declareExternalScopes` (a route's own `config` wins), and `requireScope` checks it against
 * the key's actor after the key is verified. `access` stays `"token"` — `classifyRoute`
 * would otherwise read the permission as "needs a SuperTokens session".
 */

interface ExternalScopeDefaults {
  /** For GET/HEAD routes that declare nothing themselves. */
  read: Permission;
  /** For every other method's routes that declare nothing themselves. */
  write: Permission;
}

export function declareExternalScopes(server: FastifyInstance, defaults: ExternalScopeDefaults) {
  server.addHook("onRoute", (route) => {
    const config = (route.config ??= {});
    config.access = "token";
    if (config.permission) return;
    const methods = Array.isArray(route.method) ? route.method : [route.method];
    const isRead = methods.every((m) => m === "GET" || m === "HEAD");
    config.permission = isRead ? defaults.read : defaults.write;
  });
}

/** Runs after the key is verified, so `request.actor` is the key's. */
export function requireScope(request: FastifyRequest) {
  const permission = request.routeOptions.config?.permission;
  // Fail closed: a route that forgot to declare is refused rather than open to every key.
  // v1.routes.test.ts and v2.routes.test.ts make sure none ships that way.
  const required = permission ? (Array.isArray(permission) ? permission : [permission]) : [];
  const actor = request.actor;
  if (required.length > 0 && actor && required.some((p) => actor.can(p))) return;

  throw new ExternalApiError(
    403,
    "insufficient_scope",
    required.length > 0
      ? `This API key lacks the ${required.join(" or ")} scope`
      : "This route is not available to API keys",
    { permission: required[0] ?? null },
  );
}

/**
 * A `rk_test_` key is for building an integration against real data without spending
 * money, so it stops at routes marked `config.paid` (template and campaign sends).
 */
export function refuseTestKeyOnPaidRoute(request: FastifyRequest) {
  if (request.routeOptions.config?.paid && request.apiKey?.mode === "test") {
    throw new ExternalApiError(
      403,
      "test_key_not_allowed",
      "Test keys cannot send WhatsApp messages; use a live key",
    );
  }
}
