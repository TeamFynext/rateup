import { FastifyReply, FastifyRequest } from "fastify";

import { log } from "../../utils/logger.js";
import { getAdminOverview } from "./admin.service.js";

export async function getAdminOverviewHandler(
  request: FastifyRequest<{ Querystring: { months?: number } }>,
  reply: FastifyReply,
) {
  try {
    reply.send(await getAdminOverview(request.query.months));
  } catch (error) {
    log.error({ err: error }, "Failed to build the admin overview");
    reply.code(500).send({ message: "Could not build the overview" });
  }
}
