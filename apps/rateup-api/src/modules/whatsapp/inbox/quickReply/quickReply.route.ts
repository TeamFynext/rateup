import { FastifyInstance } from "fastify";
import {
  createWaQuickReplyHandler,
  getWaQuickRepliesHandler,
  getWaQuickReplyByIdHandler,
  deleteWaQuickReplyByIdHandler,
  updateWaQuickReplyByIdHandler,
  updateWaQuickReplyOrderHandler,
} from "./quickReply.controller";
import { $quickReplyRef } from "./quickReply.schema";
import { checkSession } from "../../../../utils/checkSession";

export async function waQuickReplyRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);
  server.post(
    "/",
    {
      schema: {
        body: $quickReplyRef("quickReplyCore"),
      },
    },
    createWaQuickReplyHandler,
  );
  server.get("/", getWaQuickRepliesHandler);
  server.get(
    "/:quickReplyId",
    {
      schema: {
        params: $quickReplyRef("byQuickReplyIdParamSchema"),
      },
    },
    getWaQuickReplyByIdHandler,
  );
  server.delete(
    "/:quickReplyId",
    {
      schema: {
        params: $quickReplyRef("byQuickReplyIdParamSchema"),
      },
    },
    deleteWaQuickReplyByIdHandler,
  );
  server.put(
    "/:quickReplyId",
    {
      schema: {
        params: $quickReplyRef("byQuickReplyIdParamSchema"),
        body: $quickReplyRef("updateQuickReplyShema"),
      },
    },
    updateWaQuickReplyByIdHandler,
  );

  server.put(
    "/order",
    {
      schema: {
        body: $quickReplyRef("updateOrderSchema"),
      },
    },
    updateWaQuickReplyOrderHandler,
  );
}
