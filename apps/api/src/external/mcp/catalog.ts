import type { RouteOptions } from "fastify";

/**
 * Every partner API v2 route, captured as it registers, for the MCP server to turn into tools.
 *
 * The route objects are kept by reference: the v2 modules' own `onRoute` hooks
 * (`declareExternalScopes`, `documentIdempotencyHeader`) run after this one and fill in
 * `config.permission` and the headers schema on the same object, so the tools are read from
 * the catalogue only once the app is ready.
 */
const routes: RouteOptions[] = [];

/** Added to the v2 root plugin before its modules register (v2/index.ts). */
export function recordV2Route(route: RouteOptions) {
  // Fastify adds a HEAD beside every GET, sharing its options.
  if (route.method === "HEAD") return;
  routes.push(route);
}

export function v2Routes(): readonly RouteOptions[] {
  return routes;
}
