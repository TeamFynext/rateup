import { FastifyReply, FastifyRequest } from "fastify";
import {
  getPipelineIdByLabelId,
  getPipelineIdByLostReasonId,
  isPipelineAccessible,
} from "./pipeline.service.js";

const FORBIDDEN = { message: "You don't have access to this pipeline" };

/** Guards routes whose `:id` param is the pipeline id itself. */
export async function verifyPipelineAccess(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  if (!(await isPipelineAccessible(request.params.id, request.actor))) {
    return reply.code(403).send(FORBIDDEN);
  }
}

/** Guards creates, where the pipeline id arrives in the body. */
export async function verifyPipelineAccessFromBody(
  request: FastifyRequest<{ Body: { pipelineId: string } }>,
  reply: FastifyReply,
) {
  if (!(await isPipelineAccessible(request.body.pipelineId, request.actor))) {
    return reply.code(403).send(FORBIDDEN);
  }
}

/** Guards list reads, where the pipeline id arrives in the query string. */
export async function verifyPipelineAccessFromQuery(
  request: FastifyRequest<{ Querystring: { pipelineId: string } }>,
  reply: FastifyReply,
) {
  if (!(await isPipelineAccessible(request.query.pipelineId, request.actor))) {
    return reply.code(403).send(FORBIDDEN);
  }
}

export async function verifyOwnerForTeamChange(
  request: FastifyRequest<{ Params: { id: string }; Body: { teamIds?: string[] } }>,
  reply: FastifyReply,
) {
  if (request.body?.teamIds === undefined) return;
  if (!request.actor?.can("pipelines.admin")) {
    return reply.code(403).send({ message: "Only an owner can change a pipeline's teams" });
  }
}

/** Deleting a board takes every lead on it, so it is owner-only. */
export async function verifyOwnerForDelete(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  if (!request.actor?.can("pipelines.admin")) {
    return reply.code(403).send({ message: "Only an owner can delete a pipeline" });
  }
}

export async function verifyLostReasonAccess(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const pipelineId = await getPipelineIdByLostReasonId(request.params.id);
  if (!pipelineId) {
    return reply.code(404).send({ message: "Lost reason not found" });
  }
  if (!(await isPipelineAccessible(pipelineId, request.actor))) {
    return reply.code(403).send(FORBIDDEN);
  }
}

export async function verifyLabelAccess(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const pipelineId = await getPipelineIdByLabelId(request.params.id);
  if (!pipelineId) {
    return reply.code(404).send({ message: "Label not found" });
  }
  if (!(await isPipelineAccessible(pipelineId, request.actor))) {
    return reply.code(403).send(FORBIDDEN);
  }
}
