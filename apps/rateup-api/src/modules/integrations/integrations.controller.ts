import {
  createIntegration,
  createWaPaymentConfigurations,
  deleteIntegrationByName,
  deleteWaPaymentConfiguration,
  deleteZapierTriggerHooks,
  getAllIntegrations,
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
  IntegrationSchema,
  UpdateIntgrationInput,
  WaPaymentCreateSchema,
} from "./integrations.schema.js";
import { IntegratedApps } from "../../types/enums.js";
import { parsePhoneNumber } from "libphonenumber-js";

export const getAllIntegrationsByOrgHandler = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  try {
    const { orgId } = request.user;
    const data = await getAllIntegrationsByOrgId(orgId);
    reply.send(data);
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
    const statuses = Object.values(IntegratedApps).map((app) => ({
      name: app,
      isConnected: integrations.some((int) => int.name === app),
    }));
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
    reply.code(200).send(data);
  } catch {
    log.error("Error fetching integration by name");
    return reply.code(500).send({ error: "Something went wrong" });
  }
};

export async function getAllIntegrationsHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const integrations = await getAllIntegrations();
    reply.code(200).send(integrations);
  } catch (e) {
    log.error("Error fetching all integrations %o", e);
    reply.code(500).send(e);
  }
}

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
    reply.code(data ? 201 : 400).send(!data && "Error in creating whatsapp payment");
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
    reply.send(data);
  } catch (error) {
    console.error(error);
    log.error("Error updating integration by name => %o", error);
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
    const { email } = await oauth2Client.getTokenInfo(tokens.access_token);
    const data = {
      name: IntegratedApps.googlesheet,
      credential: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiryDate: tokens.expiry_date,
        scopes: tokens.scope.split(","),
        userEmail: email,
        driveFolderId: null,
      },
    };
    await createIntegration(data, request.user.orgId);
    reply.code(201).send({ message: "success" });
  } catch (error) {
    console.error(error);
    reply.code(500).send();
  }
}

export async function petPoojaWebhookHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const {
      properties: { Restaurant, Customer },
    } = request.body as any;
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

export async function deleteZapierTriggerHookHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const res = await deleteZapierTriggerHooks(request.body as any, request.user.orgId);
    reply.send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}
