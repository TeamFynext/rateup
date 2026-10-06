import type { Integration } from "../../../../../generated/prisma/client.js";
import prisma from "../../../../utils/prisma.js";
import { log } from "../../../../utils/logger.js";
import { generateRandomAlphaId } from "../../../../utils/misc/random.utils.js";
import { IntegratedApps } from "../../../../types/enums.js";
import { inboundWebhookUrl } from "../../shared/inboundWebhookContract.js";
import type { OAuth2Tokens } from "../../shared/oauth2.js";
import { OAuthConnectError } from "../../shared/oauthConnectError.js";
import {
  getValidZohoAccessToken,
  refreshZohoToken,
  revokeZohoToken,
  type ZohoTokenResponse,
} from "./zoho.auth.js";
import { registerZohoWebhook, unsubscribeZohoWebhook } from "./zoho.client.js";
import {
  getZohoCredential,
  zohoErrorDetail,
  type ZohoCredential,
  type ZohoProductName,
  type ZohoWebhookRegistration,
} from "./zoho.types.js";

/**
 * Connecting Zoho CRM and Bigin, through the shared consent-screen flow
 * (`shared/oauthConnect.ts`): it exchanges the code, then hands the tokens to
 * {@link connectZoho} to keep. Also the two things that outlive the connect:
 * the webhook channels, which Zoho expires after a week and the scheduled
 * refresh renews, and the disconnect that tears them down.
 */

const PROVIDER = IntegratedApps.zoho;

const whereOrg = (orgId: string) => ({
  orgid_integration_name_unique: { orgId, name: PROVIDER },
});

/** The record events each product's channel subscribes to. */
const CHANNEL_EVENTS: Record<ZohoProductName, string[]> = {
  crm: [
    "Contacts.create",
    "Contacts.edit",
    "Contacts.delete",
    "Leads.create",
    "Leads.edit",
    "Leads.delete",
  ],
  bigin: [
    "Contacts.create",
    "Contacts.edit",
    "Contacts.delete",
    "Deals.create",
    "Deals.edit",
    "Deals.delete",
  ],
};

const CHANNEL_KEY = { crm: "crmWebhook", bigin: "biginWebhook" } as const;

const PRODUCTS: readonly ZohoProductName[] = ["crm", "bigin"];

type ChannelPatch = Pick<ZohoCredential, "crmWebhook" | "biginWebhook" | "isWebhookRegistered">;

/**
 * Subscribes a fresh webhook channel for each product the grant covers,
 * pointed at the integration's address on the shared receiver, and drops the
 * channel it replaces.
 *
 * The old channel is unsubscribed best-effort: Zoho refuses to unsubscribe one
 * that has already expired, and letting that throw would skip the
 * re-registration — so an expired channel could never come back. A product
 * whose registration fails keeps no channel and is logged; the others still
 * register.
 */
export async function registerZohoChannels(
  integrationId: string,
  credential: ZohoCredential,
  accessToken: string,
): Promise<ChannelPatch> {
  const patch: ChannelPatch = {};
  const secret = credential.zohoWebhookSecret;
  let allRegistered = true;

  for (const product of PRODUCTS) {
    if (!credential.supportedProducts?.[product]) continue;

    // Set on connect. Without it Zoho has no way to authenticate its callbacks,
    // so nothing is registered rather than a channel sent an undefined token.
    if (!secret) {
      log.warn(
        "No zohoWebhookSecret on integration=%s; skipping %s webhook registration",
        integrationId,
        product,
      );
      allRegistered = false;
      continue;
    }

    const previous = credential[CHANNEL_KEY[product]];
    if (previous?.channelId) {
      try {
        await unsubscribeZohoWebhook({
          accessToken,
          apiDomain: credential.api_domain,
          product,
          channelIds: [previous.channelId],
        });
      } catch (err) {
        log.warn(
          { err: zohoErrorDetail(err) },
          "Zoho %s webhook unsubscribe failed, continuing",
          product,
        );
      }
    }

    try {
      const registered = await registerZohoWebhook({
        accessToken,
        apiDomain: credential.api_domain,
        product,
        events: CHANNEL_EVENTS[product],
        zohoWebhookSecret: secret,
        notifyUrl: inboundWebhookUrl(PROVIDER, integrationId),
      });
      const channel: ZohoWebhookRegistration = {
        product,
        channelId: registered.channelId,
        expiry: registered.expiry ?? null,
      };
      patch[CHANNEL_KEY[product]] = channel;
      log.info("Zoho %s webhook registered for integration=%s", product, integrationId);
    } catch (err) {
      allRegistered = false;
      patch[CHANNEL_KEY[product]] = undefined;
      log.error(
        { err: zohoErrorDetail(err) },
        "Failed registering Zoho %s webhook for integration=%s",
        product,
        integrationId,
      );
    }
  }

  patch.isWebhookRegistered = allRegistered;
  return patch;
}

