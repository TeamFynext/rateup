import { FastifyRequest } from "fastify/types/request";
import {
  ByWaAutomatedReplyIdParams,
  CreateAutomatedReplySchema,
} from "./wa_automatedReply.schema";
import { FastifyReply } from "fastify";
import {
  createAutomatedReply,
  deleteAutomatedReply,
  getAutomatedRepliesByTeamId,
  getAutomatedReplyById,
  updateAutomatedReply,
} from "./wa_automatedReply.service";
import { ByTeamIdParams } from "../../../../../../team/team.schema";

export async function getAutomatedRepliesByTeamIdHandler(
  req: FastifyRequest<{ Params: ByTeamIdParams }>,
  reply: FastifyReply,
) {
  const automatedReplies = await getAutomatedRepliesByTeamId(req.params.teamId);
  reply.send(automatedReplies);
}

export async function getAutomatedRepliesByIdHandler(
  req: FastifyRequest<{ Params: ByWaAutomatedReplyIdParams }>,
  reply: FastifyReply,
) {
  const automatedReply = await getAutomatedReplyById(
    req.params.waAutomatedReplyId,
  );
  reply.send(automatedReply);
}

export async function createAutomatedReplyHandler(
  req: FastifyRequest<{ Body: CreateAutomatedReplySchema }>,
  reply: FastifyReply,
) {
  const automatedReply = await createAutomatedReply(req.body);
  reply.send(automatedReply);
}

export async function updateAutomatedReplyHandler(
  req: FastifyRequest<{
    Params: ByWaAutomatedReplyIdParams;
    Body: CreateAutomatedReplySchema;
  }>,
  reply: FastifyReply,
) {
  const automatedReply = await updateAutomatedReply(
    req.params.waAutomatedReplyId,
    req.body,
  );
  reply.send(automatedReply);
}

export async function deleteAutomatedReplyHandler(
  req: FastifyRequest<{ Params: ByWaAutomatedReplyIdParams }>,
  reply: FastifyReply,
) {
  const automatedReply = await deleteAutomatedReply(
    req.params.waAutomatedReplyId,
  );
  reply.send(automatedReply);
}
