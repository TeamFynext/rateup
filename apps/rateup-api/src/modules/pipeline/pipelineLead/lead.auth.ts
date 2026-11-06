import { FastifyReply, FastifyRequest } from "fastify";
import { isPipelineAccessible } from "../pipeline.service.js";
import {
  getLeadByShortUrlId,
  getPipelineIdByLeadId,
  getPipelineIdByNoteId,
  getPipelineIdByTaskId,
} from "./lead.service.js";

const FORBIDDEN = { message: "You don't have access to this pipeline" };

function guard(resolve: (id: string) => Promise<string | undefined>, notFound: string) {
  return async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const pipelineId = await resolve(request.params.id);
    if (!pipelineId) {
      return reply.code(404).send({ message: notFound });
    }
    if (!(await isPipelineAccessible(pipelineId, request.actor))) {
      return reply.code(403).send(FORBIDDEN);
    }
  };
}

export const verifyLeadAccess = guard(getPipelineIdByLeadId, "Lead not found");
export const verifyLeadShareAccess = guard(
  async (shortUrlId) => (await getLeadByShortUrlId(shortUrlId))?.pipelineId,
  "Lead not found",
);
export const verifyNoteAccess = guard(getPipelineIdByNoteId, "Note not found");
export const verifyTaskAccess = guard(getPipelineIdByTaskId, "Task not found");

export async function verifyLeadsBulkAccess(
  request: FastifyRequest<{ Body: { leadIds: string[] } }>,
  reply: FastifyReply,
) {
  const pipelineIds = new Set<string>();
  for (const leadId of request.body.leadIds) {
    const pipelineId = await getPipelineIdByLeadId(leadId);
    if (!pipelineId) {
      return reply.code(404).send({ message: "Lead not found" });
    }
    pipelineIds.add(pipelineId);
  }

  for (const pipelineId of pipelineIds) {
    if (!(await isPipelineAccessible(pipelineId, request.actor))) {
      return reply.code(403).send(FORBIDDEN);
    }
  }
}
