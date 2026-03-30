import { FastifyInstance } from "fastify";
import {
  createBoardRequestSchema,
  idParamsSchema,
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
import { checkSession } from "../../../utils/checkSession.js";
import { verifyBoardAccess } from "./board.auth.js";
import { getVerifySubscriptionHandler } from "../../../utils/auth.js";
import { SubscriptionFeaturePathName } from "../../../types/enums.js";

export async function boardRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);
  server.addHook(
    "preHandler",
    getVerifySubscriptionHandler([SubscriptionFeaturePathName.Ticket]),
  );

  // Create board
  server.post(
    "/create",
    {
      // preHandler: [verifyTeamAccess],
      schema: {
        body: createBoardRequestSchema,
      },
    },
    createBoardHandler,
  );

  // Get all boards
  server.get("/", getAllBoardsHandler);

  // Get single board with associated columns and cards
  server.get(
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
  server.put(
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
  server.delete(
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
  server.get(
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
