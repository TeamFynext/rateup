import {
  createIntegration,
  deleteIntegrationById,
  getAllIntegrations,
  getIntegrationByName,
  updateIntegrationById,
} from "./integrations.service";
import { log } from "../../utils/logger";
import { FastifyReply, FastifyRequest } from "fastify";
import {
  ByIdParams,
  ByNameParams,
  IntegrationSchema,
} from "./integrations.schema";

export const getAllIntegrationsHandler = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  try {
    const { orgId } = request.user;
    const data = await getAllIntegrations(orgId);
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
    const data = await getIntegrationByName(orgId, request.params.name);
    reply.send(data?.[0]);
  } catch (error) {
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
    const data = await createIntegration(orgId, request.body);
    reply.send(data);
  } catch (error) {
    log.error("Error creating integration by name");
    return reply.code(500).send({ error: "Something went wrong" });
  }
};

export const updateIntegrationByIdHandler = async (
  request: FastifyRequest<{ Params: ByIdParams; Body: IntegrationSchema }>,
  reply: FastifyReply,
) => {
  try {
    const data = await updateIntegrationById(request.params.id, request.body);
    reply.send(data);
  } catch (error) {
    log.error("Error fetching integration by name");
    return reply.code(500).send({ error: "Something went wrong" });
  }
};

export const deleteIntegrationByIdHandler = async (
  request: FastifyRequest<{ Params: ByIdParams }>,
  reply: FastifyReply,
) => {
  try {
    const data = await deleteIntegrationById(request.params.id);
    reply.send(data);
  } catch (error) {
    log.error("Error deleting integration by id");
    return reply.code(500).send({ error: "Something went wrong" });
  }
};
