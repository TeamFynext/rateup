import { FastifyReply, FastifyRequest } from "fastify";

import { log } from "../../../../utils/logger.js";
import { IntegrationConnectError } from "../../shared/oauthConnectError.js";
import { getCachedGetLeadMeta } from "./getlead.connect.js";
import { getGetLeadIntegration } from "./getlead.credential.js";
import { getGetLeadSettings, saveGetLeadSettings } from "./getlead.settings.js";
import { getGetLeadCredential } from "./getlead.types.js";
import { maskGetLeadApiKey } from "./getlead.utils.js";
import type { GetLeadMetaQuery, GetLeadSettingsBody } from "./getlead.schema.js";

/** Turns an IntegrationConnectError into its own status; anything else is a 500. */
function replyWithError(reply: FastifyReply, error: unknown, context: string) {
  if (error instanceof IntegrationConnectError) {
    return reply.code(error.statusCode).send({ error: error.message });
  }
  log.error("%s: %s", context, error);
  return reply.code(500).send({ error: "Something went wrong" });
}

/** Reference data for the settings screen: sources, statuses, purposes. */
export async function getGetLeadMetaHandler(
  request: FastifyRequest<{ Querystring: GetLeadMetaQuery }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const meta = await getCachedGetLeadMeta(orgId, request.query.refresh === true);
    return reply.code(200).send({ data: meta });
  } catch (error) {
    return replyWithError(reply, error, "Error fetching GetLead meta");
  }
}

/**
 * Connection state for the settings card.
 *
 * The API key itself is never returned — only `keyPreview`, a masked rendering
 * of it. The card shows that to name the stored key; changing it is still a
 * re-paste, since there is nothing editable in a mask.
 */
export async function getGetLeadStatusHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { orgId } = request.user;
    const integration = await getGetLeadIntegration(orgId);

    if (!integration) {
      return reply.code(200).send({ connected: false });
    }

    const credential = getGetLeadCredential(integration);
    return reply.code(200).send({
      connected: Boolean(credential.apiKey),
      keyPreview: maskGetLeadApiKey(credential.apiKey),
      active: integration.active,
      metaFetchedAt: credential.meta?.fetchedAt ?? null,
      connectedAt: integration.createdAt,
    });
  } catch (error) {
    return replyWithError(reply, error, "Error fetching GetLead status");
  }
}

/** Current stage mappings, defaults and trigger toggles. */
export async function getGetLeadSettingsHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { orgId } = request.user;
    return reply.code(200).send(await getGetLeadSettings(orgId));
  } catch (error) {
    return replyWithError(reply, error, "Error fetching GetLead settings");
  }
}

/**
 * Saves stage mappings, defaults and trigger toggles.
 *
 * Merges rather than replaces the credential, so a mapping save cannot drop the
 * stored API key — see `mergeGetLeadCredential`.
 */
export async function saveGetLeadSettingsHandler(
  request: FastifyRequest<{ Body: GetLeadSettingsBody }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    return reply.code(200).send(await saveGetLeadSettings(orgId, request.body));
  } catch (error) {
    return replyWithError(reply, error, "Error saving GetLead settings");
  }
}
