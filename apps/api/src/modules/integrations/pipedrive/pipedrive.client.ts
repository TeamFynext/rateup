import axios, { isAxiosError, type AxiosInstance } from "axios";

import type { Integration } from "../../../generated/prisma/client.js";
import prisma from "../../../utils/prisma.js";
import { refreshOAuthToken, type OAuth2Config } from "../shared/oauth2.js";
import {
  readPipedriveCredential,
  type PipedriveCredential,
  type PipedriveMe,
} from "./pipedrive.types.js";

export const PIPEDRIVE_OAUTH = "https://oauth.pipedrive.com/oauth";

const TIMEOUT_MS = 15_000;

/**
 * Whether a token response's `api_domain` is a Pipedrive company address. Every
 * call (and the access token) goes there, so nothing else is accepted.
 */
export function isPipedriveApiDomain(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      /^[a-z0-9-]+\.pipedrive\.com$/i.test(url.hostname) &&
      (url.pathname === "/" || url.pathname === "") &&
      !url.search &&
      !url.port
    );
  } catch {
    return false;
  }
}

/**
 * An axios client for one company, rooted at `{apiDomain}/api` so calls name
 * their version: `/v2/persons`, and `/v1/…` only where Pipedrive has no v2 yet
 * (users, notes, webhooks).
 */
export function createPipedriveClient(apiDomain: string, accessToken: string): AxiosInstance {
  return axios.create({
    baseURL: `${apiDomain.replace(/\/+$/, "")}/api`,
    timeout: TIMEOUT_MS,
    headers: { Accept: "application/json", Authorization: `Bearer ${accessToken}` },
  });
}

export function isPipedriveUnauthorized(error: unknown) {
  return isAxiosError(error) && error.response?.status === 401;
}

/** Who a freshly issued token belongs to, and their company. Users have no v2 API. */
export async function getPipedriveMe(apiDomain: string, accessToken: string) {
  const response = await createPipedriveClient(apiDomain, accessToken).get<{
    data: PipedriveMe;
  }>("/v1/users/me");
  return response.data.data;
}

/** Revokes the grant (RFC 7009), so the app leaves the company's installed apps. */
export async function revokePipedriveRefreshToken(
  refreshToken: string,
  clientId: string | undefined,
  clientSecret: string | undefined,
) {
  await axios.post(
    `${PIPEDRIVE_OAUTH}/revoke`,
    new URLSearchParams({ token: refreshToken, token_type_hint: "refresh_token" }).toString(),
    {
      timeout: TIMEOUT_MS,
      auth: { username: clientId ?? "", password: clientSecret ?? "" },
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    },
  );
}

/**
 * Pipedrive's OAuth app (a private app in RateUp's Pipedrive Developer Hub). Read
 * from the environment directly because `config.ts` drags auth and services into
 * everything the registry imports. The app's scopes are chosen in the Developer
 * Hub, not on the authorize URL.
 */
export const pipedriveOAuthConfig: OAuth2Config = {
  authorizeUrl: `${PIPEDRIVE_OAUTH}/authorize`,
  tokenUrl: `${PIPEDRIVE_OAUTH}/token`,
  get clientId() {
    return process.env.PIPEDRIVE_CLIENT_ID;
  },
  get clientSecret() {
    return process.env.PIPEDRIVE_CLIENT_SECRET;
  },
  tokenAuth: "basic",
};

/** Refresh this long before expiry, so a token never runs out mid-request. */
const EXPIRY_MARGIN_MS = 5 * 60 * 1000;

const ACCESS_TOKEN_TTL_MS = 60 * 60 * 1000;

const isFresh = (credential: PipedriveCredential, now: number) =>
  new Date(credential.expires_at).getTime() - EXPIRY_MARGIN_MS > now;

/**
 * A current access token, refreshing it first when it is about to expire.
 *
 * Access tokens last about an hour, so every caller goes through here. A refresh
 * may hand back a new refresh token and a new `api_domain`; both are kept.
 */
export async function getPipedriveAccessToken(
  integration: Pick<Integration, "id" | "credential">,
  { force = false, now = Date.now() }: { force?: boolean; now?: number } = {},
): Promise<{ accessToken: string; apiDomain: string }> {
  const credential = readPipedriveCredential(integration.credential);
  if (!credential) throw new Error("Pipedrive is not connected");
  if (!force && isFresh(credential, now)) {
    return { accessToken: credential.access_token, apiDomain: credential.apiDomain };
  }

  const tokens = await refreshOAuthToken(pipedriveOAuthConfig, credential.refresh_token);
  const apiDomain = isPipedriveApiDomain(tokens.raw.api_domain)
    ? tokens.raw.api_domain
    : credential.apiDomain;
  const next = {
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken ?? credential.refresh_token,
    expires_at: tokens.expiresAt ?? new Date(now + ACCESS_TOKEN_TTL_MS).toISOString(),
    apiDomain,
  };
  // Reads back the whole credential: settings saved since this row was loaded
  // must not be overwritten with the stale copy.
  const current = await prisma.integration.findUnique({
    where: { id: integration.id },
    select: { credential: true },
  });
  await prisma.integration.update({
    where: { id: integration.id },
    data: {
      credential: { ...(current?.credential as Record<string, unknown> | null), ...next } as never,
    },
  });
  return { accessToken: next.access_token, apiDomain };
}

/** A client for this integration's company, with a token that is good for a while yet. */
export async function pipedriveClientFor(integration: Pick<Integration, "id" | "credential">) {
  const { accessToken, apiDomain } = await getPipedriveAccessToken(integration);
  return createPipedriveClient(apiDomain, accessToken);
}
