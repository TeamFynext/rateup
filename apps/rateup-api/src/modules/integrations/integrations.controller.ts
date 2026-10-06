import {
  createIntegration,
  deleteIntegrationByName,
  deleteZapierTriggerHooks,
  getAllIntegrationsByOrgId,
  getIntegrationByName,
  updateIntegrationByName,
} from "./integrations.service.js";
import { log } from "../../utils/logger.js";
import { FastifyReply, FastifyRequest } from "fastify";
import {
  ByNameParams,
  DeleteZapierHookInput,
  IntegrationSchema,
  ApiKeyConnectInput,
  OAuthAuthorizeQuery,
  OAuthCallbackInput,
  UpdateIntgrationInput,
} from "./integrations.schema.js";
import { IntegratedApps } from "../../types/enums.js";
import { listIntegrationActivity } from "./external/integrationActivity.js";
import { connectWithApiKey } from "./shared/apiKeyConnect.js";
import { finishOAuthConnect, OAuthConnectError, startOAuthConnect } from "./shared/oauthConnect.js";
import { IntegrationConnectError } from "./shared/oauthConnectError.js";
import { recordAuditEvent } from "../../utils/auditLog.js";

/**
 * Strips secrets the UI never needs before an integration leaves the API: the
 * Shopify token pair (the refresh token mints new access tokens for 90 days),
 * and Amelia's API key, which the settings page only needs to know is saved.
 */
function redactIntegration<T extends { name: string; credential: unknown } | null>(
  integration: T,
): T {
  if (integration?.name === IntegratedApps.amelia) {
    const { apiKey, ...credential } = (integration.credential ?? {}) as { apiKey?: string };
    return { ...integration, credential: { ...credential, hasApiKey: Boolean(apiKey) } };
  }
  if (integration?.name !== IntegratedApps.shopify) return integration;
  const credential = integration.credential as { session?: Record<string, unknown> } | null;
  if (!credential?.session) return integration;
  const { accessToken: _a, refreshToken: _r, ...session } = credential.session;
  return { ...integration, credential: { ...credential, session } };
}

export const getAllIntegrationsByOrgHandler = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  try {
    const { orgId } = request.user;
    const data = await getAllIntegrationsByOrgId(orgId);
    reply.send(data.map(redactIntegration));
  } catch {
    log.error("Error fetching all integrations");
    return reply.code(500).send({ error: "Something went wrong" });
  }
};

export const getIntegrationStatusesHandler = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  try {
    const { orgId } = request.user;
    const integrations = await getAllIntegrationsByOrgId(orgId);
    const statuses = Object.values(IntegratedApps).map((app) => {
      const row = integrations.find((int) => int.name === app);
      return {
        name: app,
        isConnected: Boolean(row),
        // Counted only when a job's last retry fails, so one is already a lost
        // sync — enough for the list to flag the card.
        consecutiveFailures: row?.consecutiveFailures ?? 0,
        lastErrorAt: row?.lastErrorAt ?? null,
      };
    });
    reply.code(200).send(statuses);
  } catch {
    log.error("Error fetching integration statuses");
    return reply.code(500).send({ error: "Something went wrong" });
  }
};

export const getIntegrationByNameHandler = async (
  request: FastifyRequest<{ Params: ByNameParams }>,
  reply: FastifyReply,
) => {
  try {
    const { orgId } = request.user;
    const name = request.params.name;
    const data = await getIntegrationByName(orgId, name);
    reply.code(200).send(redactIntegration(data));
  } catch {
    log.error("Error fetching integration by name");
    return reply.code(500).send({ error: "Something went wrong" });
  }
};

export const createIntegrationHandler = async (
  request: FastifyRequest<{ Body: IntegrationSchema }>,
  reply: FastifyReply,
) => {
  try {
    const { orgId } = request.user;
    const data = await createIntegration(request.body, orgId);
    reply.send(data);
  } catch {
    log.error("Error creating integration by name");
    return reply.code(500).send({ error: "Something went wrong" });
  }
};

export const updateIntegrationByNameHandler = async (
  request: FastifyRequest<{
    Params: ByNameParams;
    Body: UpdateIntgrationInput;
  }>,
  reply: FastifyReply,
) => {
  try {
    const data = await updateIntegrationByName(
      request.user.orgId,
      request.params.name,
      request.body,
    );
    reply.send(redactIntegration(data));
  } catch (error) {
    console.error(error);
    log.error({ err: error }, "Error updating integration by name");
    return reply.code(500).send({ error: "Something went wrong" });
  }
};

