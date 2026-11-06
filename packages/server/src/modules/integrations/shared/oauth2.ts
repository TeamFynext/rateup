import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import axios from "axios";

import { requireIntegrationKey } from "./integrationSecret.js";

/**
 * Shared OAuth 2.0 authorization-code plumbing for every provider that connects
 * through a consent screen: the authorize URL with signed state, the code
 * exchange and the refresh. Lifted from the Zoho integration, which wrote all
 * three inline.
 */
export interface OAuth2Config {
  authorizeUrl: string;
  tokenUrl: string;
  clientId: string | undefined;
  clientSecret: string | undefined;
  /**
   * Where the client credentials go on the token request. Zoho wants every
   * field as a query parameter on an empty POST; most providers take a form
   * body; some want HTTP Basic.
   */
  tokenAuth: "query" | "form" | "basic";
}

/** A token response, with the provider's own fields kept in `raw`. */
export interface OAuth2Tokens {
  accessToken: string;
  /** Absent on a refresh for providers that only issue it once. */
  refreshToken?: string;
  /** ISO timestamp; absent when the provider did not say. */
  expiresAt?: string;
  scope?: string;
  raw: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

/** What a consent round-trip carries: who started it, for which provider. */
export interface OAuthStatePayload {
  orgId: string;
  provider: string;
  userId?: string;
  /**
   * Anything else the callback must be able to trust — WooCommerce's store URL,
   * which its callback does not otherwise carry.
   */
  context?: string;
}

const STATE_TTL_MS = 10 * 60 * 1000;

/**
 * An opaque, signed `state` for the authorize URL.
 *
 * It binds the round-trip to the org (and user) that started it, so the
 * callback — which arrives from the provider, not from our frontend — knows
 * whose integration to write, and a code minted for one org cannot be replayed
 * against another. It expires after ten minutes; the nonce makes each unique.
 */
export function signOAuthState(payload: OAuthStatePayload, now = Date.now()): string {
  const body = Buffer.from(
    JSON.stringify({ ...payload, exp: now + STATE_TTL_MS, nonce: randomBytes(12).toString("hex") }),
  ).toString("base64url");
  return `${body}.${sign(body)}`;
}

/** Verifies a `state` from a callback; throws if tampered with, expired or for another provider. */
export function verifyOAuthState(
  state: string,
  provider: string,
  now = Date.now(),
): OAuthStatePayload {
  const [body, signature] = state.split(".");
  if (!body || !signature) throw new Error("Malformed OAuth state");

  const expected = Buffer.from(sign(body));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
    throw new Error("OAuth state signature mismatch");
  }

  const decoded = JSON.parse(Buffer.from(body, "base64url").toString()) as OAuthStatePayload & {
    exp: number;
  };
  if (decoded.exp < now) throw new Error("OAuth state expired");
  if (decoded.provider !== provider) throw new Error("OAuth state is for another provider");

  return {
    orgId: decoded.orgId,
    provider: decoded.provider,
    userId: decoded.userId,
    ...(decoded.context !== undefined && { context: decoded.context }),
  };
}

function sign(body: string) {
  return createHmac("sha256", requireIntegrationKey("oauth-state"))
    .update(body)
    .digest("base64url");
}

// ---------------------------------------------------------------------------
// Authorize, exchange, refresh
// ---------------------------------------------------------------------------

export function buildAuthorizeUrl(
  config: OAuth2Config,
  options: {
    redirectUri: string;
    state: string;
    scopes: string[];
    /** Space-joined by default; Zoho and some others want commas. */
    scopeSeparator?: string;
    extraParams?: Record<string, string>;
  },
): string {
  const url = new URL(config.authorizeUrl);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", config.clientId ?? "");
  url.searchParams.set("redirect_uri", options.redirectUri);
  url.searchParams.set("scope", options.scopes.join(options.scopeSeparator ?? " "));
  url.searchParams.set("state", options.state);
  for (const [key, value] of Object.entries(options.extraParams ?? {})) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

export function exchangeOAuthCode(
  config: OAuth2Config,
  options: { code: string; redirectUri: string },
): Promise<OAuth2Tokens> {
  return requestTokens(config, {
    grant_type: "authorization_code",
    redirect_uri: options.redirectUri,
    code: options.code,
  });
}

export function refreshOAuthToken(
  config: OAuth2Config,
  refreshToken: string,
): Promise<OAuth2Tokens> {
  return requestTokens(config, { refresh_token: refreshToken, grant_type: "refresh_token" });
}

async function requestTokens(
  config: OAuth2Config,
  grant: Record<string, string>,
): Promise<OAuth2Tokens> {
  const client = { client_id: config.clientId ?? "", client_secret: config.clientSecret ?? "" };

  let response;
  switch (config.tokenAuth) {
    case "query":
      // The field order matches what Zoho's inline calls always sent.
      response = await axios.post(config.tokenUrl, null, {
        params: grant.code
          ? {
              grant_type: grant.grant_type,
              ...client,
              redirect_uri: grant.redirect_uri,
              code: grant.code,
            }
          : { refresh_token: grant.refresh_token, ...client, grant_type: grant.grant_type },
      });
      break;
    case "form":
      response = await axios.post(config.tokenUrl, new URLSearchParams({ ...grant, ...client }), {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      break;
    case "basic":
      response = await axios.post(config.tokenUrl, new URLSearchParams(grant), {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        auth: { username: client.client_id, password: client.client_secret },
      });
      break;
  }

  return normaliseTokens(response.data);
}

/** Maps a token response onto {@link OAuth2Tokens}, keeping everything in `raw`. */
export function normaliseTokens(data: Record<string, unknown>): OAuth2Tokens {
  const expiresIn = Number(data.expires_in);
  return {
    accessToken: String(data.access_token ?? ""),
    ...(typeof data.refresh_token === "string" && { refreshToken: data.refresh_token }),
    ...(Number.isFinite(expiresIn) &&
      expiresIn > 0 && { expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString() }),
    ...(typeof data.scope === "string" && { scope: data.scope }),
    raw: data,
  };
}