/**
 * Saves the connection from freshly exchanged tokens, then subscribes the
 * webhook channels — after the row exists, since the channels deliver to an
 * address named by its id.
 *
 * Settings chosen on an earlier connection (the trigger switches, the stage
 * mappings, the Bigin pipeline) survive a reconnect, which is how an org adds
 * a product without setting everything up again.
 */
export async function connectZoho(orgId: string, tokens: OAuth2Tokens): Promise<void> {
  const raw = tokens.raw as Partial<ZohoTokenResponse> & { error?: string };
  // Zoho answers a bad code with a 200 and an `error` field rather than a 4xx.
  if (!tokens.accessToken) {
    log.error({ error: raw.error }, "Zoho OAuth exchange returned no access token");
    throw new OAuthConnectError("Zoho did not grant access. Try connecting again.", 400);
  }
  if (!tokens.refreshToken) {
    throw new OAuthConnectError("Zoho did not return a refresh token. Try connecting again.", 400);
  }

  const scope = tokens.scope ?? raw.scope ?? "";
  const existing = await prisma.integration.findUnique({ where: whereOrg(orgId) });
  const previous = existing ? getZohoCredential(existing) : null;

  const credential: ZohoCredential = {
    ...previous,
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    api_domain: raw.api_domain ?? previous?.api_domain ?? "https://www.zohoapis.in",
    scope,
    supportedProducts: { crm: scope.includes("ZohoCRM"), bigin: scope.includes("ZohoBigin") },
    expires_at: tokens.expiresAt ?? new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    triggerSubscriptions: previous?.triggerSubscriptions ?? [],
    // A new secret per connection: the channels registered below carry it, and
    // the ones they replace are unsubscribed.
    zohoWebhookSecret: generateRandomAlphaId(32),
    isWebhookRegistered: false,
  };

  const integration = await prisma.integration.upsert({
    where: whereOrg(orgId),
    create: { orgId, name: PROVIDER, credential: { ...credential }, active: true },
    update: {
      credential: { ...credential },
      active: true,
      lastError: null,
      lastErrorAt: null,
      consecutiveFailures: 0,
    },
  });

  const channels = await registerZohoChannels(integration.id, credential, tokens.accessToken);
  await prisma.integration.update({
    where: { id: integration.id },
    data: { credential: { ...credential, ...channels } },
  });
  log.info("Zoho connected for org=%s", orgId);
}

/**
 * Unsubscribes the webhook channels and revokes the grant. Called, best-effort,
 * by the generic delete before the row goes; each step is attempted even when
 * the one before it failed.
 */
export async function disconnectZoho(integration: Integration): Promise<void> {
  const credential = getZohoCredential(integration);

  // The stored token may have lapsed since the last refresh; a stale one would
  // fail every unsubscribe below.
  let accessToken = credential.access_token;
  try {
    accessToken = await getValidZohoAccessToken(integration);
  } catch (err) {
    log.warn({ err }, "Zoho token refresh failed on disconnect; trying the stored token");
  }

  for (const product of PRODUCTS) {
    const channelId = credential[CHANNEL_KEY[product]]?.channelId;
    if (!channelId) continue;
    try {
      await unsubscribeZohoWebhook({
        accessToken,
        apiDomain: credential.api_domain,
        product,
        channelIds: [channelId],
      });
    } catch (err) {
      log.warn({ err: zohoErrorDetail(err) }, "Failed to unsubscribe the Zoho %s webhook", product);
    }
  }

  try {
    await revokeZohoToken(credential.refresh_token);
  } catch (err) {
    log.warn({ err: zohoErrorDetail(err) }, "Failed to revoke the Zoho token");
  }
  log.info("Zoho disconnected for integration=%s", integration.id);
}

/**
 * The scheduled refresh: a new access token, and fresh webhook channels, since
 * Zoho expires a channel a week after it is registered. Re-registering on every
 * run is also what moves each org's channels to the current receiver address.
 */
export async function refreshZohoIntegrationCredential(integration: Integration) {
  const credential = getZohoCredential(integration);
  const response = await refreshZohoToken(credential.refresh_token);
  const refreshed: ZohoCredential = {
    ...credential,
    access_token: response.access_token,
    expires_at: new Date(Date.now() + response.expires_in * 1000).toISOString(),
  };

  const channels = await registerZohoChannels(integration.id, refreshed, response.access_token);
  const updatedCredential = { ...refreshed, ...channels };

  await prisma.integration.update({
    where: { id: integration.id },
    data: { credential: { ...updatedCredential } },
  });

  return updatedCredential;
}
