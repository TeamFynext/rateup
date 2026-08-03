import { CreateCommentInput, IdParamsSchema } from "./ticket.schema.js";
import { FastifyReply, FastifyRequest } from "fastify";
import { createComment, deleteComment, TicketCommentAccessError } from "./ticket.service.js";
import { log } from "../../utils/logger.js";

export async function createCommentHandler(
  request: FastifyRequest<{
    Params: IdParamsSchema;
    Body: CreateCommentInput;
  }>,
  reply: FastifyReply,
) {
  const body = request.body;
  const userId = request.userId;
  let comment;
  try {
    comment = await createComment(body, userId);
    reply.code(201).send(comment);
  } catch (e) {
    if (e instanceof TicketCommentAccessError) {
      return reply.code(403).send({ status: "failed", message: e.message });
    }
    log.error({ err: e }, "Error creating ticket comment");
    reply.code(500).send({ status: "failed", message: "Something went wrong" });
  }
}
export async function deleteCommentHandler(
  request: FastifyRequest<{
    Params: IdParamsSchema;
  }>,
  reply: FastifyReply,
) {
  const { id } = request.params;
  const userId = request.userId;
  try {
    await deleteComment(id, userId);
    reply.code(204).send();
  } catch (e) {
    if (e && typeof e === "object" && (e as { code?: string }).code === "P2025") {
      return reply.code(404).send({ status: "failed", message: "Comment not found" });
    }
    log.error({ err: e }, "Error deleting ticket comment");
    reply.code(500).send({ status: "failed", message: "Something went wrong" });
  }
}
