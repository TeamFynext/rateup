import { createHash, randomBytes } from "node:crypto";
import { createRemoteJWKSet, jwtVerify, type JWTPayload, type JWTVerifyGetKey } from "jose";

/*
 * Google OpenID Connect, authorization-code flow with PKCE, done by hand: the code exchange is
 * one POST and the id_token is verified with jose against Google's published keys. The staff
 * console uses its own OAuth client, never the customer app's SuperTokens one.
 */

const AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

let googleJwks: JWTVerifyGetKey | undefined;
function googleKeys(): JWTVerifyGetKey {
  googleJwks ??= createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
  return googleJwks;
}

export const randomToken = () => randomBytes(32).toString("base64url");

export function pkcePair(): { verifier: string; challenge: string } {
  const verifier = randomToken();
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export function buildGoogleAuthUrl(params: {
  clientId: string;
  redirectUri: string;
  state: string;
  nonce: string;
  codeChallenge: string;
  /** Null (NODE_ENV=development only) offers every Google account, not just the Workspace's. */
  hostedDomain: string | null;
  /** Step-up: force Google to ask for the password again, and report when it did. */
  reauth: boolean;
}): string {
  const url = new URL(AUTHORIZE_URL);
  url.search = new URLSearchParams({
    client_id: params.clientId,
    redirect_uri: params.redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state: params.state,
    nonce: params.nonce,
    code_challenge: params.codeChallenge,
    code_challenge_method: "S256",
    // Only a hint for the account picker; the `hd` claim is what is enforced.
    ...(params.hostedDomain ? { hd: params.hostedDomain } : {}),
    ...(params.reauth ? { prompt: "login", max_age: "0" } : { prompt: "select_account" }),
  }).toString();
  return url.toString();
}

export async function exchangeGoogleCode(params: {
  code: string;
  codeVerifier: string;
  redirectUri: string;
  clientId: string;
  clientSecret: string;
}): Promise<string> {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: params.code,
      code_verifier: params.codeVerifier,
      redirect_uri: params.redirectUri,
      client_id: params.clientId,
      client_secret: params.clientSecret,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  const body = (await response.json().catch(() => ({}))) as { id_token?: string; error?: string };
  if (!response.ok || !body.id_token) {
    throw new Error(`Google token exchange failed: ${response.status} ${body.error ?? ""}`.trim());
  }
  return body.id_token;
}

export async function verifyGoogleIdToken(
  idToken: string,
  clientId: string,
  getKey: JWTVerifyGetKey = googleKeys(),
): Promise<JWTPayload> {
  const { payload } = await jwtVerify(idToken, getKey, {
    issuer: GOOGLE_ISSUERS,
    audience: clientId,
  });
  return payload;
}

/** Codes the console's /login page knows how to explain. */
export type LoginDenial = "domain" | "not_allowed" | "access_mismatch" | "expired" | "failed";

export interface GoogleIdentity {
  email: string;
  sub: string;
  name?: string;
  picture?: string;
}

/**
 * Everything about a verified id_token that decides admission, short of the allowlist.
 * Pure, so each rule has a test.
 */
export function checkGoogleClaims(
  claims: JWTPayload,
  expected: {
    nonce: string;
    /** Null (NODE_ENV=development only): any verified Google account, gmail.com included. */
    hostedDomain: string | null;
    /** From Cloudflare Access; undefined when enforcement is off. */
    cfAccessEmail?: string;
    /** Step-up only: the flow's start time; Google's auth_time must not predate it. */
    reauthStartedAt?: number;
  },
): { ok: true; identity: GoogleIdentity } | { ok: false; reason: LoginDenial } {
  if (claims.nonce !== expected.nonce) return { ok: false, reason: "expired" };

  const email = typeof claims.email === "string" ? claims.email.toLowerCase() : "";
  if (!email || claims.email_verified !== true) return { ok: false, reason: "domain" };
  // `hd` is only present for Workspace accounts, so a gmail.com login lacks it entirely.
  const { hostedDomain } = expected;
  if (
    hostedDomain !== null &&
    (claims.hd !== hostedDomain || !email.endsWith(`@${hostedDomain}`))
  ) {
    return { ok: false, reason: "domain" };
  }
  if (expected.cfAccessEmail !== undefined && email !== expected.cfAccessEmail) {
    return { ok: false, reason: "access_mismatch" };
  }
  if (expected.reauthStartedAt !== undefined) {
    const authTime = typeof claims.auth_time === "number" ? claims.auth_time * 1000 : 0;
    // A minute of slack for clock skew between Google and this server.
    if (authTime < expected.reauthStartedAt - 60_000) return { ok: false, reason: "expired" };
  }
  if (typeof claims.sub !== "string" || !claims.sub) return { ok: false, reason: "failed" };

  return {
    ok: true,
    identity: {
      email,
      sub: claims.sub,
      name: typeof claims.name === "string" ? claims.name : undefined,
      picture: typeof claims.picture === "string" ? claims.picture : undefined,
    },
  };
}
