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
import {
  verifyCardAccess,
  verifyCardsReorderAccess,
  verifyColumnAccessFromBody,
} from "./card.auth.js";

export async function cardRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);
  // Tickets are a free feature — no subscription gate.

  // Create card. The target column comes from the body, so the access check has to
  // resolve it from there — this route used to have none at all. issues.txt 29.1.
  server.post(
    "/create",
    {
      preHandler: [verifyColumnAccessFromBody],
      schema: {
        body: createCardRequestSchema,
        // response: {
        //   201: createCardResponseSchema,
        // },
      },
    },
    createCardHandler,
  );

  // Get all cards for a column. The path used to bind ":columnId" while the params
  // schema, the handler and verifyColumnAccess all expect "ticketColumnId", so every
  // request to it failed validation before reaching any of them. See issues.txt 29.4.
  server.get<{ Params: { ticketColumnId: string } }>(
    "/column/:ticketColumnId",
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

  // Reorder cards (bulk update of card orders). Targets come from the body.
  // See issues.txt 29.1.
  server.put(
    "/reorder",
    {
      preHandler: [verifyCardsReorderAccess],
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
