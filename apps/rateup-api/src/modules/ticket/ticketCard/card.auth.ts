import { FastifyReply, FastifyRequest } from "fastify";
import { getColumnIdByCardId } from "./card.service.js";
import { getBoardIdByColumnId } from "../ticketColumn/column.service.js";
import { isBoardMember } from "../ticketBoard/board.service.js";

export async function verifyCardAccess(
  request: FastifyRequest<{
    Params: { id: string };
  }>,
  reply: FastifyReply,
) {
  const userId = request.userId;
  const cardId = request.params.id;

  if (!cardId) {
    return reply.code(400).send({ message: "Card ID is required" });
  }

  // Get column ID for this card
  const columnId = await getColumnIdByCardId(cardId);

  if (!columnId) {
    return reply.code(404).send({ message: "Card not found" });
  }

  // Get board ID for this column
  const boardId = await getBoardIdByColumnId(columnId);

  if (!boardId) {
    return reply.code(404).send({ message: "Column not found" });
  }

  // Check if user has access to this board
  const hasAccess = await isBoardMember(boardId, userId);

  if (!hasAccess) {
    return reply
      .code(403)
      .send({ message: "You don't have access to this card" });
  }
}
