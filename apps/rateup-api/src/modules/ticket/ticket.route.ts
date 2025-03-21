import { FastifyInstance } from "fastify";
import { $TicketRef } from "./ticket.schema";
import {
  createCommentHandler,
  deleteCommentHandler,
} from "./ticket.controller";
import { checkSession } from "../../utils/checkSession";
import { getVerifySubscriptionHandler } from "../../utils/auth";
import { SubscriptionFeaturePathName } from "../../types/enums";
import { columnRoutes } from "./ticketColumn/column.route";
import { cardRoutes } from "./ticketCard/card.route";
import { boardRoutes } from "./ticketBoard/board.route";

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
        body: $TicketRef("createCommentRequestSchema"),
      },
    },
    createCommentHandler,
  );
  server.delete("/:id/comment", deleteCommentHandler);
}
