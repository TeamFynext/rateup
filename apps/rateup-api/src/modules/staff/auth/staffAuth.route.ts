import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import prisma from "../../../utils/prisma.js";
import { log } from "../../../utils/logger.js";
import {
  googleRedirectUri,
  oidcCookieName,
  sessionCookieName,
  type StaffConfig,
} from "../staff.config.js";
import { staffClientIp } from "../staff.guards.js";
import {
  createStaffSession,
  hashSessionToken,
  revokeReplacedStaffSession,
  revokeStaffSession,
} from "../staff.session.js";
import { recordStaffAuthEvent } from "../staffAudit.js";
import {
  buildGoogleAuthUrl,
  checkGoogleClaims,
  exchangeGoogleCode,
  pkcePair,
  randomToken,
  verifyGoogleIdToken,
  type LoginDenial,
} from "./google.js";

const OIDC_COOKIE_MAX_AGE_S = 10 * 60;

const startQuerySchema = z.object({
  returnTo: z.string().max(2048).optional(),
  reauth: z.enum(["1"]).optional(),
});

const callbackQuerySchema = z.object({
  code: z.string().optional(),
  state: z.string().optional(),
  error: z.string().optional(),
});

/** What the OIDC cookie carries between /start and /callback. */
interface OidcState {
  state: string;
  nonce: string;
  verifier: string;
  returnTo: string;
  reauth: boolean;
  startedAt: number;
  /**
   * Hash of the session this sign-in replaces, read at /start: a top-level navigation from
   * the console, which carries the session cookie (SameSite None, or Lax on localhost).
   */
  replaces?: string;
}

/** Only a path on the console itself (prefixed with its origin), never an open redirect. */
export function safeReturnTo(value: string | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return "/";
  }
  return value;
}

