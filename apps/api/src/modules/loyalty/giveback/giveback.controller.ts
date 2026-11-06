import { FastifyReply, FastifyRequest } from "fastify";

import { log } from "../../../utils/logger.js";
import { getProgramGiveback } from "./giveback.service.js";

export async function getProgramGivebackHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    reply.code(200).send(await getProgramGiveback(request.user.orgId));
  } catch (error) {
    log.error(error);
    reply.code(500).send({ error: error instanceof Error ? error.message : "Unknown error" });
  }
}
