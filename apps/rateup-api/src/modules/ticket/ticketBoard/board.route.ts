import { FastifyInstance } from "fastify";
import { $BoardRef } from "./board.schema";
import {
  createBoardHandler,
  getAllBoardsHandler,
  getSingleBoardHandler,
  updateBoardHandler,
  deleteBoardHandler,
  getBoardTeamMembersHandler,
} from "./board.controller";
import { checkSession } from "../../../utils/checkSession";
import { verifyTeamAccess } from "../../team/team.auth";
import { verifyBoardAccess } from "./board.auth";
import { getVerifySubscriptionHandler } from "../../../utils/auth";
import { SubscriptionFeaturePathName } from "../../../types/enums";

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
        body: $BoardRef("createBoardRequestSchema"),
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
        params: $BoardRef("idParamsSchema"),
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
        params: $BoardRef("idParamsSchema"),
        body: $BoardRef("updateBoardRequestSchema"),
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
        params: $BoardRef("idParamsSchema"),
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
        params: $BoardRef("idParamsSchema"),
      },
    },
    getBoardTeamMembersHandler,
  );
}
