import { FastifyInstance } from "fastify";
import { $CardRef } from "./card.schema.js";
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
import { getVerifySubscriptionHandler } from "../../../utils/auth.js";
import { SubscriptionFeaturePathName } from "../../../types/enums.js";

export async function cardRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);
  server.addHook(
    "preHandler",
    getVerifySubscriptionHandler([SubscriptionFeaturePathName.Ticket]),
  );

  // Create card
  server.post(
    "/create",
    {
      schema: {
        body: $CardRef("createCardRequestSchema"),
        // response: {
        //   201: $CardRef("createCardResponseSchema"),
        // },
      },
    },
    createCardHandler,
  );

  // Get all cards for a column
  server.get(
    "/column/:columnId",
    {
      preHandler: [verifyColumnAccess],
      schema: {
        params: $CardRef("columnIdParamsSchema"),
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
        params: $CardRef("idParamsSchema"),
      },
    },
    getSingleCardHandler,
  );
  server.get(
    "/:id/team-members",
    {
      preHandler: [verifyCardAccess],
      schema: {
        params: $CardRef("idParamsSchema"),
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
        params: $CardRef("idParamsSchema"),
        body: $CardRef("updateCardRequestSchema"),
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
        params: $CardRef("idParamsSchema"),
        body: $CardRef("moveCardRequestSchema"),
      },
    },
    moveCardHandler,
  );

  // Reorder cards (bulk update of card orders)
  server.put(
    "/reorder",
    {
      schema: {
        body: $CardRef("reorderCardRequestSchema"),
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
        params: $CardRef("idParamsSchema"),
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
        params: $CardRef("idParamsSchema"),
      },
    },
    getCardActivitiesHandler,
  );
}
