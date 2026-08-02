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
  fetchZohoPipelineMeta,
  fetchZohoUsers,
  getIntegrationByZohoChannelId,
  getValidZohoAccessToken,
  syncContactFromZohoRecord,
  syncZohoContacts,
  syncZohoLeads,
} from "./zoho.service.js";
import axios from "axios";
import { getZohoRecordById, registerZohoWebhook, unsubscribeZohoWebhook } from "./zoho.client.js";
import { generateRandomAlphaId } from "../../../../utils/misc/random.utils.js";
import { ZohoProduct } from "./zoho.client.js";
import {
  getZohoCredential,
  zohoErrorDetail,
  type ZohoCredential,
  type ZohoRecord,
  type ZohoWebhookPayload,
} from "./zoho.types.js";

export interface ZohoAuthBody {
  code: string;
}

export interface ZohoAuthQuery {
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

    // Prevent duplicate active integrations
    const existingIntegration = await getIntegrationByName(orgId, IntegratedApps.zoho);

    if (existingIntegration?.active) {
      return reply.code(200).send({
        success: true,
        message: "Zoho already connected",
      });
    }

    const redirect_uri = `${process.env.FRONTEND_URL}/dashboard/settings/integrations/zoho/callback`;

    // Exchange authorization code for tokens
    const response = await axios.post("https://accounts.zoho.in/oauth/v2/token", null, {
      params: {
        grant_type: "authorization_code",
        client_id: process.env.ZOHO_CLIENT_ID,
        client_secret: process.env.ZOHO_CLIENT_SECRET,
        redirect_uri,
        code,
      },
    });

    const { access_token, refresh_token, expires_in, api_domain, scope } = response.data;

    if (!access_token) {
      log.error("Zoho OAuth exchange failed => %o", response.data);

      return reply.code(401).send({
        success: false,
        error: "Failed to retrieve access token",
      });
    }

    log.info("Zoho granted access");

    const supportedProducts = {
      crm: scope.includes("ZohoCRM"),
      bigin: scope.includes("ZohoBigin"),
    };

    // Calculate expiry time
    const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

    const credential: ZohoCredential = {
      access_token,
      refresh_token,
      api_domain,
      scope,
      supportedProducts,
      expires_at: expiresAt,
      triggerSubscriptions: [],
      isWebhookRegistered: false,
    };

    // Generate webhook secret
    const zohoWebhookSecret = generateRandomAlphaId(32);
    credential.zohoWebhookSecret = zohoWebhookSecret;
    log.info("Generated Zoho webhook secret for orgId=%s", orgId);

    try {
      // CRM webhook registration
      if (supportedProducts.crm) {
        const crmWebhook = await registerZohoWebhook({
          accessToken: access_token,
          apiDomain: api_domain,
          product: "crm",
          events: [
            "Contacts.create",
            "Contacts.edit",
            "Contacts.delete",
            "Leads.create",
            "Leads.edit",
            "Leads.delete",
          ],
          zohoWebhookSecret,
        });

        credential.crmWebhook = {
          channelId: crmWebhook.channelId,
          expiry: crmWebhook.expiry,
          product: "crm",
        };
      }

      // Bigin webhook registration
      if (supportedProducts.bigin) {
        const biginWebhook = await registerZohoWebhook({
          accessToken: access_token,
          apiDomain: api_domain,
          product: "bigin",
          events: [
            "Contacts.create",
            "Contacts.edit",
            "Contacts.delete",
            "Deals.create",
            "Deals.edit",
            "Deals.delete",
          ],
          zohoWebhookSecret,
        });

        credential.biginWebhook = {
          channelId: biginWebhook.channelId,
          expiry: biginWebhook.expiry,
          product: "bigin",
        };
      }

      credential.isWebhookRegistered = true;
    } catch (err) {
      log.error({ err: zohoErrorDetail(err) }, "Failed to register Zoho webhook");
      credential.isWebhookRegistered = false;
    }

    // Save integration
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
  } catch (error) {
    log.error({ err: zohoErrorDetail(error) }, "Zoho authentication error");

    return reply.code(500).send({
      success: false,
      error: "Zoho authentication failed",
    });
  }
}

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
    const { orgId, product = "crm" } = request.query;

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
    const { orgId } = request.query;

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

