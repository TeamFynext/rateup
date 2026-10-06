import { IntegratedApps } from "../../types/enums.js";
import { encryptCredentialSecrets } from "./shared/credentialCrypto.js";
import prisma from "../../utils/prisma.js";
import { IntegrationSchema, UpdateIntgrationInput } from "./integrations.schema.js";
import { log } from "../../utils/logger.js";
import { generateApiKey } from "../apiAccessToken/apiAccessToken.service.js";
import axios from "axios";

export const getAllIntegrationsByOrgId = (orgId: string) => {
  return prisma.integration.findMany({
    where: {
      orgId,
    },
  });
};

export const getIntegrationByName = async (orgId: string, name: string) => {
  const data = await prisma.integration.findUnique({
    where: {
      orgid_integration_name_unique: {
        orgId,
        name,
      },
    },
  });
  return data;
};

export const createIntegration = async (data: IntegrationSchema, orgId?: string) => {
  let apikey;
  if (data.name === IntegratedApps.zapier) {
    const { key, hash } = await generateApiKey();
    data.credential = {
      ...data?.credential,
      accessToken: hash,
    };
    apikey = key;
  }
  const integration = await prisma.integration.create({
    data: {
      name: data.name,
      credential: data.credential,
      orgId: orgId ?? undefined,
    },
  });

  return { ...integration, apikey };
};

export const updateIntegrationByName = async (
  orgId: string,
  name: string,
  data: UpdateIntgrationInput,
) => {
  let apikey;
  if (name === IntegratedApps.zapier && data.updateKey) {
    if (!data.credential) {
      throw new Error("Missing credential to regenerate the zapier access token");
    }
    const { key, hash } = await generateApiKey();
    data.credential.accessToken = hash;
    apikey = key;
  }
  const {
    updateKey: _ignoredUpdateKey,
    orgId: _ignoredOrgId,
    ...rest
  } = data as UpdateIntgrationInput & { orgId?: string };
  if (name === IntegratedApps.shopify && rest.credential) {
    // Shopify rotates the token pair on every refresh and retires the old one,
    // so a credential read before a refresh and written back after it would
    // restore a dead token. Only saveShopifySession writes the session; this
    // replaces the rest of the credential and carries the stored session over,
    // in one statement.
    const { session: _ignoredSession, ...credential } = rest.credential;
    delete rest.credential;
    await prisma.$executeRaw`UPDATE "Integration" SET credential = ${JSON.stringify(encryptCredentialSecrets(credential))}::jsonb || CASE WHEN credential->'session' IS NULL THEN '{}'::jsonb ELSE jsonb_build_object('session', credential->'session') END WHERE "orgId" = ${orgId}::uuid AND name = ${name}`;
  }
  const integration = await prisma.integration.update({
    where: {
      orgid_integration_name_unique: {
        orgId,
        name,
      },
    },
    data: {
      ...rest,
    },
  });
  return { ...integration, apikey };
};

export async function deleteIntegrationByName(name: string, orgId: string) {
  const where = { orgid_integration_name_unique: { name, orgId } };

  // A registry provider may have set things up on the remote side — webhook
  // subscriptions, mostly — that would keep calling a receiver with no row
  // behind it. Best-effort: a remote that is already gone must not block the
  // org from disconnecting. Imported on use, because the registry pulls in
  // every provider and some of those import this file.
  const { getIntegrationProvider } = await import("./providers/registry.js");
  const provider = getIntegrationProvider(name);
  if (provider?.disconnect) {
    const integration = await prisma.integration.findUnique({ where });
    if (integration) {
      try {
        await provider.disconnect(integration);
      } catch (error) {
        log.warn({ err: error }, "%s remote cleanup failed on disconnect", provider.label);
      }
    }
  }

  return prisma.integration.delete({ where });
}

export async function deleteZapierTriggerHooks(
  data: ZapierIntegration["credential"]["triggerSubscriptions"][0],
  orgId: string,
) {
  const integration = (await getIntegrationByName(
    orgId,
    IntegratedApps.zapier,
  )) as unknown as ZapierIntegration;
  const subscriptions = integration?.credential?.triggerSubscriptions ?? [];
  const stored = subscriptions.find((t) => t.hookUrl === data.hookUrl);
  if (!stored) {
    log.warn("No zapier trigger subscription matching the requested hook for org %s", orgId);
    return;
  }

  if (stored.active) {
    await axios.delete(stored.hookUrl);
  }
  const credential = {
    ...integration.credential,
    triggerSubscriptions: subscriptions.filter((t) => t.hookUrl !== stored.hookUrl),
  } as ZapierIntegration["credential"];
  await updateIntegrationByName(orgId, IntegratedApps.zapier, { credential });
}
