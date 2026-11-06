import { FastifyInstance } from "fastify";
import {
  createWaQuickReplyHandler,
  getWaQuickRepliesHandler,
  getWaQuickReplyByIdHandler,
  deleteWaQuickReplyByIdHandler,
  updateWaQuickReplyByIdHandler,
} from "./quickReply.controller.js";
import {
  quickReplyCore,
  byQuickReplyIdParamSchema,
  updateQuickReplyShema,
} from "./quickReply.schema.js";

export async function waQuickReplyRoutes(server: FastifyInstance) {
  server.post(
    "/",
    {
      schema: {
        body: quickReplyCore,
      },
    },
    createWaQuickReplyHandler,
  );
  server.get("/", getWaQuickRepliesHandler);
  server.get(
    "/:quickReplyId",
    {
      schema: {
        params: byQuickReplyIdParamSchema,
      },
    },
    getWaQuickReplyByIdHandler,
  );
  server.delete(
    "/:quickReplyId",
    {
      schema: {
        params: byQuickReplyIdParamSchema,
      },
    },
    deleteWaQuickReplyByIdHandler,
  );
  server.put(
    "/:quickReplyId",
    {
      schema: {
        params: byQuickReplyIdParamSchema,
        body: updateQuickReplyShema,
      },
    },
    updateWaQuickReplyByIdHandler,
  );
}