export const handleZohoWebhook = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { product } = request.params as {
      product: ZohoProduct;
    };

    const payload = request.body as ZohoWebhookPayload;

    log.info("Received Zoho webhook for product=%s", product);

    if (!payload?.channel_id || !payload?.token || !payload?.ids) {
      return reply.code(400).send({
        success: false,
        error: "Invalid webhook payload",
      });
    }

    const integration = await getIntegrationByZohoChannelId(payload.channel_id);

    if (!integration) {
      return reply.code(404).send({
        success: false,
        error: "Integration not found",
      });
    }
    if (!integration.orgId) {
      throw new Error(`Zoho integration ${integration.id} has no orgId set`);
    }
    const orgId = integration.orgId;

    const credential = getZohoCredential(integration);

    if (credential.zohoWebhookSecret !== payload.token) {
      return reply.code(401).send({
        success: false,
        error: "Invalid webhook token",
      });
    }

    const accessToken = await getValidZohoAccessToken(integration);
    const recordId = payload.ids?.[0];

    if (!recordId) {
      return reply.code(400).send({
        success: false,
        error: "Missing record id",
      });
    }

    let record: ZohoRecord | null = null;

    if (product === "crm") {
      switch (payload.module) {
        case "Leads": {
          const response = await getZohoRecordById(
            accessToken,
            "Leads",
            recordId,
            credential.api_domain,
            "crm",
          );

          record = response.data?.[0];
          // sync local contact
          await syncContactFromZohoRecord({
            orgId,
            product: "crm",
            module: "Leads",
            zohoRecord: record ?? {},
            credential,
          });

          break;
        }

        case "Contacts": {
          const response = await getZohoRecordById(
            accessToken,
            "Contacts",
            recordId,
            credential.api_domain,
            "crm",
          );

          record = response.data?.[0];
          // sync local contact
          await syncContactFromZohoRecord({
            orgId,
            product: "crm",
            module: "Contacts",
            zohoRecord: record ?? {},
            credential,
          });

          break;
        }

        default:
          log.warn("Unsupported CRM module => %s", payload.module);
      }
    }

    if (product === "bigin") {
      switch (payload.module) {
        case "Contacts": {
          const response = await getZohoRecordById(
            accessToken,
            "Contacts",
            recordId,
            credential.api_domain,
            "bigin",
          );

          record = response.data?.[0];
          // sync local contact
          await syncContactFromZohoRecord({
            orgId,
            product: "bigin",
            module: "Contacts",
            zohoRecord: record ?? {},
            credential,
          });

          break;
        }

        // Pipelines internally = Deals
        case "Deals": {
          const response = await getZohoRecordById(
            accessToken,
            "Deals",
            recordId,
            credential.api_domain,
            "bigin",
          );

          record = response.data?.[0];
          // sync lifecycle/contact
          await syncContactFromZohoRecord({
            orgId,
            product: "bigin",
            module: "Deals",
            zohoRecord: record ?? {},
            credential,
          });

          break;
        }

        default:
          log.warn("Unsupported Bigin module => %s", payload.module);
      }
    }

    return reply.code(200).send({
      success: true,
    });
  } catch (error) {
    log.error({ err: error }, "Error handling Zoho webhook");

    return reply.code(500).send({
      success: false,
      error: "Internal server error",
    });
  }
};
export const disconnectZohoIntegrationHandler = async (
  request: FastifyRequest<{
    Params: {
      orgId: string;
    };
  }>,
  reply: FastifyReply,
) => {
  try {
    // The session's org, not the path's: the route carries checkSession now, and the
    // path parameter is kept only so the existing URL still works. See issues.txt 26.7.
    const orgId = request.user.orgId;

    if (!orgId) {
      return reply.code(400).send({
        success: false,
        error: "Missing orgId",
      });
    }

    const integration = await getIntegrationByName(orgId, IntegratedApps.zoho);

    if (!integration) {
      return reply.code(404).send({
        success: false,
        error: "Zoho integration not found",
      });
    }
    const credential = getZohoCredential(integration);
    const accessToken = credential.access_token;
    const apiDomain = credential.api_domain;

    // Unsubscribe CRM webhook
    if (credential.crmWebhook?.channelId) {
      try {
        await unsubscribeZohoWebhook({
          accessToken,
          apiDomain,
          product: "crm",
          channelIds: [credential.crmWebhook.channelId],
        });

        log.info("CRM webhook unsubscribed successfully for orgId=%s", orgId);
      } catch (err) {
        log.error({ err }, "Failed to unsubscribe CRM webhook");
      }
    }

    // Unsubscribe Bigin webhook
    if (credential.biginWebhook?.channelId) {
      try {
        await unsubscribeZohoWebhook({
          accessToken,
          apiDomain,
          product: "bigin",
          channelIds: [credential.biginWebhook.channelId],
        });

        log.info("Bigin webhook unsubscribed successfully for orgId=%s", orgId);
      } catch (err) {
        log.error({ err }, "Failed to unsubscribe Bigin webhook");
      }
    }

    // Revoke OAuth token
    try {
      await axios.post("https://accounts.zoho.in/oauth/v2/token/revoke", null, {
        params: {
          token: credential.refresh_token,
        },
      });

      log.info("Zoho token revoked successfully for orgId=%s", orgId);
    } catch (err) {
      log.error({ err }, "Failed to revoke Zoho token");
    }

    log.info("Zoho integration disconnected successfully for orgId=%s", orgId);

    return reply.code(200).send({
      success: true,
      message: "Zoho disconnected successfully",
    });
  } catch (error) {
    log.error({ err: error }, "Error disconnecting Zoho integration");

    return reply.code(500).send({
      success: false,
      error: "Failed to disconnect Zoho integration",
    });
  }
};
