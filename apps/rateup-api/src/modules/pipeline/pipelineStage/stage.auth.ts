import { FastifyReply, FastifyRequest } from "fastify";
import { isPipelineAccessible } from "../pipeline.service.js";
import { getPipelineIdByStageId } from "./stage.service.js";

const FORBIDDEN = { message: "You don't have access to this pipeline" };

export async function verifyStageAccess(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const pipelineId = await getPipelineIdByStageId(request.params.id);
  if (!pipelineId) {
    return reply.code(404).send({ message: "Stage not found" });
  }
  if (!(await isPipelineAccessible(pipelineId, request.actor))) {
    return reply.code(403).send(FORBIDDEN);
  }
}

export async function verifyStagesReorderAccess(
  request: FastifyRequest<{ Body: { pipelineId: string } }>,
  reply: FastifyReply,
) {
  if (!(await isPipelineAccessible(request.body.pipelineId, request.actor))) {
    return reply.code(403).send(FORBIDDEN);
  }
}
