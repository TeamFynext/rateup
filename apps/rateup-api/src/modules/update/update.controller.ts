import { FastifyReply, FastifyRequest } from "fastify";
import { updatePageTypeQuestionsInDB } from "./migrationFiles/update-page-type-questions";

export async function updatePageTypeQuestions(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const result = await updatePageTypeQuestionsInDB();
    reply.status(200).send({
      success: true,
      message: "update questions successfully.",
    });
  } catch (err) {
    reply.status(500).send({
      success: false,
      message: "Something went wrong while updating questions.",
    });
  }
}
