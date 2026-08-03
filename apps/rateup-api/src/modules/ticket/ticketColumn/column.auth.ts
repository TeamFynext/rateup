import { FastifyReply, FastifyRequest } from "fastify";
import { getBoardIdByColumnId } from "./column.service.js";
import { isBoardMember } from "../ticketBoard/board.service.js";

export async function verifyColumnAccess(
  request: FastifyRequest<{
    Params?: { id?: string; ticketColumnId?: string };
  }>,
  reply: FastifyReply,
) {
  const userId = request.userId;
  const ticketColumnId = request.params?.id || request.params?.ticketColumnId;

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

export async function verifyBoardAccessFromBody(
  request: FastifyRequest<{ Body: { ticketBoardId?: string } }>,
  reply: FastifyReply,
) {
  const ticketBoardId = request.body?.ticketBoardId;
  if (!ticketBoardId) {
    return reply.code(400).send({ message: "Board ID is required" });
  }
  if (!(await isBoardMember(ticketBoardId, request.userId))) {
    return reply.code(403).send({ message: "You don't have access to this board" });
  }
}

export async function verifyColumnsReorderAccess(
  request: FastifyRequest<{ Body: { columns?: { id: string }[] } }>,
  reply: FastifyReply,
) {
  const columns = request.body?.columns ?? [];
  const boardIds = new Set<string>();
  for (const column of columns) {
    const boardId = await getBoardIdByColumnId(column.id);
    if (!boardId) {
      return reply.code(404).send({ message: "Column not found" });
    }
    boardIds.add(boardId);
  }
  for (const boardId of boardIds) {
    if (!(await isBoardMember(boardId, request.userId))) {
      return reply.code(403).send({ message: "You don't have access to this board" });
    }
  }
}
