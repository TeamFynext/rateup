import {
  createIntegration,
  createWaPaymentConfigurations,
  deleteIntegrationByName,
  deleteWaPaymentConfiguration,
  getAllIntegrations,
  getAllIntegrationsByOrgId,
  getGoogleAuthUrl,
  getIntegrationByName,
  getRegenerateWaPaymentConfigOauth,
  getWaPaymentConfigByName,
  getWaPaymentConfigurations,
  initializeAuthClient,
  removeSurveySpreadSheetSheetId,
  updateIntegrationByName,
} from "./integrations.service";
import { log } from "../../utils/logger";
import { FastifyReply, FastifyRequest } from "fastify";
import {
  ByIdParams,
  ByNameParams,
  IntegrationSchema,
  UpdateIntgrationInput,
  WaPaymentCreateSchema,
} from "./integrations.schema";
import { IntegratedApps } from "../../types/enums";

export const getAllIntegrationsByOrgHandler = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  try {
    const { orgId } = request.user;
    const data = await getAllIntegrationsByOrgId(orgId);
    reply.send(data);
  } catch (error) {
    log.error("Error fetching all integrations");
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
  } catch (error) {
    log.error("Error fetching integration by name");
    return reply.code(500).send({ error: "Something went wrong" });
  }
};

export async function getAllIntegrationsHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const integrations = await getAllIntegrations();
    reply.code(200).send(integrations);
  } catch (e) {
    log.error("Error fetching all integrations %o", e);
    reply.code(500).send(e);
  }
}

export const getWaPaymentConfigurationsHandler = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  try {
    const { orgId } = request.user;
    const data = await getWaPaymentConfigurations(orgId);
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
    reply
      .code(data ? 201 : 400)
      .send(!data && "Error in creating whatsapp payment");
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
  } catch (error) {
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
    log.error("Error fetching integration by name");
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
    if (name === IntegratedApps.googlesheet)
      await removeSurveySpreadSheetSheetId(orgId);

    reply.send(data);
  } catch (error) {
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
  } catch (e) {
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
    let res = await createIntegration(data, request.user.orgId);
    reply.code(201).send({ message: "success" });
  } catch (error) {
    console.error(error);
    reply.code(500).send();
  }
}
