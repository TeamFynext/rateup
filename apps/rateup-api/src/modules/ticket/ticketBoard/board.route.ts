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
  // The parent ticketRoutes already adds checkSession, and this tree used to add a
  // second one — so every board request resolved the session twice through
  // SuperTokens and wrote two audit entries for one action. See issues.txt 28.7.
  // Tickets are a free feature — no subscription gate.

  // Create board. The team check that was commented out here lives in the service
  // now, so it covers the update path too. See issues.txt 28.2.
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
