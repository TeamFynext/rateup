import { FastifyReply, FastifyRequest } from "fastify";
import {
  createLabel,
  createLostReason,
  createPipeline,
  deleteLabel,
  deleteLostReason,
  deletePipeline,
  getPipelineById,
  getPipelineMembers,
  getTeamPipelineDefaults,
  updateTeamPipelineDefault,
  getPipelines,
  PipelineLimitError,
  TeamAccessError,
  updateLabel,
  updateLostReason,
  updatePipeline,
} from "./pipeline.service.js";
import type {
  CreateLabelRequestSchema,
  CreateLostReasonRequestSchema,
  CreatePipelineRequestSchema,
  UpdateLabelRequestSchema,
  UpdateLostReasonRequestSchema,
  UpdatePipelineRequestSchema,
  UpdateTeamDefaultRequestSchema,
} from "./pipeline.schema.js";

export async function createPipelineHandler(
  request: FastifyRequest<{ Body: CreatePipelineRequestSchema }>,
  reply: FastifyReply,
) {
  try {
    const pipeline = await createPipeline({
      ...request.body,
      orgId: request.user.orgId,
      userId: request.userId,
    });
    return reply.code(201).send(pipeline);
  } catch (error) {
    if (error instanceof TeamAccessError) {
      return reply.code(403).send({ message: error.message, teamIds: error.teamIds });
    }
    if (error instanceof PipelineLimitError) {
      return reply.code(409).send({ message: error.message, limit: error.limit });
    }
    request.log.error(error);
    return reply.code(500).send({ message: "Error creating pipeline" });
  }
}

export async function getPipelinesHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const pipelines = await getPipelines(request.userId, request.user.orgId);
    return reply.code(200).send(pipelines);
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ message: "Error retrieving pipelines" });
  }
}

export async function getPipelineHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  try {
    const pipeline = await getPipelineById(request.params.id);
    if (!pipeline) {
      return reply.code(404).send({ message: "Pipeline not found" });
    }
    return reply.code(200).send(pipeline);
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ message: "Error retrieving pipeline" });
  }
}

export async function updatePipelineHandler(
  request: FastifyRequest<{ Params: { id: string }; Body: UpdatePipelineRequestSchema }>,
  reply: FastifyReply,
) {
  try {
    const pipeline = await updatePipeline(request.params.id, request.body, request.userId);
    return reply.code(200).send(pipeline);
  } catch (error) {
    if (error instanceof TeamAccessError) {
      return reply.code(403).send({ message: error.message, teamIds: error.teamIds });
    }
    request.log.error(error);
    return reply.code(500).send({ message: "Error updating pipeline" });
  }
}

export async function deletePipelineHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  try {
    await deletePipeline(request.params.id);
    return reply.code(204).send();
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ message: "Error deleting pipeline" });
  }
}

export async function getPipelineMembersHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  try {
    const members = await getPipelineMembers(request.params.id);
    return reply.code(200).send(members);
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ message: "Error retrieving pipeline members" });
  }
}

export async function getTeamPipelineDefaultsHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const teams = await getTeamPipelineDefaults(request.user.orgId);
    return reply.code(200).send(teams);
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ message: "Error retrieving team pipelines" });
  }
}

export async function updateTeamPipelineDefaultHandler(
  request: FastifyRequest<{
    Params: { teamId: string };
    Body: UpdateTeamDefaultRequestSchema;
  }>,
  reply: FastifyReply,
) {
  try {
    const team = await updateTeamPipelineDefault(
      request.params.teamId,
      request.user.orgId,
      request.body,
    );
    return reply.code(200).send(team);
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ message: "Error updating the team's pipeline" });
  }
}

export async function createLostReasonHandler(
  request: FastifyRequest<{ Params: { id: string }; Body: CreateLostReasonRequestSchema }>,
  reply: FastifyReply,
) {
  try {
    const reason = await createLostReason(request.params.id, request.body);
    return reply.code(201).send(reason);
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ message: "Error creating lost reason" });
  }
}

export async function updateLostReasonHandler(
  request: FastifyRequest<{ Params: { id: string }; Body: UpdateLostReasonRequestSchema }>,
  reply: FastifyReply,
) {
  try {
    const reason = await updateLostReason(request.params.id, request.body);
    return reply.code(200).send(reason);
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ message: "Error updating lost reason" });
  }
}

export async function deleteLostReasonHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  try {
    await deleteLostReason(request.params.id);
    return reply.code(204).send();
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ message: "Error deleting lost reason" });
  }
}

export async function createLabelHandler(
  request: FastifyRequest<{ Params: { id: string }; Body: CreateLabelRequestSchema }>,
  reply: FastifyReply,
) {
  try {
    const label = await createLabel(request.params.id, request.body);
    return reply.code(201).send(label);
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ message: "Error creating label" });
  }
}

export async function updateLabelHandler(
  request: FastifyRequest<{ Params: { id: string }; Body: UpdateLabelRequestSchema }>,
  reply: FastifyReply,
) {
  try {
    const label = await updateLabel(request.params.id, request.body);
    return reply.code(200).send(label);
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ message: "Error updating label" });
  }
}

export async function deleteLabelHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  try {
    await deleteLabel(request.params.id);
    return reply.code(204).send();
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ message: "Error deleting label" });
  }
}