export function staffAuthRoutes(config: StaffConfig) {
  const sessionCookie = sessionCookieName(config);
  const oidcCookie = oidcCookieName(config);
  const baseCookie = { path: "/", httpOnly: true, secure: config.secureCookies };
  // The console calls this API from its own origin, which may be another site (e.g. two
  // *.up.railway.app hosts), so over https the session cookie must be SameSite=None.
  // Cross-site writes are still refused by CORS, originGuard and the X-Staff-Csrf header.
  const sessionSameSite = config.secureCookies ? ("none" as const) : ("lax" as const);

  function loginRedirect(reply: FastifyReply, reason: LoginDenial) {
    reply.clearCookie(oidcCookie, { path: "/" });
    return reply.redirect(`${config.consoleOrigin}/login?error=${reason}`, 302);
  }

  function readOidcState(request: FastifyRequest): OidcState | null {
    const raw = request.cookies[oidcCookie];
    if (!raw) return null;
    const unsigned = request.unsignCookie(raw);
    if (!unsigned.valid || !unsigned.value) return null;
    try {
      const parsed = JSON.parse(unsigned.value) as OidcState;
      if (Date.now() - parsed.startedAt > OIDC_COOKIE_MAX_AGE_S * 1000) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  return async function routes(server: FastifyInstance) {
    server.get<{ Querystring: z.infer<typeof startQuerySchema> }>(
      "/auth/google/start",
      { config: { staffPublic: true }, schema: { querystring: startQuerySchema } },
      async (request, reply) => {
        const { verifier, challenge } = pkcePair();
        const oidc: OidcState = {
          state: randomToken(),
          nonce: randomToken(),
          verifier,
          returnTo: safeReturnTo(request.query.returnTo),
          reauth: request.query.reauth === "1",
          startedAt: Date.now(),
        };
        const current = request.cookies[sessionCookie];
        if (current) oidc.replaces = hashSessionToken(current);
        // Lax, not Strict: it has to come back on Google's top-level redirect to /callback.
        reply.setCookie(oidcCookie, JSON.stringify(oidc), {
          ...baseCookie,
          sameSite: "lax",
          signed: true,
          maxAge: OIDC_COOKIE_MAX_AGE_S,
        });
        return reply.redirect(
          buildGoogleAuthUrl({
            clientId: config.googleClientId,
            redirectUri: googleRedirectUri(config),
            state: oidc.state,
            nonce: oidc.nonce,
            codeChallenge: challenge,
            hostedDomain: config.googleHd,
            reauth: oidc.reauth,
          }),
          302,
        );
      },
    );

    server.get<{ Querystring: z.infer<typeof callbackQuerySchema> }>(
      "/auth/google/callback",
      { config: { staffPublic: true }, schema: { querystring: callbackQuerySchema } },
      async (request, reply) => {
        const oidc = readOidcState(request);
        const { code, state, error } = request.query;
        // The person cancelled at Google, or Google refused the request.
        if (error) return loginRedirect(reply, "failed");
        if (!oidc || !code || !state || state !== oidc.state)
          return loginRedirect(reply, "expired");

        let claims;
        try {
          const idToken = await exchangeGoogleCode({
            code,
            codeVerifier: oidc.verifier,
            redirectUri: googleRedirectUri(config),
            clientId: config.googleClientId,
            clientSecret: config.googleClientSecret,
          });
          claims = await verifyGoogleIdToken(idToken, config.googleClientId);
        } catch (err) {
          log.warn({ err }, "staff: Google sign-in could not be completed");
          return loginRedirect(reply, "failed");
        }

        const checked = checkGoogleClaims(claims, {
          nonce: oidc.nonce,
          hostedDomain: config.googleHd,
          cfAccessEmail: config.cfAccessEnforced ? request.cfAccessEmail : undefined,
          reauthStartedAt: oidc.reauth ? oidc.startedAt : undefined,
        });
        const claimedEmail = typeof claims.email === "string" ? claims.email.toLowerCase() : "";
        if (!checked.ok) {
          await recordStaffAuthEvent(request, {
            action: "staff.login_denied",
            staffEmail: claimedEmail || "unknown",
            reason: checked.reason,
          });
          return loginRedirect(reply, checked.reason);
        }

        const { identity } = checked;
        const staff = await prisma.staffUser.findUnique({ where: { email: identity.email } });
        // A googleSub that changed means the Workspace account was deleted and recreated
        // under the same address: not the person who was allowlisted.
        const subMismatch = !!staff?.googleSub && staff.googleSub !== identity.sub;
        if (!staff || !staff.active || subMismatch) {
          await recordStaffAuthEvent(request, {
            action: "staff.login_denied",
            staffEmail: identity.email,
            staffUserId: staff?.id,
            reason: !staff ? "not_on_allowlist" : subMismatch ? "google_sub_changed" : "inactive",
          });
          return loginRedirect(reply, "not_allowed");
        }

        await prisma.staffUser.update({
          where: { id: staff.id },
          data: {
            googleSub: identity.sub,
            name: staff.name ?? identity.name,
            avatarUrl: identity.picture ?? staff.avatarUrl,
            lastLoginAt: new Date(),
          },
        });

        // A new sign-in (a step-up included) replaces the session it started from, so a browser
        // never holds two live sessions.
        if (oidc.replaces) await revokeReplacedStaffSession(oidc.replaces, staff.id);

        const { token } = await createStaffSession(staff.id, {
          ip: staffClientIp(request),
          userAgent: request.headers["user-agent"],
        });
        await recordStaffAuthEvent(request, {
          action: oidc.reauth ? "staff.reauth" : "staff.login",
          staffEmail: staff.email,
          staffUserId: staff.id,
        });

        reply.clearCookie(oidcCookie, { path: "/" });
        reply.setCookie(sessionCookie, token, { ...baseCookie, sameSite: sessionSameSite });
        return reply.redirect(`${config.consoleOrigin}${oidc.returnTo}`, 302);
      },
    );

    server.get("/auth/me", async (request) => {
      const staff = request.staff!;
      return {
        data: {
          id: staff.id,
          email: staff.email,
          name: staff.name,
          avatarUrl: staff.avatarUrl,
          isOwner: staff.isOwner,
        },
      };
    });

    server.post("/auth/logout", async (request, reply) => {
      await revokeStaffSession(request.staffSession!.id);
      await recordStaffAuthEvent(request, {
        action: "staff.logout",
        staffEmail: request.staff!.email,
        staffUserId: request.staff!.id,
      });
      reply.clearCookie(sessionCookie, { ...baseCookie, sameSite: sessionSameSite });
      return { success: true };
    });
  };
}
