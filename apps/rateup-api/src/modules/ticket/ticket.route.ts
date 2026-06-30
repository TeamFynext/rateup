import { FastifyInstance } from "fastify";
import { createCommentRequestSchema } from "./ticket.schema.js";
import { createCommentHandler, deleteCommentHandler } from "./ticket.controller.js";
import { checkSession } from "../../utils/checkSession.js";
import { getVerifySubscriptionHandler } from "../../utils/auth.js";
import { SubscriptionFeaturePathName } from "../../types/enums.js";
import { requireFeature, TeamFeature } from "../../utils/permissions.js";
import { columnRoutes } from "./ticketColumn/column.route.js";
import { cardRoutes } from "./ticketCard/card.route.js";
import { boardRoutes } from "./ticketBoard/board.route.js";
import labelRoutes from "./ticketBoardLabel/ticketlabel.route.js";

export async function ticketRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);
  server.addHook("preHandler", getVerifySubscriptionHandler([SubscriptionFeaturePathName.Ticket]));
  server.addHook("preHandler", requireFeature(TeamFeature.tickets));
  server.register(labelRoutes);
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
