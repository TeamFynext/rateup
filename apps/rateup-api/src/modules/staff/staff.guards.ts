import type { FastifyRequest } from "fastify";
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";
import { sessionCookieName, type StaffConfig } from "./staff.config.js";
import { forbidden, StaffHttpError, unauthenticated } from "./staff.errors.js";
import { findStaffSession, judgeSession, touchStaffSession } from "./staff.session.js";

/*
 * The staff plugin's onRequest hooks, in the order it adds them. Each throws a StaffHttpError
 * that the plugin's error handler turns into `{ code, message }`. They are factories over the
 * config so tests can drive them without environment variables.
 */

function header(request: FastifyRequest, name: string): string | undefined {
  const value = request.headers[name];
  return Array.isArray(value) ? value[0] : value;
}

/** The caller's address. The browser calls the API directly, and `trustProxy` is set. */
export function staffClientIp(request: FastifyRequest): string {
  return request.ip || "unknown";
}

const jwksByTeam = new Map<string, JWTVerifyGetKey>();

function cloudflareJwks(team: string): JWTVerifyGetKey {
  let jwks = jwksByTeam.get(team);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`https://${team}.cloudflareaccess.com/cdn-cgi/access/certs`));
    jwksByTeam.set(team, jwks);
  }
  return jwks;
}

/**
 * 1. The Cloudflare Access JWT the edge attaches to every request to the console host. Proves
 * the browser passed Access; its email must later equal the staff session's.
 */
export function cfAccessGuard(config: StaffConfig, getKey?: JWTVerifyGetKey) {
  return async (request: FastifyRequest) => {
    if (!config.cfAccessEnforced) return;
    const token = header(request, "cf-access-jwt-assertion");
    if (!token) throw forbidden("ACCESS_REQUIRED", "Cloudflare Access assertion missing.");
    try {
      const { payload } = await jwtVerify(token, getKey ?? cloudflareJwks(config.cfAccessTeam), {
        issuer: `https://${config.cfAccessTeam}.cloudflareaccess.com`,
        audience: config.cfAccessAud,
      });
      if (typeof payload.email !== "string" || !payload.email) throw new Error("no email claim");
      request.cfAccessEmail = payload.email.toLowerCase();
    } catch {
      throw forbidden("ACCESS_INVALID", "Cloudflare Access assertion is invalid.");
    }
  };
}

/** 2. A browser request from anywhere but the console. Absent on top-level GET navigations. */
export function originGuard(config: StaffConfig) {
  return async (request: FastifyRequest) => {
    const origin = header(request, "origin");
    if (origin && origin !== config.consoleOrigin) {
      throw forbidden("ORIGIN_REJECTED", "Cross-origin request refused.");
    }
  };
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * 4. Mutations must carry the console's custom header, which a cross-site form cannot send,
 * and any body must be JSON.
 */
export async function csrfGuard(request: FastifyRequest) {
  if (SAFE_METHODS.has(request.method)) return;
  if (header(request, "x-staff-csrf") !== "1") {
    throw forbidden("CSRF", "Missing X-Staff-Csrf header.");
  }
  const hasBody =
    Number(header(request, "content-length") ?? 0) > 0 || !!header(request, "transfer-encoding");
  const contentType = header(request, "content-type") ?? "";
  if (hasBody && !contentType.toLowerCase().startsWith("application/json")) {
    throw new StaffHttpError(415, "UNSUPPORTED_MEDIA_TYPE", "Staff API bodies must be JSON.");
  }
}

/**
 * 5. A valid staff session, on every route but the Google sign-in hops. Sets `request.staff`
 * and `request.staffSession`.
 */
export function requireStaff(config: StaffConfig) {
  const cookieName = sessionCookieName(config);
  return async (request: FastifyRequest) => {
    if (request.routeOptions.config?.staffPublic) return;

    const token = request.cookies?.[cookieName];
    if (!token) throw unauthenticated();

    const session = await findStaffSession(token);
    const now = new Date();
    if (!session || judgeSession(session, now)) throw unauthenticated();

    // Access and the console session must be the same person: a shared laptop signed in to
    // Access as one employee must not ride another employee's console cookie.
    if (config.cfAccessEnforced && session.staffUser.email !== request.cfAccessEmail) {
      throw forbidden("ACCESS_MISMATCH", "Cloudflare Access and console sign-in disagree.");
    }

    await touchStaffSession(session, now);
    request.staffSession = session;
    request.staff = session.staffUser;
  };
}