export const deleteIntegrationByNameHandler = async (
  request: FastifyRequest<{ Params: ByNameParams }>,
  reply: FastifyReply,
) => {
  try {
    const orgId = request.user.orgId;
    const name = request.params.name;
    const data = await deleteIntegrationByName(name, orgId);

    reply.send(data);
  } catch {
    log.error("Error deleting integration by name");
    return reply.code(500).send({ error: "Something went wrong" });
  }
};

export async function deleteZapierTriggerHookHandler(
  request: FastifyRequest<{ Body: DeleteZapierHookInput }>,
  reply: FastifyReply,
) {
  try {
    const res = await deleteZapierTriggerHooks(
      request.body as Parameters<typeof deleteZapierTriggerHooks>[0],
      request.user.orgId,
    );
    reply.send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

/**
 * The registry, loaded on first use: providers import services that import
 * this module's service, and a static import here would close that loop.
 */
async function providerByName(name: string) {
  const { getIntegrationProvider } = await import("./providers/registry.js");
  return getIntegrationProvider(name);
}

/** The Sync activity panel: the integration's health, and its recent entries on leads. */
export const getIntegrationActivityHandler = async (
  request: FastifyRequest<{ Params: ByNameParams }>,
  reply: FastifyReply,
) => {
  try {
    const { orgId } = request.user;
    const { name } = request.params;
    const [integration, entries] = await Promise.all([
      getIntegrationByName(orgId, name),
      listIntegrationActivity(orgId, name),
    ]);
    return reply.send({
      health: {
        consecutiveFailures: integration?.consecutiveFailures ?? 0,
        lastError: integration?.lastError ?? null,
        lastErrorAt: integration?.lastErrorAt ?? null,
      },
      entries,
    });
  } catch (error) {
    log.error({ err: error }, "Error fetching integration activity");
    return reply.code(500).send({ error: "Something went wrong" });
  }
};

/**
 * Connects a pasted-key provider after proving the key works.
 *
 * The audit event is written here, by hand: the generic audit hook skips this
 * route (`auditLog.ts`), because it would log `request.body` — a live API key.
 */
export const connectWithApiKeyHandler = async (
  request: FastifyRequest<{ Params: ByNameParams; Body: ApiKeyConnectInput }>,
  reply: FastifyReply,
) => {
  const { name } = request.params;
  try {
    const { orgId } = request.user;
    const provider = await providerByName(name);
    const result = await connectWithApiKey(provider, name, orgId, request.body);
    await recordAuditEvent(request, `${provider?.label ?? name} connected`);
    return reply.send(result ?? { success: true });
  } catch (error) {
    if (error instanceof IntegrationConnectError) {
      return reply.code(error.statusCode).send({ error: error.message });
    }
    log.error({ err: error, provider: name }, "API key connect failed");
    return reply.code(500).send({ error: "Something went wrong" });
  }
};

export const getOAuthAuthorizeUrlHandler = async (
  request: FastifyRequest<{ Params: ByNameParams; Querystring: OAuthAuthorizeQuery }>,
  reply: FastifyReply,
) => {
  try {
    const { orgId, userId } = request.user;
    const { name } = request.params;
    const url = startOAuthConnect(
      await providerByName(name),
      name,
      orgId,
      userId,
      request.query ?? {},
    );
    return reply.send({ url });
  } catch (error) {
    if (error instanceof OAuthConnectError) {
      return reply.code(error.statusCode).send({ error: error.message });
    }
    log.error({ err: error }, "Error building OAuth authorize URL");
    return reply.code(500).send({ error: "Something went wrong" });
  }
};

export const finishOAuthConnectHandler = async (
  request: FastifyRequest<{ Params: ByNameParams; Body: OAuthCallbackInput }>,
  reply: FastifyReply,
) => {
  const { name } = request.params;
  try {
    const { orgId } = request.user;
    await finishOAuthConnect(await providerByName(name), name, orgId, request.body);
    return reply.send({ success: true });
  } catch (error) {
    if (error instanceof OAuthConnectError) {
      return reply.code(error.statusCode).send({ error: error.message });
    }
    // Most often the provider refusing the code: expired, already used, or the
    // redirect URI not matching its console.
    log.error({ err: error, provider: name }, "OAuth connect failed");
    return reply.code(502).send({ error: `Could not connect ${name}` });
  }
};
