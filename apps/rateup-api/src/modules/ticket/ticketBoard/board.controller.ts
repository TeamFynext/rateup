import { FastifyReply, FastifyRequest } from "fastify";
import {
  createBoard,
  getBoards,
  getBoardById,
  updateBoard,
  deleteBoard,
  getBoardTeamMembersById,
} from "./board.service";
import { createColumn } from "../ticketColumn/column.service";
import {
  CreateBoardRequestSchema,
  UpdateBoardRequestSchema,
} from "./board.schema";

export async function createBoardHandler(
  request: FastifyRequest<{
    Body: CreateBoardRequestSchema;
  }>,
  reply: FastifyReply,
) {
  try {
    const { title, teamIds } = request.body;
    const userId = request.userId;
    const board = await createBoard({ title, teamIds, userId });
    await createColumn({
      title: "To Do",
      ticketBoardId: board.id,
      order: 0,
    });

    return reply.code(201).send(board);
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ message: "Error creating board" });
  }
}

export async function getAllBoardsHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const userId = request.userId;
    const boards = await getBoards(userId);
    return reply.code(200).send(boards);
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ message: "Error retrieving boards" });
  }
}

export async function getSingleBoardHandler(
  request: FastifyRequest<{
    Params: { id: string };
  }>,
  reply: FastifyReply,
) {
  try {
    const { id } = request.params;
    const board = await getBoardById(id);

    if (!board) {
      return reply.code(404).send({ message: "Board not found" });
    }

    return reply.code(200).send(board);
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ message: "Error retrieving board" });
  }
}

export async function updateBoardHandler(
  request: FastifyRequest<{
    Params: { id: string };
    Body: UpdateBoardRequestSchema;
  }>,
  reply: FastifyReply,
) {
  try {
    const { id } = request.params;

    const updatedBoard = await updateBoard(id, request.body);

    if (!updatedBoard) {
      return reply.code(404).send({ message: "Board not found" });
    }

    return reply.code(200).send(updatedBoard);
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ message: "Error updating board" });
  }
}

export async function deleteBoardHandler(
  request: FastifyRequest<{
    Params: { id: string };
  }>,
  reply: FastifyReply,
) {
  try {
    const { id } = request.params;
    await deleteBoard(id);
    return reply.code(204).send();
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ message: "Error deleting board" });
  }
}

export async function getBoardTeamMembersHandler(
  request: FastifyRequest<{
    Params: { id: string };
  }>,
  reply: FastifyReply,
) {
  try {
    const { id } = request.params;
    const members = await getBoardTeamMembersById(id);

    if (!members) {
      return reply.code(404).send({ message: "Members not found" });
    }

    return reply.code(200).send(members);
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ message: "Error retrieving members" });
  }
}
