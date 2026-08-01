import { FastifyInstance } from "fastify";
import {
  createCardRequestSchema,
  columnIdParamsSchema,
  idParamsSchema,
  updateCardRequestSchema,
  moveCardRequestSchema,
  reorderCardRequestSchema,
} from "./card.schema.js";
import {
  createCardHandler,
  getAllCardsHandler,
  getSingleCardHandler,
  updateCardHandler,
  deleteCardHandler,
  moveCardHandler,
  getCardActivitiesHandler,
  reorderCardsHandler,
  getSingleCardTeamMembersHandler,
} from "./card.controller.js";
import { checkSession } from "../../../utils/checkSession.js";
import { verifyColumnAccess } from "../ticketColumn/column.auth.js";
import { verifyCardAccess } from "./card.auth.js";

export async function cardRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);
  // Tickets are a free feature — no subscription gate.

  // Create card
  server.post(
    "/create",
    {
      schema: {
        body: createCardRequestSchema,
        // response: {
        //   201: createCardResponseSchema,
        // },
      },
    },
    createCardHandler,
  );

  // Get all cards for a column
  server.get<{ Params: { ticketColumnId: string } }>(
    "/column/:columnId",
    {
      preHandler: [verifyColumnAccess],
      schema: {
        params: columnIdParamsSchema,
      },
    },
    getAllCardsHandler,
  );

  // Get single card with activities
  server.get(
    "/:id",
    {
      preHandler: [verifyCardAccess],
      schema: {
        params: idParamsSchema,
      },
    },
    getSingleCardHandler,
  );
  server.get(
    "/:id/team-members",
    {
      preHandler: [verifyCardAccess],
      schema: {
        params: idParamsSchema,
      },
    },
    getSingleCardTeamMembersHandler,
  );

  // Update card
  server.put(
    "/:id",
    {
      preHandler: [verifyCardAccess],
      schema: {
        params: idParamsSchema,
        body: updateCardRequestSchema,
      },
    },
    updateCardHandler,
  );

  // Move card to different column
  server.put(
    "/:id/move",
    {
      preHandler: [verifyCardAccess],
      schema: {
        params: idParamsSchema,
        body: moveCardRequestSchema,
      },
    },
    moveCardHandler,
  );

  // Reorder cards (bulk update of card orders)
  server.put(
    "/reorder",
    {
      schema: {
        body: reorderCardRequestSchema,
      },
    },
    reorderCardsHandler,
  );

  // Delete card
  server.delete(
    "/:id",
    {
      preHandler: [verifyCardAccess],
      schema: {
        params: idParamsSchema,
      },
    },
    deleteCardHandler,
  );

  // Get card activities
  server.get(
    "/:id/activities",
    {
      preHandler: [verifyCardAccess],
      schema: {
        params: idParamsSchema,
      },
    },
    getCardActivitiesHandler,
  );
}
