import axios from "axios";

import type { Integration } from "../../../../../generated/prisma/client.js";
import prisma from "../../../../utils/prisma.js";
import { log } from "../../../../utils/logger.js";
import { IntegratedApps } from "../../../../types/enums.js";
import { refreshOAuthToken, type OAuth2Config } from "../../shared/oauth2.js";
import { OAuthConnectError } from "../../shared/oauthConnectError.js";
import { getZohoCredential, type ZohoProductName } from "./zoho.types.js";

/**
 * Zoho's accounts server for the India data centre, where every Rateup org's
 * Zoho account lives today. Credentials are read on access so tests and late
 * env loading see the current values.
 */
export const ZOHO_OAUTH: OAuth2Config = {
  authorizeUrl: "https://accounts.zoho.in/oauth/v2/auth",
  tokenUrl: "https://accounts.zoho.in/oauth/v2/token",
  get clientId() {
    return process.env.ZOHO_CLIENT_ID;
  },
  get clientSecret() {
    return process.env.ZOHO_CLIENT_SECRET;
  },
  tokenAuth: "query",
};

const ZOHO_REVOKE_URL = "https://accounts.zoho.in/oauth/v2/token/revoke";

/** The fields of a Zoho token response Rateup reads. */
export interface ZohoTokenResponse {
  access_token: string;
  /** Only on the code exchange; a refresh response omits it. */
  refresh_token: string;
  expires_in: number;
  api_domain: string;
  scope: string;
}

/**
 * The scopes each product needs. Asked for per product because an org using
 * only one of them may not have the other at all, and Zoho refuses a consent
 * request for scopes of a product the account does not have.
 */
const PRODUCT_SCOPES: Record<ZohoProductName, readonly string[]> = {
  crm: [
    "ZohoCRM.modules.ALL",
    "ZohoCRM.settings.ALL",
    "ZohoCRM.users.ALL",
    "ZohoCRM.notifications.ALL",
  ],
  bigin: [
    "ZohoBigin.modules.ALL",
    "ZohoBigin.settings.ALL",
    "ZohoBigin.users.ALL",
    "ZohoBigin.notifications.ALL",
  ],
};

/** Both products: what a connect asks for when the page names none. */
export const ZOHO_SCOPES = [...PRODUCT_SCOPES.crm, ...PRODUCT_SCOPES.bigin];

/**
 * The scopes for the products the admin picked before connecting, from the
 * authorize-url query (`?products=crm,bigin`). Which products are connected is
 * read back from the scopes Zoho granted, so nothing else needs to carry it.
 */
export function zohoScopesFor(options: Readonly<Record<string, string>>): readonly string[] {
  if (!options.products) return ZOHO_SCOPES;

  const picked = options.products.split(",").map((product) => product.trim());
  const unknown = picked.filter((product) => !(product in PRODUCT_SCOPES));
  if (unknown.length > 0 || picked.length === 0) {
    throw new OAuthConnectError(`Unknown Zoho product: ${unknown.join(", ") || "none"}`, 400);
  }
  return [...new Set(picked)].flatMap((product) => PRODUCT_SCOPES[product as ZohoProductName]);
}

export async function refreshZohoToken(refreshToken: string) {
  const { raw } = await refreshOAuthToken(ZOHO_OAUTH, refreshToken);
  return raw as unknown as ZohoTokenResponse;
}

/**
 * The integration's access token, refreshed first when it has under five
 * minutes left. The refreshed token is saved, so the next job reuses it.
 */
export async function getValidZohoAccessToken(integration: Integration): Promise<string> {
  const credential = getZohoCredential(integration);
  const expiresAt = new Date(credential.expires_at);
  const refreshBuffer = 5 * 60 * 1000;
  const shouldRefresh = Date.now() >= expiresAt.getTime() - refreshBuffer;
  // token still valid
  if (!shouldRefresh) {
    return credential.access_token;
  }

  log.info("Refreshing Zoho access token for integration=%s", integration.id);

  try {
    const response = await refreshZohoToken(credential.refresh_token);
    const newAccessToken = response.access_token;
    const expiresIn = response.expires_in;

    const updatedCredential = {
      ...credential,
      access_token: newAccessToken,
      expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
    };

    await prisma.integration.update({
      where: {
        id: integration.id,
      },
      data: {
        credential: updatedCredential,
      },
    });
    log.info("Zoho access token refreshed successfully");

    return newAccessToken;
  } catch (error) {
    log.error({ err: error }, "Zoho token refresh failed");

    throw new Error("Failed to refresh Zoho access token");
  }
}

/** Ends the grant on Zoho's side, so the refresh token stops working. */
export async function revokeZohoToken(refreshToken: string) {
  await axios.post(ZOHO_REVOKE_URL, null, { params: { token: refreshToken } });
}

/** The org's Zoho integration, for the settings page's reads; throws when there is none. */
export async function loadZohoIntegration(orgId: string, what = "Zoho") {
  const integration = await prisma.integration.findUnique({
    where: { orgid_integration_name_unique: { orgId, name: IntegratedApps.zoho } },
  });
  if (!integration) throw new Error(`${what} integration not found`);
  return integration;
}
