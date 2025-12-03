import { FastifyReply, FastifyRequest } from "fastify";
import { log } from "../../../utils/logger";
import {
  ConversationParamsSchema,
  UpdateConversationSchema,
} from "./conversation.schema";
import {
  getConversationOverview,
  updateConversation,
} from "./conversation.service";
import { get } from "axios";

export async function updateConversationHandler(
  request: FastifyRequest<{
    Params: ConversationParamsSchema;
    Body: UpdateConversationSchema;
  }>,
  reply,
) {
  try {
    const { conversationId } = request.params;
    const res = await updateConversation(conversationId, request.body);
    reply.send(res);
  } catch (e) {
    log.error("Error updating conversation:", e);
    reply
      .status(500)
      .send({ error: "An error occurred while updating the conversation." });
  }
}

export async function getConversationOverviewHandler(
  request: FastifyRequest<{
    Querystring: {
      dateRange?: string;
    };
  }>,
  reply: FastifyReply,
) {
  try {
    const dateRange = request.query.dateRange?.split(",") || [];
    const stats = await getConversationOverview(request.user.orgId, dateRange);
    reply.send(stats);
  } catch (e) {
    log.error("Error fetching conversation overview:", e);
    reply
      .status(500)
      .send({
        error: "An error occurred while fetching the conversation overview.",
      });
  }
}
