import { FastifyReply, FastifyRequest } from "fastify";
import {
  createBoard,
  getBoards,
  getBoardById,
  updateBoard,
  deleteBoard,
  getBoardTeamMembersById,
  TeamAccessError,
} from "./board.service.js";
import { CreateBoardRequestSchema, UpdateBoardRequestSchema } from "./board.schema.js";

export async function createBoardHandler(
  request: FastifyRequest<{
    Body: CreateBoardRequestSchema;
  }>,
  reply: FastifyReply,
) {
  try {
    const { title, description, teamIds } = request.body;
    const userId = request.userId;
    // The board and its "To Do" column are one write now (issues.txt 28.4), and the
    // teams are checked against the caller's own memberships (issues.txt 28.2).
    const board = await createBoard({ title, description, teamIds, userId });

    return reply.code(201).send(board);
  } catch (error) {
    if (error instanceof TeamAccessError) {
      return reply.code(403).send({ message: error.message });
    }
    request.log.error(error);
    return reply.code(500).send({ message: "Error creating board" });
  }
}

export async function getAllBoardsHandler(request: FastifyRequest, reply: FastifyReply) {
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

    // The `if (!updatedBoard)` 404 that used to sit here could never fire — prisma's
    // update resolves a row or throws P2025 — and verifyBoardAccess 403s first for a
    // board the caller cannot see, which is the right outcome. See issues.txt 28.7.
    const updatedBoard = await updateBoard(id, request.body, request.userId);

    return reply.code(200).send(updatedBoard);
  } catch (error) {
    if (error instanceof TeamAccessError) {
      return reply.code(403).send({
        message: error.teamIds.length ? error.message : "A board must keep at least one team",
      });
    }
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
    // The `if (!members)` 404 that used to sit here could never fire either: a raw
    // query resolves an array, and an empty array is truthy. See issues.txt 28.7.
    const members = await getBoardTeamMembersById(id);

    return reply.code(200).send(members);
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ message: "Error retrieving members" });
  }
}
