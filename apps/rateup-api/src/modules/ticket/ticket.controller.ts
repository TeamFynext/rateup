import { CreateCommentInput, IdParamsSchema } from "./ticket.schema";
import { FastifyReply, FastifyRequest } from "fastify";
import { createComment } from "./ticket.service";

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
  } catch (e: any) {
    console.error(e);
    reply.code(500).send({ status: "failed", message: e.message });
  }
}
