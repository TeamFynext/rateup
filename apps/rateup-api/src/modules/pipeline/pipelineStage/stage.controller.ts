import { FastifyReply, FastifyRequest } from "fastify";
import {
  createStage,
  deleteStage,
  reorderStages,
  StageNotEmptyError,
  updateStage,
} from "./stage.service.js";
import type {
  CreateStageRequestSchema,
  ReorderStagesRequestSchema,
  UpdateStageRequestSchema,
} from "./stage.schema.js";

export async function createStageHandler(
  request: FastifyRequest<{ Body: CreateStageRequestSchema }>,
  reply: FastifyReply,
) {
  try {
    const stage = await createStage(request.body);
    return reply.code(201).send(stage);
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ message: "Error creating stage" });
  }
}

export async function updateStageHandler(
  request: FastifyRequest<{ Params: { id: string }; Body: UpdateStageRequestSchema }>,
  reply: FastifyReply,
) {
  try {
    const stage = await updateStage(request.params.id, request.body);
    return reply.code(200).send(stage);
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ message: "Error updating stage" });
  }
}

export async function deleteStageHandler(
  request: FastifyRequest<{
    Params: { id: string };
    Querystring: { moveLeadsToStageId?: string };
  }>,
  reply: FastifyReply,
) {
  try {
    await deleteStage(request.params.id, request.query.moveLeadsToStageId);
    return reply.code(204).send();
  } catch (error) {
    if (error instanceof StageNotEmptyError) {
      return reply.code(409).send({ message: error.message, leadCount: error.leadCount });
    }
    request.log.error(error);
    return reply.code(500).send({ message: "Error deleting stage" });
  }
}

export async function reorderStagesHandler(
  request: FastifyRequest<{ Body: ReorderStagesRequestSchema }>,
  reply: FastifyReply,
) {
  try {
    const stages = await reorderStages(request.body.pipelineId, request.body.stages);
    return reply.code(200).send(stages);
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ message: "Error reordering stages" });
  }
}
