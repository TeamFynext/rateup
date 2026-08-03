import { CreateCommentInput, IdParamsSchema } from "./ticket.schema.js";
import { FastifyReply, FastifyRequest } from "fastify";
import { createComment, deleteComment } from "./ticket.service.js";
import { errorMessage } from "../../utils/commonUtils.js";

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
    console.error(e);
    reply.code(500).send({ status: "failed", message: errorMessage(e) });
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
    console.error(e);
    reply.code(500).send({ status: "failed", message: errorMessage(e) });
  }
}
