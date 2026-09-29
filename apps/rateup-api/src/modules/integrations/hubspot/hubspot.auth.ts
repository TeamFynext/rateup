import type { Integration } from "../../../../generated/prisma/client.js";
import prisma from "../../../utils/prisma.js";
import { refreshOAuthToken, type OAuth2Config } from "../shared/oauth2.js";
import { createHubSpotClient } from "./hubspot.client.js";
import { readHubSpotCredential, type HubSpotCredential } from "./hubspot.types.js";

/**
 * HubSpot's OAuth app. The client id and secret come from the app in RateUp's
 * HubSpot developer account; read from the environment directly because
 * `config.ts` drags auth and services into everything the registry imports.
 *
 * `HUBSPOT_CLIENT_*` rather than the `HUB_SPOT_*` RateUp's own CRM sync uses:
 * the two are different HubSpot accounts and must never be confused.
 */
export const hubSpotOAuthConfig: OAuth2Config = {
  authorizeUrl: "https://app.hubspot.com/oauth/authorize",
  tokenUrl: "https://api.hubapi.com/oauth/v1/token",
  get clientId() {
    return process.env.HUBSPOT_CLIENT_ID;
  },
  get clientSecret() {
    return process.env.HUBSPOT_CLIENT_SECRET;
  },
  tokenAuth: "form",
};

/**
 * What the connect asks for. These must match the scopes configured on the app
 * in HubSpot exactly — HubSpot refuses an authorize request asking for more.
 * Notes on a contact are written under the contacts scope.
 */
export const HUBSPOT_SCOPES = [
  "oauth",
  "crm.objects.contacts.read",
  "crm.objects.contacts.write",
  "crm.objects.deals.read",
  "crm.objects.deals.write",
] as const;

/** Refresh this long before expiry, so a token never runs out mid-request. */
const EXPIRY_MARGIN_MS = 5 * 60 * 1000;

const isFresh = (credential: HubSpotCredential, now: number) =>
  new Date(credential.expires_at).getTime() - EXPIRY_MARGIN_MS > now;

/**
 * A current access token, refreshing it first when it is about to expire.
 *
 * HubSpot's access tokens last 30 minutes — shorter than the shared refresh
 * cron's interval — so every caller goes through here. Two workers refreshing
 * at once is harmless: the refresh token is not rotated, and both new access
 * tokens are valid.
 */
export async function getHubSpotAccessToken(
  integration: Pick<Integration, "id" | "credential">,
  { force = false, now = Date.now() }: { force?: boolean; now?: number } = {},
): Promise<string> {
  const credential = readHubSpotCredential(integration.credential);
  if (!credential) throw new Error("HubSpot is not connected");
  if (!force && isFresh(credential, now)) return credential.access_token;

  const tokens = await refreshOAuthToken(hubSpotOAuthConfig, credential.refresh_token);
  const next: HubSpotCredential = {
    ...credential,
    access_token: tokens.accessToken,
    ...(tokens.refreshToken && { refresh_token: tokens.refreshToken }),
    expires_at: tokens.expiresAt ?? new Date(now + 30 * 60 * 1000).toISOString(),
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
      credential: {
        ...(current?.credential as Record<string, unknown> | null),
        access_token: next.access_token,
        refresh_token: next.refresh_token,
        expires_at: next.expires_at,
      } as never,
    },
  });
  return next.access_token;
}

/** A client for this integration's account, with a token that is good for a while yet. */
export async function hubSpotClientFor(integration: Pick<Integration, "id" | "credential">) {
  return createHubSpotClient(await getHubSpotAccessToken(integration));
}
