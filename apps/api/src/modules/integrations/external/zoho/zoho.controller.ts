import { FastifyReply, FastifyRequest } from "fastify";
import { log } from "../../../../utils/logger.js";
import {
  InboundWebhookRejected,
  type InboundWebhookRequest,
} from "../../shared/inboundWebhookContract.js";
import { ZohoProduct } from "./zoho.client.js";
import {
  fetchZohoContacts,
  fetchZohoLeads,
  syncZohoContacts,
  syncZohoLeads,
} from "./zoho.import.js";
import { findIntegrationByZohoChannel, handleZohoInbound } from "./zoho.inbound.js";
import { fetchZohoPipelineMeta, fetchZohoUsers } from "./zoho.meta.js";
import type { ZohoWebhookPayload } from "./zoho.types.js";

export async function syncZohoContactsHandler(
  request: FastifyRequest<{
    Querystring: {
      product?: ZohoProduct;
    };
  }>,
  reply: FastifyReply,
) {
  try {
    const orgId = request.user.orgId;
    const { product = "crm" } = request.query;
    if (!orgId) {
      return reply.code(400).send({
        success: false,
        error: "Missing orgId",
      });
    }
    await syncZohoContacts(orgId, product);
    return reply.send({
      success: true,
      message: `${product} contact sync completed`,
    });
  } catch (error) {
    log.error({ err: error }, "Zoho sync controller error");

    return reply.code(500).send({
      success: false,
      error: "Failed to sync contacts",
    });
  }
}

export async function syncZohoLeadsHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const orgId = request.user.orgId;

    if (!orgId) {
      return reply.code(400).send({
        success: false,
        error: "Missing orgId",
      });
    }

    await syncZohoLeads(orgId);

    return reply.send({
      success: true,
      message: "Zoho leads sync completed",
    });
  } catch (error) {
    log.error({ err: error }, "Zoho sync controller error");

    return reply.code(500).send({
      success: false,
      error: "Failed to sync Zoho leads",
    });
  }
}

export async function getZohoContactsHandler(
  request: FastifyRequest<{
    Querystring: {
      orgId: string;
      product?: ZohoProduct;
    };
  }>,
  reply: FastifyReply,
) {
  try {
    const { product = "crm" } = request.query;
    // The caller's own org. A query parameter here read another org's contacts
    // through that org's stored Zoho credentials.
    const { orgId } = request.user;

    if (!orgId) {
      return reply.code(400).send({
        success: false,
        error: "Missing orgId",
      });
    }

    const contacts = await fetchZohoContacts(orgId, product);

    return reply.send({
      success: true,
      contacts,
    });
  } catch (error) {
    log.error({ err: error }, "Get Zoho contacts error");

    return reply.code(500).send({
      success: false,
      error: "Failed to fetch contacts",
    });
  }
}

export async function getZohoUsersHandler(
  request: FastifyRequest<{
    Querystring: {
      orgId: string;
    };
  }>,
  reply: FastifyReply,
) {
  try {
    // The caller's own org, not a query parameter — see the contacts handler.
    const { orgId } = request.user;

    if (!orgId) {
      return reply.code(400).send({
        success: false,
        error: "Missing orgId",
      });
    }

    const users = await fetchZohoUsers(orgId);

    return reply.send({
      success: true,
      users,
    });
  } catch (error) {
    log.error({ err: error }, "Get Zoho users error");

    return reply.code(500).send({
      success: false,
      error: "Failed to fetch Zoho users",
    });
  }
}

export async function getZohoLeadsHandler(
  request: FastifyRequest<{
    Querystring: {
      orgId: string;
    };
  }>,
  reply: FastifyReply,
) {
  try {
    // The caller's own org, not a query parameter — see the contacts handler.
    const { orgId } = request.user;

    if (!orgId) {
      return reply.code(400).send({
        success: false,
        error: "Missing orgId",
      });
    }

    const leads = await fetchZohoLeads(orgId);

    return reply.send({
      success: true,
      leads,
    });
  } catch (error) {
    log.error({ err: error }, "Get Zoho leads error");

    return reply.code(500).send({
      success: false,
      error: "Failed to fetch Zoho leads",
    });
  }
}

export async function getZohoPipelinesHandler(
  request: FastifyRequest<{
    Querystring: {
      product?: ZohoProduct;
    };
  }>,
  reply: FastifyReply,
) {
  try {
    const { product = "bigin" } = request.query;
    const orgId = request.user.orgId;
    if (!orgId) {
      return reply.code(400).send({
        success: false,
        error: "Missing orgId",
      });
    }
    const pipelines = await fetchZohoPipelineMeta(orgId, product);
    return reply.send(pipelines);
  } catch (error) {
    log.error({ err: error }, "Get Zoho pipelines error");

    return reply.code(500).send({
      success: false,
      error: "Failed to fetch pipelines",
    });
  }
}

/**
 * The address Zoho channels registered before the move to the shared receiver
 * deliver to. The scheduled refresh re-registers every channel at the new
 * address, so after one refresh cycle nothing arrives here; until then a
 * delivery is found by its channel id and handled exactly as the shared
 * receiver would. Remove once a release has passed.
 */
export const handleZohoWebhook = async (request: FastifyRequest, reply: FastifyReply) => {
  const channelId = (request.body as ZohoWebhookPayload | undefined)?.channel_id;
  const integration = channelId ? await findIntegrationByZohoChannel(channelId) : null;
  if (!integration) {
    return reply.code(404).send({ success: false, error: "Integration not found" });
  }

  try {
    await handleZohoInbound(integration, request as InboundWebhookRequest);
  } catch (error) {
    if (error instanceof InboundWebhookRejected) {
      return reply.code(401).send({ success: false, error: "Invalid webhook token" });
    }
    log.error({ err: error }, "Error handling Zoho webhook");
    return reply.code(500).send({ success: false, error: "Internal server error" });
  }
  return reply.code(200).send({ success: true });
};
