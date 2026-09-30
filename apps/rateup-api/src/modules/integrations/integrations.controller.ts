import {
  createIntegration,
  createWaPaymentConfigurations,
  deleteIntegrationByName,
  deleteWaPaymentConfiguration,
  deleteZapierTriggerHooks,
  getAllIntegrationsByOrgId,
  getGoogleAuthUrl,
  getIntegrationByName,
  getIntegrationByPetPoojaRestaurantId,
  getRegenerateWaPaymentConfigOauth,
  getWaPaymentConfigByName,
  getWaPaymentConfigurations,
  initializeAuthClient,
  removeSurveySpreadSheetSheetId,
  updateIntegrationByName,
} from "./integrations.service.js";
import { log } from "../../utils/logger.js";
import { FastifyReply, FastifyRequest } from "fastify";
import {
  ByNameParams,
  DeleteZapierHookInput,
  IntegrationSchema,
  OAuthCallbackInput,
  UpdateIntgrationInput,
  WaPaymentCreateSchema,
} from "./integrations.schema.js";
import { IntegratedApps } from "../../types/enums.js";
import { parsePhoneNumber } from "libphonenumber-js";
import { listIntegrationActivity } from "./external/integrationActivity.js";
import { finishOAuthConnect, OAuthConnectError, startOAuthConnect } from "./shared/oauthConnect.js";

/**
 * Strips the Shopify token pair before an integration leaves the API. The UI
 * reads only the shop domain; the tokens (the refresh token mints new access
 * tokens for 90 days) never need to reach a browser.
 */
function redactIntegration<T extends { name: string; credential: unknown } | null>(
  integration: T,
): T {
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

export const getWaPaymentConfigurationsHandler = async (
  request: FastifyRequest<{ Querystring: { whatsappSettingsId?: string } }>,
  reply: FastifyReply,
) => {
  try {
    const { orgId } = request.user;
    const { whatsappSettingsId } = request.query;
    const data = await getWaPaymentConfigurations(orgId, false, whatsappSettingsId);
    reply.code(200).send(data);
  } catch (error) {
    log.error("Error fetching integration by name");
    return reply.code(500).send(error);
  }
};
export const getRegenerateWaPaymentConfigOauthHandler = async (
  request: FastifyRequest<{
    Params: ByNameParams;
  }>,
  reply: FastifyReply,
) => {
  try {
    const { orgId } = request.user;
    await getRegenerateWaPaymentConfigOauth(orgId, request.params.name);
    reply.code(204).send();
  } catch (error) {
    log.error("Error regenerating wa config oauth link");
    return reply.code(500).send(error);
  }
};
export const getWaPaymentConfigByNameHandler = async (
  request: FastifyRequest<{
    Params: ByNameParams;
  }>,
  reply: FastifyReply,
) => {
  try {
    const { orgId } = request.user;
    await getWaPaymentConfigByName(orgId, request.params.name);
    reply.code(204).send();
  } catch (error) {
    log.error("Error getting wa config by name ");
    return reply.code(500).send(error);
  }
};

export const createWaPaymentConfigurationsHandler = async (
  request: FastifyRequest<{
    Body: WaPaymentCreateSchema;
  }>,
  reply: FastifyReply,
) => {
  try {
    const { orgId } = request.user;
    const data = await createWaPaymentConfigurations(orgId, request.body);
    if (!data) {
      reply.code(400).send({ message: "Error in creating whatsapp payment" });
      return;
    }
    reply.code(201).send({ message: "Payment configuration created" });
  } catch (error) {
    log.error("Error creating whatsapp payment");
    return reply.code(500).send(error);
  }
};

export const deleteWaPaymentConfigurationHandler = async (
  request: FastifyRequest<{ Params: ByNameParams }>,
  reply: FastifyReply,
) => {
  try {
    const { orgId } = request.user;
    await deleteWaPaymentConfiguration(orgId, request.params.name);
    reply.code(204).send();
  } catch (error) {
    log.error("Error deleting whatsapp payment");
    return reply.code(500).send(error);
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
    if (name === IntegratedApps.googlesheet) await removeSurveySpreadSheetSheetId(orgId);

    reply.send(data);
  } catch {
    log.error("Error deleting integration by name");
    return reply.code(500).send({ error: "Something went wrong" });
  }
};

export async function getGoogleAuthUrlForSheetHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const url = await getGoogleAuthUrl();
    reply.code(200).send(url);
  } catch {
    return reply.code(500).send({ error: "Something went wrong" });
  }
}

export async function createGoogleSheetAuthToken(
  request: FastifyRequest<{
    Body: {
      code: string;
    };
  }>,
  reply: FastifyReply,
) {
  try {
    const code = request.body.code;
    const oauth2Client = await initializeAuthClient();
    const { tokens } = await oauth2Client.getToken(code);
    if (!tokens.access_token)
      throw new Error("Google OAuth response did not include an access token");
    const { email } = await oauth2Client.getTokenInfo(tokens.access_token);
    // Chosen later, when the user picks a Drive folder to export sheets into.
    const driveFolderId: string | null = null;
    const data = {
      name: IntegratedApps.googlesheet,
      credential: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiryDate: tokens.expiry_date,
        scopes: tokens.scope ? tokens.scope.split(" ") : [],
        userEmail: email,
        driveFolderId,
      },
    };
    await createIntegration(data, request.user.orgId);
    reply.code(201).send({ message: "success" });
  } catch (error) {
    console.error(error);
    reply.code(500).send();
  }
}

/** The order webhook PetPooja posts; only the restaurant and customer are read. */
interface PetPoojaWebhookBody {
  properties: {
    Restaurant: { restID: string };
    Customer: { phone: string };
  };
}

export async function petPoojaWebhookHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const {
      properties: { Restaurant, Customer },
    } = request.body as PetPoojaWebhookBody;
    const restaurantID = Restaurant.restID;
    const integration = await getIntegrationByPetPoojaRestaurantId(restaurantID);
    const customerPhone = parsePhoneNumber(Customer.phone, "IN");
    console.log("request.body petpooja", request.body);
    if (customerPhone.isValid() === false) {
      log.trace("Invalid phone number");
      return reply.code(403).send("Invalid phone number");
    }
    if (!integration || !integration?.credential?.orderEvent)
      return reply
        .code(404)
        .send(!integration ? "No Integration found" : "No order event configuration found");

    // await sendWaTemplateOnPetpoojaOrder(integration, customer);
    reply.code(200).send("Success: The API call executed successfully.");
  } catch (e) {
    log.error(e);
    reply.code(500).send();
  }
}

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

export const getOAuthAuthorizeUrlHandler = async (
  request: FastifyRequest<{ Params: ByNameParams }>,
  reply: FastifyReply,
) => {
  try {
    const { orgId, userId } = request.user;
    const { name } = request.params;
    const url = startOAuthConnect(await providerByName(name), name, orgId, userId);
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
