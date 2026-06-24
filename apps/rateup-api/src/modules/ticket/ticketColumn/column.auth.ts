import { FastifyReply, FastifyRequest } from "fastify";
import { getBoardIdByColumnId } from "./column.service.js";
import { isBoardMember } from "../ticketBoard/board.service.js";

export async function verifyColumnAccess(
  request: FastifyRequest<{
    Params: { id?: string; ticketColumnId?: string };
  }>,
  reply: FastifyReply,
) {
  const userId = request.userId;
  const ticketColumnId = request.params.id || request.params.ticketColumnId;

  if (!ticketColumnId) {
    return reply.code(400).send({ message: "Column ID is required" });
  }

  const boardId = await getBoardIdByColumnId(ticketColumnId);

  if (!boardId) {
    return reply.code(404).send({ message: "Column not found" });
  }

  const hasAccess = await isBoardMember(boardId, userId);

  if (!hasAccess) {
    return reply.code(403).send({ message: "You don't have access to this column" });
  }
}
