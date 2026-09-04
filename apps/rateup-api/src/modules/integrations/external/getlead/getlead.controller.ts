import { FastifyReply, FastifyRequest } from "fastify";

import { recordAuditEvent } from "../../../../utils/auditLog.js";
import { log } from "../../../../utils/logger.js";
import {
  connectGetLead,
  getCachedGetLeadMeta,
  getGetLeadIntegration,
  getGetLeadSettings,
  GetLeadConnectionError,
  saveGetLeadSettings,
} from "./getlead.service.js";
import { getGetLeadCredential } from "./getlead.types.js";
import { maskGetLeadApiKey } from "./getlead.utils.js";
import type {
  GetLeadConnectBody,
  GetLeadMetaQuery,
  GetLeadSettingsBody,
} from "./getlead.schema.js";

/** Turns a GetLeadConnectionError into its own status; anything else is a 500. */
function replyWithError(reply: FastifyReply, error: unknown, context: string) {
  if (error instanceof GetLeadConnectionError) {
    return reply.code(error.status).send({ error: error.message });
  }
  log.error("%s: %s", context, error);
  return reply.code(500).send({ error: "Something went wrong" });
}

/**
 * Saves a pasted API key after proving it works.
 *
 * Deliberately not the generic `POST /integrations`: that stores whatever it is
 * given, so a typo would only surface later as leads quietly failing to sync.
 */
export async function connectGetLeadHandler(
  request: FastifyRequest<{ Body: GetLeadConnectBody }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const { apiKey, baseUrl } = request.body;
    const result = await connectGetLead(orgId, apiKey, baseUrl);

    // Recorded by hand because this route is on the audit hook's skip list: the
    // generic hook logs `request.body`, and the body is a live API key. Only the
    // fact of the connection is written, never the credential.
    await recordAuditEvent(request, "GetLead connected");

    return reply.code(200).send(result);
  } catch (error) {
    return replyWithError(reply, error, "Error connecting GetLead");
  }
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
