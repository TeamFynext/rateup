import { FastifyInstance } from "fastify";
import {
  createBoardRequestSchema,
  idParamsSchema,
  UpdateBoardRequestSchema,
  updateBoardRequestSchema,
} from "./board.schema.js";
import {
  createBoardHandler,
  getAllBoardsHandler,
  getSingleBoardHandler,
  updateBoardHandler,
  deleteBoardHandler,
  getBoardTeamMembersHandler,
} from "./board.controller.js";
import { verifyBoardAccess } from "./board.auth.js";

export async function boardRoutes(server: FastifyInstance) {
  server.post(
    "/create",
    {
      schema: {
        body: createBoardRequestSchema,
      },
    },
    createBoardHandler,
  );

  // Get all boards
  server.get("/", getAllBoardsHandler);

  // Get single board with associated columns and cards
  server.get<{ Params: { id: string } }>(
    "/:id",
    {
      preHandler: [verifyBoardAccess],
      schema: {
        params: idParamsSchema,
      },
    },
    getSingleBoardHandler,
  );

  // Update board
  server.put<{ Params: { id: string }; Body: UpdateBoardRequestSchema }>(
    "/:id",
    {
      preHandler: [verifyBoardAccess],
      schema: {
        params: idParamsSchema,
        body: updateBoardRequestSchema,
      },
    },
    updateBoardHandler,
  );

  // Delete board
  server.delete<{ Params: { id: string } }>(
    "/:id",
    {
      preHandler: [verifyBoardAccess],
      schema: {
        params: idParamsSchema,
      },
    },
    deleteBoardHandler,
  );
  // Get all team members for a board
  server.get<{ Params: { id: string } }>(
    "/:id/team-members",
    {
      preHandler: [verifyBoardAccess],
      schema: {
        params: idParamsSchema,
      },
    },
    getBoardTeamMembersHandler,
  );
}
