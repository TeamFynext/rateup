import { FastifyReply, FastifyRequest } from "fastify";
import { GraphApiError } from "./wa_axios.js";
import { log } from "../../utils/logger.js";

export function handleWhatsappError(
  error: Error,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  if (error instanceof GraphApiError) {
    reply.status(400).send({
      message: getGraphApiErrorMessage(error),
    });
  } else {
    log.error(error);
    reply.send(error);
  }
}
export function getGraphApiErrorMessage(error: GraphApiError) {
  return error.error.error_user_msg
    ? error.error.error_user_msg
    : error.error.message;
}
