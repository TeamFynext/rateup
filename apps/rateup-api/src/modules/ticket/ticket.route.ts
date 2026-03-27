import { FastifyInstance } from "fastify";
import { createCommentRequestSchema } from "./ticket.schema.js";
import {
  createCommentHandler,
  deleteCommentHandler,
} from "./ticket.controller.js";
import { checkSession } from "../../utils/checkSession.js";
import { getVerifySubscriptionHandler } from "../../utils/auth.js";
import { SubscriptionFeaturePathName } from "../../types/enums.js";
import { columnRoutes } from "./ticketColumn/column.route.js";
import { cardRoutes } from "./ticketCard/card.route.js";
import { boardRoutes } from "./ticketBoard/board.route.js";

export async function ticketRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);
  server.addHook(
    "preHandler",
    getVerifySubscriptionHandler([SubscriptionFeaturePathName.Ticket]),
  );
  server.register(boardRoutes, {
    prefix: "boards",
  });
  server.register(columnRoutes, {
    prefix: "columns",
  });
  server.register(cardRoutes, {
    prefix: "cards",
  });
  server.post(
    "/:id/comment",
    {
      // preHandler: [verifyTicketAccess],

      schema: {
        body: createCommentRequestSchema,
      },
    },
    createCommentHandler,
  );
  server.delete("/:id/comment", deleteCommentHandler);
}
