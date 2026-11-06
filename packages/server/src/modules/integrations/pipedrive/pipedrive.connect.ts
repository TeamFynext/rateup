import type { Integration } from "../../../generated/prisma/client.js";
import { IntegratedApps } from "../../../types/enums.js";
import { log } from "../../../utils/logger.js";
import prisma from "../../../utils/prisma.js";
import type { OAuth2Tokens } from "../shared/oauth2.js";
import { OAuthConnectError } from "../shared/oauthConnectError.js";
import {
  getPipedriveMe,
  isPipedriveApiDomain,
  pipedriveClientFor,
  pipedriveOAuthConfig,
  revokePipedriveRefreshToken,
} from "./pipedrive.client.js";
import { listPipedrivePipelines } from "./pipedrive.deals.js";
import {
  newPipedriveWebhookSecret,
  PIPEDRIVE_OBJECTS,
  removePipedriveWebhooks,
  syncPipedriveWebhooks,
} from "./pipedrive.webhooks.js";
import {
  readPipedriveCredential,
  type PipedriveCredential,
  type PipedriveSettings,
} from "./pipedrive.types.js";

/**
 * Connecting a Pipedrive company, through the shared consent-screen flow
 * (`shared/oauthConnect.ts`): it exchanges the code, then hands the tokens to
 * {@link connectPipedrive} to keep.
 *
 * One Pipedrive company connects to one RateUp org, as with HubSpot: two orgs
 * on one company would each act on the other's changes.
 */

const PROVIDER = IntegratedApps.pipedrive;

const whereOrg = (orgId: string) => ({
  orgid_integration_name_unique: { orgId, name: PROVIDER },
});

/** The active integration for a Pipedrive company, if any org has connected it. */
export function findIntegrationByCompany(companyId: number) {
  return prisma.integration.findFirst({
    where: { name: PROVIDER, active: true, credential: { path: ["companyId"], equals: companyId } },
  });
}

const ACCESS_TOKEN_TTL_MS = 60 * 60 * 1000;

export async function connectPipedrive(orgId: string, tokens: OAuth2Tokens): Promise<void> {
  if (!tokens.refreshToken) {
    throw new OAuthConnectError("Pipedrive did not return a refresh token. Try again.", 400);
  }
  const apiDomain = tokens.raw.api_domain;
  if (!isPipedriveApiDomain(apiDomain)) {
    throw new OAuthConnectError("Pipedrive did not say which company to use. Try again.", 400);
  }
  const me = await getPipedriveMe(apiDomain, tokens.accessToken);

  const taken = await findIntegrationByCompany(me.company_id);
  if (taken && taken.orgId !== orgId) {
    throw new OAuthConnectError(
      "This Pipedrive company is already connected to another RateUp workspace. Disconnect it there first.",
      409,
    );
  }

  const existing = await prisma.integration.findUnique({ where: whereOrg(orgId) });
  const previous = existing ? readPipedriveCredential(existing.credential) : null;
  const sameCompany = previous?.companyId === me.company_id;

  const credential: PipedriveCredential = {
    // Settings saved on this connection (later steps) survive a reconnect to the
    // same company; another company starts over.
    ...(sameCompany && (existing?.credential as Record<string, unknown> | null)),
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    expires_at: tokens.expiresAt ?? new Date(Date.now() + ACCESS_TOKEN_TTL_MS).toISOString(),
    apiDomain,
    companyId: me.company_id,
    companyName: me.company_name,
    companyDomain: me.company_domain,
    connectedBy: me.email ?? me.name,
    connectedAt: new Date().toISOString(),
  };
  // Another company starts with no webhooks; its own come below.
  if (!sameCompany) {
    credential.webhookSecret = newPipedriveWebhookSecret();
    credential.webhooks = [];
  }

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

  // The connection stands even if a webhook will not register: the page shows
  // which are missing and offers a repair, and the scheduled refresh retries.
  try {
    await syncPipedriveWebhooks(integration);
  } catch (error) {
    log.warn({ err: error, orgId }, "Pipedrive webhooks did not all register");
  }

  // Reconnecting to another company leaves the old grant installed there; revoke it.
  // Pipedrive removes an app's webhooks with its grant.
  if (previous && !sameCompany) {
    await revoke(previous.refresh_token).catch((error) =>
      log.warn({ err: error, orgId }, "Could not revoke the previous Pipedrive grant"),
    );
  }
}

const revoke = (refreshToken: string) =>
  revokePipedriveRefreshToken(
    refreshToken,
    pipedriveOAuthConfig.clientId,
    pipedriveOAuthConfig.clientSecret,
  );

/** Revokes the grant on disconnect. Best effort: the row is removed either way. */
export async function disconnectPipedrive(integration: Integration) {
  const credential = readPipedriveCredential(integration.credential);
  if (!credential) return;
  // Webhooks first, while the token still works; the revoke would take them too,
  // but only once Pipedrive gets to it.
  await removePipedriveWebhooks(integration).catch((error) =>
    log.warn({ err: error, integrationId: integration.id }, "Pipedrive webhooks not removed"),
  );
  try {
    await revoke(credential.refresh_token);
  } catch (error) {
    log.warn(
      { err: error, integrationId: integration.id },
      "Pipedrive grant was not revoked; the app stays installed in the company",
    );
  }
}

/** Saves the page's switches onto the credential, then answers with the status. */
export async function updatePipedriveSettings(orgId: string, settings: PipedriveSettings) {
  const integration = await prisma.integration.findUnique({ where: whereOrg(orgId) });
  const credential = integration?.active ? readPipedriveCredential(integration.credential) : null;
  if (!integration || !credential) throw new OAuthConnectError("Pipedrive is not connected.", 400);

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
  return getPipedriveStatus(orgId);
}

/** Re-creates missing webhooks from the settings page. */
export async function repairPipedriveWebhooks(orgId: string) {
  const integration = await prisma.integration.findUnique({ where: whereOrg(orgId) });
  if (!integration?.active || !readPipedriveCredential(integration.credential)) {
    throw new OAuthConnectError("Pipedrive is not connected.", 400);
  }
  await syncPipedriveWebhooks(integration);
  return getPipedriveStatus(orgId);
}

/** The company's deal pipelines, for the Deals card's picker and stage mapping. */
export async function getPipedrivePipelines(orgId: string) {
  const integration = await prisma.integration.findUnique({ where: whereOrg(orgId) });
  if (!integration?.active || !readPipedriveCredential(integration.credential)) {
    throw new OAuthConnectError("Pipedrive is not connected.", 400);
  }
  return listPipedrivePipelines(await pipedriveClientFor(integration));
}

/** The connection as the settings page shows it. Never the tokens. */
export async function getPipedriveStatus(orgId: string) {
  const integration = await prisma.integration.findUnique({ where: whereOrg(orgId) });
  const credential = integration?.active ? readPipedriveCredential(integration.credential) : null;
  if (!integration || !credential) return { connected: false as const };

  return {
    connected: true as const,
    companyId: credential.companyId,
    companyName: credential.companyName ?? null,
    companyDomain: credential.companyDomain ?? null,
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
    bulk: { import: credential.bulk?.import ?? null, export: credential.bulk?.export ?? null },
    webhooks: PIPEDRIVE_OBJECTS.map((object) => ({
      object,
      registered: !!credential.webhooks?.some((ref) => ref.object === object),
    })),
    health: {
      consecutiveFailures: integration.consecutiveFailures,
      lastError: integration.lastError,
      lastErrorAt: integration.lastErrorAt,
    },
  };
}
