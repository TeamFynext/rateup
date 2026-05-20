import { FastifyReply, FastifyRequest } from "fastify";
import { log } from "../../../../utils/logger.js";
import {
  createIntegration,
  getIntegrationByName,
  updateIntegrationByName,
} from "../../integrations.service.js";
import { IntegratedApps } from "../../../../types/enums.js";
import {
  fetchZohoContacts,
  fetchZohoLeads,
  syncZohoContacts,
  syncZohoLeads,
} from "./zoho.service.js";
import axios from "axios";

interface ZohoAuthBody {
  code: string;
}

interface ZohoAuthQuery {
  orgId: string;
}

export async function zohoAuthenticationHandler(
  request: FastifyRequest<{
    Querystring: ZohoAuthQuery;
    Body: ZohoAuthBody;
  }>,
  reply: FastifyReply,
) {
  try {
    const { code } = request.body;
    const { orgId } = request.query;

    if (!code || !orgId) {
      return reply.code(400).send({
        success: false,
        error: "Missing code or orgId",
      });
    }

    log.info("Starting Zoho OAuth authentication for orgId=%s", orgId);

    const redirect_uri = `${process.env.FRONTEND_URL}/dashboard/settings/integrations/zoho/callback`;

    // Exchange authorization code for tokens
    const response = await axios.post(
      "https://accounts.zoho.in/oauth/v2/token",
      null,
      {
        params: {
          grant_type: "authorization_code",
          client_id: process.env.ZOHO_CLIENT_ID,
          client_secret: process.env.ZOHO_CLIENT_SECRET,
          redirect_uri: redirect_uri,
          code,
        },
      },
    );

    const { access_token, refresh_token, expires_in, api_domain, scope } =
      response.data;

    if (!access_token) {
      log.error("Zoho OAuth exchange failed => %o", response.data);

      return reply.code(401).send({
        success: false,
        error: "Failed to retrieve access token",
      });
    }

    // Calculate expiry time
    const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

    const credential = {
      access_token,
      refresh_token,
      api_domain,
      scope,
      expires_at: expiresAt,
      triggerSubscriptions: [],
    };

    // Check existing integration
    const existingIntegration = await getIntegrationByName(
      orgId,
      IntegratedApps.zoho,
    );

    if (existingIntegration) {
      await updateIntegrationByName(orgId, IntegratedApps.zoho, {
        credential,
        active: true,
      });

      log.info("Zoho integration updated successfully for orgId=%s", orgId);
    } else {
      await createIntegration(
        {
          name: IntegratedApps.zoho,
          credential,
        },
        orgId,
      );

      log.info("Zoho integration created successfully for orgId=%s", orgId);
    }

    return reply.code(200).send({
      success: true,
      message: "Zoho connected successfully",
    });
  } catch (error: any) {
    log.error(
      "Zoho authentication error => %o",
      error?.response?.data || error,
    );

    return reply.code(500).send({
      success: false,
      error: "Zoho authentication failed",
    });
  }
}

export async function syncZohoContactsHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const orgId = request.user.orgId;

    if (!orgId) {
      return reply.code(400).send({
        success: false,
        error: "Missing orgId",
      });
    }

    await syncZohoContacts(orgId);

    return reply.send({
      success: true,
      message: "Zoho contact sync completed",
    });
  } catch (error) {
    log.error("Zoho sync controller error => %o", error);

    return reply.code(500).send({
      success: false,
      error: "Failed to sync Zoho contacts",
    });
  }
}

export async function syncZohoLeadsHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
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
    log.error("Zoho sync controller error => %o", error);

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
    };
  }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.query;

    if (!orgId) {
      return reply.code(400).send({
        success: false,
        error: "Missing orgId",
      });
    }

    const contacts = await fetchZohoContacts(orgId);

    return reply.send({
      success: true,
      contacts,
    });
  } catch (error) {
    log.error("Get Zoho contacts error => %o", error);

    return reply.code(500).send({
      success: false,
      error: "Failed to fetch Zoho contacts",
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
    const { orgId } = request.query;

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
    log.error("Get Zoho leads error => %o", error);

    return reply.code(500).send({
      success: false,
      error: "Failed to fetch Zoho leads",
    });
  }
}
