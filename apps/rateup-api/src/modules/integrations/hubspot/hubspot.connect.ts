import type { Integration } from "../../../../generated/prisma/client.js";
import prisma from "../../../utils/prisma.js";
import { log } from "../../../utils/logger.js";
import { IntegratedApps } from "../../../types/enums.js";
import type { OAuth2Tokens } from "../shared/oauth2.js";
import { OAuthConnectError } from "../shared/oauthConnectError.js";
import { hubSpotClientFor } from "./hubspot.auth.js";
import { getHubSpotTokenInfo, revokeHubSpotRefreshToken } from "./hubspot.client.js";
import { listHubSpotDealPipelines } from "./hubspot.deals.js";
import {
  readHubSpotCredential,
  type HubSpotCredential,
  type HubSpotSettings,
} from "./hubspot.types.js";

/**
 * Connecting a HubSpot account, through the shared consent-screen flow
 * (`shared/oauthConnect.ts`): it exchanges the code, then hands the tokens to
 * {@link connectHubSpot} to keep.
 *
 * One HubSpot account connects to one RateUp org. HubSpot sends every
 * account's webhooks to a single address, and they are routed by account id;
 * two orgs on one account would each receive — and act on — the other's
 * changes.
 */

const PROVIDER = IntegratedApps.hubspot;

const whereOrg = (orgId: string) => ({
  orgid_integration_name_unique: { orgId, name: PROVIDER },
});

/** The active integration for a HubSpot account, if any org has connected it. */
export function findIntegrationByPortal(portalId: number) {
  return prisma.integration.findFirst({
    where: { name: PROVIDER, active: true, credential: { path: ["portalId"], equals: portalId } },
  });
}

export async function connectHubSpot(orgId: string, tokens: OAuth2Tokens): Promise<void> {
  if (!tokens.refreshToken) {
    throw new OAuthConnectError("HubSpot did not return a refresh token. Try again.", 400);
  }
  const info = await getHubSpotTokenInfo(tokens.accessToken);

  const taken = await findIntegrationByPortal(info.hub_id);
  if (taken && taken.orgId !== orgId) {
    throw new OAuthConnectError(
      "This HubSpot account is already connected to another RateUp workspace. Disconnect it there first.",
      409,
    );
  }

  const existing = await prisma.integration.findUnique({ where: whereOrg(orgId) });
  const previous = existing ? readHubSpotCredential(existing.credential) : null;

  const credential: HubSpotCredential = {
    // Settings saved on this connection (steps 2.2 onwards) survive a reconnect
    // to the same account; another account starts over.
    ...(previous?.portalId === info.hub_id &&
      (existing?.credential as Record<string, unknown> | null)),
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    expires_at: tokens.expiresAt ?? new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    portalId: info.hub_id,
    hubDomain: info.hub_domain,
    connectedBy: info.user,
    scopes: info.scopes,
    connectedAt: new Date().toISOString(),
  };

  await prisma.integration.upsert({
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

  // Reconnecting to a different account leaves the old grant behind in that
  // account's connected apps; revoke it.
  if (previous && previous.portalId !== info.hub_id) {
    await revokeHubSpotRefreshToken(previous.refresh_token).catch((error) =>
      log.warn({ err: error, orgId }, "Could not revoke the previous HubSpot grant"),
    );
  }
}

/** Revokes the grant on disconnect. Best effort: the row is removed either way. */
export async function disconnectHubSpot(integration: Integration) {
  const credential = readHubSpotCredential(integration.credential);
  if (!credential) return;
  try {
    await revokeHubSpotRefreshToken(credential.refresh_token);
  } catch (error) {
    log.warn(
      { err: error, integrationId: integration.id },
      "HubSpot grant was not revoked; it stays listed under the account's connected apps",
    );
  }
}

/** The connection as the settings page shows it. Never the tokens. */
export async function getHubSpotStatus(orgId: string) {
  const integration = await prisma.integration.findUnique({ where: whereOrg(orgId) });
  const credential = integration?.active ? readHubSpotCredential(integration.credential) : null;
  if (!integration || !credential) return { connected: false as const };

  return {
    connected: true as const,
    portalId: credential.portalId,
    hubDomain: credential.hubDomain ?? null,
    connectedBy: credential.connectedBy ?? null,
    connectedAt: credential.connectedAt,
    settings: {
      syncContacts: credential.syncContacts ?? false,
      syncDeals: credential.syncDeals ?? false,
      dealPipelineId: credential.dealPipelineId ?? null,
      stageMappings: credential.stageMappings ?? [],
      importContacts: credential.importContacts ?? false,
      importDeals: credential.importDeals ?? false,
      logConversations: credential.logConversations ?? false,
      logSurveyResponses: credential.logSurveyResponses ?? false,
    },
    bulk: {
      import: credential.bulk?.import ?? null,
      export: credential.bulk?.export ?? null,
    },
    health: {
      consecutiveFailures: integration.consecutiveFailures,
      lastError: integration.lastError,
      lastErrorAt: integration.lastErrorAt,
    },
  };
}

/** Saves the HubSpot page's switches onto the credential. */
export async function updateHubSpotSettings(orgId: string, settings: HubSpotSettings) {
  const integration = await prisma.integration.findUnique({ where: whereOrg(orgId) });
  const credential = integration?.active ? readHubSpotCredential(integration.credential) : null;
  if (!integration || !credential) throw new OAuthConnectError("HubSpot is not connected.", 400);

  const next = { ...credential, ...settings };
  // Another pipeline has other stages: the old mapping means nothing there.
  if (
    settings.dealPipelineId !== undefined &&
    settings.dealPipelineId !== credential.dealPipelineId
  ) {
    next.stageMappings = settings.stageMappings ?? [];
  }
  await prisma.integration.update({
    where: { id: integration.id },
    data: { credential: next as never },
  });
  return getHubSpotStatus(orgId);
}

/** The account's deal pipelines, for the Deals card's picker and stage mapping. */
export async function getHubSpotPipelines(orgId: string) {
  const integration = await prisma.integration.findUnique({ where: whereOrg(orgId) });
  if (!integration?.active || !readHubSpotCredential(integration.credential)) {
    throw new OAuthConnectError("HubSpot is not connected.", 400);
  }
  return listHubSpotDealPipelines(await hubSpotClientFor(integration));
}
