import { createHash, timingSafeEqual } from "node:crypto";
import type { FastifyRequest } from "fastify";
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";
import { sessionCookieName, type StaffConfig } from "./staff.config.js";
import { forbidden, notFound, StaffHttpError, unauthenticated } from "./staff.errors.js";
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

function safeEqual(a: string, b: string): boolean {
  // Hash first so the comparison is constant-time whatever the lengths.
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(a), digest(b));
}

/**
 * The caller's address. The console's proxy forwards the browser's in X-Staff-Client-Ip;
 * it is only read after the proxy secret has matched, so a direct caller cannot pick it.
 */
export function staffClientIp(request: FastifyRequest): string {
  return header(request, "x-staff-client-ip") || request.ip || "unknown";
}

/** 1. Only the console's own proxy may reach /api/staff. Anyone else sees a 404. */
export function proxySecretGuard(config: StaffConfig) {
  return async (request: FastifyRequest) => {
    const presented = header(request, "x-staff-proxy-secret");
    if (!presented || !safeEqual(presented, config.proxySecret)) throw notFound();
  };
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
 * 2. The Cloudflare Access JWT the edge attaches to every request to the console host. Proves
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

/** 3. A browser request from anywhere but the console. Absent on top-level GET navigations. */
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
 * 5. Mutations must carry the console's custom header, which a cross-site form cannot send,
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
 * 6. A valid staff session, on every route but the Google sign-in hops. Sets `request.staff`
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
