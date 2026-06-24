import { FastifyReply, FastifyRequest } from "fastify";
import { isBoardMember } from "./board.service.js";

export async function verifyBoardAccess(
  request: FastifyRequest<{
    Params: { id?: string; ticketBoardId?: string };
  }>,
  reply: FastifyReply,
) {
  const userId = request.userId;
  const boardId = request.params.id || request.params.ticketBoardId;

  if (!boardId) {
    return reply.code(400).send({ message: "Board ID is required" });
  }

  const hasAccess = await isBoardMember(boardId, userId);

  if (!hasAccess) {
    return reply.code(403).send({ message: "You don't have access to this board" });
  }
}
