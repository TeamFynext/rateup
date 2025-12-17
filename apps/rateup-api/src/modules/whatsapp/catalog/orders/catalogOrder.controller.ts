import { FastifyReply, FastifyRequest } from "fastify";
import { log } from "../../../../utils/logger.js";
import { CatalogIdParam } from "../catalog.schema.js";
import { getWaCatalogOrders } from "./catalogOrder.service.js";

export async function getWaCatalogOrdersHandler(
  request: FastifyRequest<{ Params: CatalogIdParam }>,
  reply: FastifyReply,
) {
  try {
    const { catalogId } = request.params;
    const res = await getWaCatalogOrders(catalogId, request.query);
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}
