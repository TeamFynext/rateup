import { FastifyReply, FastifyRequest } from "fastify";
import * as labelService from "./ticketlabel.service.js";
import { CreateLabelSchema, DeleteLabelsSchema, UpdateLabelSchema } from "./ticketlabel.schema.js";
import { isBoardMember } from "../ticketBoard/board.service.js";
import createHttpError from "http-errors";

export async function createLabelHandler(
  request: FastifyRequest<{
    Params: { ticketBoardId: string };
    Body: CreateLabelSchema;
  }>,
  reply: FastifyReply,
) {
  const { ticketBoardId } = request.params;
  const user = request.user;

  if (!user || !(await isBoardMember(ticketBoardId, user.id))) {
    throw createHttpError(403, "Forbidden");
  }

  const label = await labelService.createLabel(ticketBoardId, request.body);
  return reply.status(201).send(label);
}

export async function getLabelsHandler(
  request: FastifyRequest<{ Params: { ticketBoardId: string } }>,
  reply: FastifyReply,
) {
  const { ticketBoardId } = request.params;
  const user = request.user;

  if (!user || !(await isBoardMember(ticketBoardId, user.id))) {
    throw createHttpError(403, "Forbidden");
  }

  const labels = await labelService.getLabels(ticketBoardId);
  return reply.send(labels);
}

export async function updateLabelHandler(
  request: FastifyRequest<{
    Params: { id: string };
    Body: UpdateLabelSchema;
  }>,
  reply: FastifyReply,
) {
  const { id } = request.params;
  const user = request.user;

  if (!user || !(await labelService.verifyLabelAccess(id, user.id))) {
    throw createHttpError(403, "Forbidden");
  }

  const label = await labelService.updateLabel(id, request.body);
  return reply.send(label);
}

export async function deleteLabelHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const { id } = request.params;
  const user = request.user;

  if (!user || !(await labelService.verifyLabelAccess(id, user.id))) {
    throw createHttpError(403, "Forbidden");
  }

  await labelService.deleteLabel(id);
  return reply.status(204).send();
}

export async function deleteLabelsHandler(
  request: FastifyRequest<{
    Params: { ticketBoardId: string };
    Body: DeleteLabelsSchema;
  }>,
  reply: FastifyReply,
) {
  const { ticketBoardId } = request.params;
  const user = request.user;

  if (!user || !(await isBoardMember(ticketBoardId, user.id))) {
    throw createHttpError(403, "Forbidden");
  }

  await labelService.deleteLabels(ticketBoardId, request.body.labelIds);
  return reply.status(204).send();
}
